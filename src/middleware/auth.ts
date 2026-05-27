import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret_jwt_key_here") as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
