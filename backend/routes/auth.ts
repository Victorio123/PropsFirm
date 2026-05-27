import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../server";
import { sendWelcomeEmail } from "../../services/email";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret_jwt_key_here";

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    await sendWelcomeEmail(user.email);

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err.message && err.message.includes("Can't reach database server")) {
       return res.status(503).json({ error: "Database not connected. Please provide a valid POSTGRES_URI in your AI Studio secrets." });
    }
    // Return detailed error for UI logic to know if table is missing
    const errString = err.message || String(err);
    if (errString.includes("does not exist") || errString.includes("P1012") || errString.includes("database")) {
       return res.status(500).json({ error: `Database not initialized or unreachable. Please set POSTGRES_URI secret, then restart the server. Details: ${errString.slice(0, 100)}` });
    }
    res.status(500).json({ error: errString });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err: any) {
    const errString = err.message || String(err);
    if (errString.includes("does not exist") || errString.includes("P1012") || errString.includes("database")) {
       return res.status(500).json({ error: `Database not initialized or unreachable. Please set POSTGRES_URI secret, then restart the server. Details: ${errString.slice(0, 100)}` });
    }
    res.status(500).json({ error: errString });
  }
});

export default router;
