# wa-gateway — Gateway WhatsApp (Baileys) untuk AsiaCommerce

Layanan Node 24/7 yang memegang koneksi WhatsApp (scan QR nomor admin) dan mengirim pesan
teks atas perintah SSO. **Tidak bisa jalan di Vercel** (butuh proses hidup terus + simpan sesi
di disk) — deploy di Railway (atau VPS/Docker).

## Endpoint (semua kecuali `/health` butuh header `Authorization: Bearer <GATEWAY_API_KEY>`)
| Method | Path      | Fungsi |
| ------ | --------- | ------ |
| GET    | `/health` | Cek hidup (tanpa auth) |
| GET    | `/status` | `{ connected, phone, state }` |
| GET    | `/qr`     | `{ connected, qr }` — `qr` = PNG data URL untuk di-scan |
| POST   | `/send`   | body `{ to, message }` — kirim teks |
| POST   | `/logout` | Putus & hapus sesi (untuk ganti nomor) |

## Menjalankan lokal
```bash
npm install
cp .env.example .env      # isi GATEWAY_API_KEY
npm start                 # http://localhost:8080
# buka status: curl -H "Authorization: Bearer <KEY>" localhost:8080/qr
```

## Deploy ke Railway
1. Push folder ini ke sebuah repo GitHub (mis. `mataharilabs/wa-gateway`).
2. Railway → **New Project → Deploy from GitHub repo** → pilih repo. Railway memakai `Dockerfile`.
3. **Variables**: set `GATEWAY_API_KEY` (nilai acak; samakan dengan `WA_GATEWAY_KEY` di SSO).
4. **Volume** (WAJIB agar sesi tak hilang saat redeploy): tambah Volume, **Mount path `/data`**.
   (Sesi disimpan di `DATA_DIR=/data/auth`, sudah diset di Dockerfile.)
5. Deploy. Salin **public URL** layanan → jadikan `WA_GATEWAY_URL` di SSO.
6. Buka SSO → **Settings → Notifikasi → Sambungkan** → scan QR dengan WhatsApp nomor admin.

## Catatan
- Baileys **tidak resmi**; gunakan nomor khusus, hindari spam, patuhi kebijakan WhatsApp.
- Auto-reconnect saat koneksi putus; bila `logged out` sesi dihapus agar bisa scan ulang.
