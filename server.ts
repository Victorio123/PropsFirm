import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

// Initialize Prisma
export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || "3000", 10);

import { rateLimit } from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

import authRoutes from "./backend/routes/auth";
import paymentRoutes from "./backend/routes/payments";
import tradingRoutes from "./backend/routes/trading";
import adminRoutes from "./backend/routes/admin";

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/trading", tradingRoutes);
app.use("/api/admin", adminRoutes);

// WebSocket Server for Real-Time Price updates and Trading
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected to local WS");
  let derivWs: WebSocket | null = null;
  const appId = process.env.DERIV_APP_ID || "1089";

  ws.on("message", (message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "subscribe_price") {
        if (!derivWs) {
           derivWs = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${appId}`);
           derivWs.on("open", () => {
             derivWs?.send(JSON.stringify({ ticks: data.symbol, subscribe: 1 }));
           });
           derivWs.on("message", (derivMsg: Buffer) => {
             const derivData = JSON.parse(derivMsg.toString());
             if (derivData.tick) {
               ws.send(JSON.stringify({
                 type: "price_update",
                 symbol: derivData.tick.symbol,
                 price: derivData.tick.quote,
                 timestamp: derivData.tick.epoch * 1000
               }));
             }
           });
        } else {
           if (derivWs.readyState === WebSocket.OPEN) {
             derivWs.send(JSON.stringify({ ticks: data.symbol, subscribe: 1 }));
           }
        }
      }
    } catch (e) {
      console.error("WS error", e);
    }
  });

  ws.on("close", () => {
    if (derivWs) derivWs.close();
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
