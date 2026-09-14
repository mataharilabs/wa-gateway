import express from "express";
import { start, getStatus, getQr, sendText, logout, listGroups } from "./wa.js";

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.GATEWAY_API_KEY || "";

const app = express();
app.use(express.json({ limit: "256kb" }));

// Health check (tanpa auth) untuk Railway.
app.get("/health", (_req, res) => res.json({ ok: true, ...getStatus() }));

// Semua endpoint lain butuh Bearer GATEWAY_API_KEY.
app.use((req, res, next) => {
  if (!API_KEY) return res.status(500).json({ error: "GATEWAY_API_KEY belum diset" });
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/status", (_req, res) => res.json(getStatus()));

app.get("/qr", (_req, res) => res.json(getQr()));

app.get("/groups", async (_req, res) => {
  try {
    res.json({ groups: await listGroups() });
  } catch (e) {
    res.status(502).json({ error: e.message || "Gagal memuat grup" });
  }
});

app.post("/send", async (req, res) => {
  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ error: "Butuh 'to' dan 'message'" });
  }
  try {
    const result = await sendText(to, message);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(502).json({ error: e.message || "Gagal mengirim" });
  }
});

app.post("/logout", async (_req, res) => {
  const result = await logout();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`wa-gateway listening on :${PORT}`);
  start().catch((e) => console.error("Gagal start WA:", e));
});
