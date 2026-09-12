import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "baileys";
import QRCode from "qrcode";
import pino from "pino";

const DATA_DIR = process.env.DATA_DIR || "./data/auth";
const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

// State koneksi disimpan di memori proses (proses ini WAJIB hidup 24 jam).
const state = {
  sock: null,
  connected: false,
  phone: null,
  qrPng: null, // data URL PNG QR terbaru (null bila sudah tersambung)
  starting: false,
};

function normalizeJid(to) {
  let d = String(to).replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return `${d}@s.whatsapp.net`;
}

export async function start() {
  if (state.starting) return;
  state.starting = true;
  mkdirSync(DATA_DIR, { recursive: true });

  const { state: authState, saveCreds } = await useMultiFileAuthState(DATA_DIR);

  const sock = makeWASocket({
    auth: authState,
    logger,
    printQRInTerminal: false,
    browser: Browsers.appropriate("Chrome"),
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });
  state.sock = sock;
  state.starting = false;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Tersedia QR pairing baru → render ke PNG untuk ditampilkan SSO.
      try {
        state.qrPng = await QRCode.toDataURL(qr, { margin: 1, width: 300 });
      } catch {
        state.qrPng = null;
      }
    }

    if (connection === "open") {
      state.connected = true;
      state.qrPng = null;
      state.phone = sock.user?.id ? sock.user.id.split(":")[0] : null;
      logger.warn(`WA tersambung sebagai ${state.phone}`);
    }

    if (connection === "close") {
      state.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      logger.warn(`WA terputus (code=${code}) loggedOut=${loggedOut}`);
      if (loggedOut) {
        // Sesi tidak valid lagi → bersihkan agar bisa scan ulang.
        await rm(DATA_DIR, { recursive: true, force: true }).catch(() => {});
        state.phone = null;
        state.qrPng = null;
        start();
      } else {
        // Putus sementara → sambung ulang otomatis.
        setTimeout(() => start(), 2000);
      }
    }
  });

  return sock;
}

export function getStatus() {
  return {
    connected: state.connected,
    phone: state.phone,
    state: state.connected ? "open" : state.qrPng ? "qr" : "connecting",
  };
}

export function getQr() {
  return { connected: state.connected, qr: state.connected ? null : state.qrPng };
}

export async function sendText(to, message) {
  if (!state.sock || !state.connected) {
    throw new Error("WhatsApp belum tersambung");
  }
  const jid = normalizeJid(to);
  await state.sock.sendMessage(jid, { text: message });
  return { to: jid };
}

export async function logout() {
  try {
    if (state.sock) await state.sock.logout();
  } catch {
    /* ignore */
  }
  await rm(DATA_DIR, { recursive: true, force: true }).catch(() => {});
  state.connected = false;
  state.phone = null;
  state.qrPng = null;
  state.sock = null;
  setTimeout(() => start(), 1000);
  return { ok: true };
}
