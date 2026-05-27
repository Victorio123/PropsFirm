import express from "express";
import { prisma } from "../../server";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/users", authenticate, async (req: AuthRequest, res) => {
  // If no DB connection, this returns 500 which frontend catches to mock
  try {
    // Ideally we would enforce requireAdmin, but for preview we can allow it or check carefully
    // Since req.user.role might not explicitly be ADMIN in mock tests, we will just fetch if role isn't strictly checked or just requireAdmin.
    // Let's enforce requireAdmin for proper security.
    if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Access Denied" });

    const users = await prisma.user.findMany({
      include: { challenges: true }
    });
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
