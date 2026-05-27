import express from "express";
import { prisma } from "../../server";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendAccountStatusUpdate } from "../../services/email";

const router = express.Router();

router.get("/challenges", authenticate, async (req: AuthRequest, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { userId: req.user!.id }
    });
    res.json(challenges);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/execute", authenticate, async (req: AuthRequest, res) => {
  try {
    const { challengeId, symbol, type, lotSize, sl, tp, currentPrice } = req.body;
    
    // Validate challenge
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    if (challenge.userId !== req.user!.id) return res.status(403).json({ error: "Unauthorized" });
    if (challenge.status !== "ACTIVE") return res.status(400).json({ error: `Account is ${challenge.status}` });

    // Validate lot size (e.g. max 5 lots for 5000)
    const maxLot = challenge.initialBalance / 1000;
    if (lotSize > maxLot) return res.status(400).json({ error: `Lot size exceeds limit (${maxLot})` });

    // Execute trade locally
    const trade = await prisma.trade.create({
      data: {
        challengeId,
        symbol,
        type,
        lotSize,
        entryPrice: currentPrice,
        sl: sl || null,
        tp: tp || null,
        status: "OPEN"
      }
    });

    res.json({ success: true, trade });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/close", authenticate, async (req: AuthRequest, res) => {
  try {
    const { tradeId, closingPrice } = req.body;
    
    const trade = await prisma.trade.findUnique({ where: { id: tradeId }, include: { challenge: true } });
    if (!trade || trade.status === "CLOSED") return res.status(400).json({ error: "Invalid trade" });
    if (trade.challenge.userId !== req.user!.id) return res.status(403).json({ error: "Unauthorized" });

    // Calculate PnL (Mock calculation, pip value * lot size...)
    const isBuy = trade.type === "BUY";
    const priceDiff = isBuy ? closingPrice - trade.entryPrice : trade.entryPrice - closingPrice;
    const pnl = priceDiff * trade.lotSize; // simplistic

    const newBalance = trade.challenge.currentBalance + pnl;
    
    let newStatus = trade.challenge.status;
    // Check constraints
    if (newBalance <= trade.challenge.dailyStartBalance * 0.95) {
      newStatus = "FAILED"; // 5% daily drawdown
    }
    if (newBalance <= trade.challenge.initialBalance * 0.90) {
      newStatus = "FAILED"; // 10% max drawdown
    }
    if (newBalance >= trade.challenge.initialBalance * 1.10) {
      newStatus = "FUNDED"; // 10% profit target
    }

    await prisma.$transaction([
      prisma.trade.update({
        where: { id: tradeId },
        data: { status: "CLOSED", exitPrice: closingPrice, pnl, closedAt: new Date() }
      }),
      prisma.challenge.update({
        where: { id: trade.challengeId },
        data: { currentBalance: newBalance, status: newStatus }
      })
    ]);

    if (newStatus === "FAILED" || newStatus === "FUNDED") {
      const user = await prisma.user.findUnique({ where: { id: trade.challenge.userId } });
      if (user) await sendAccountStatusUpdate(user.email, newStatus);
    }

    res.json({ success: true, pnl, newBalance, status: newStatus });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
