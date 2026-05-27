import express from "express";
import axios from "axios";
import { prisma } from "../../server";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendPaymentConfirmation } from "../../services/email";

const router = express.Router();

router.post("/checkout", authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, amount } = req.body;
    const email = req.user?.id ? (await prisma.user.findUnique({ where: { id: req.user.id } }))?.email : "test@example.com";
    
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    
    // Create pending challenge
    const challenge = await prisma.challenge.create({
      data: {
        userId: req.user!.id,
        type,
        initialBalance: Number(type),
        currentBalance: Number(type),
        dailyStartBalance: Number(type),
        status: "PENDING_PAYMENT"
      }
    });

    if (!PAYSTACK_SECRET_KEY) {
      // Simulation mode if key is missing
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { status: "ACTIVE" }
      });
      return res.json({ status: "ACTIVE", simulate: true, challenge });
    }

    // Call Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Paystack uses kobo/cents
        metadata: { challengeId: challenge.id }
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    res.json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
      challengeId: challenge.id
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Verifies payment (usually hit via webhook or frontend redirect)
router.post("/verify", authenticate, async (req: AuthRequest, res) => {
  try {
    const { reference, challengeId } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      // simulate success
      await prisma.challenge.update({ where: { id: challengeId }, data: { status: "ACTIVE" } });
      return res.json({ success: true });
    }

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });

    if (response.data.data.status === "success") {
      const updated = await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: "ACTIVE" }
      });
      const user = await prisma.user.findUnique({ where: { id: updated.userId } });
      if (user) await sendPaymentConfirmation(user.email, updated.initialBalance);

      res.json({ success: true });
    } else {
      res.json({ success: false, status: response.data.data.status });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
