# GET LINK BY DENZYX (versi Vercel)

Upload file → dapet link publik. Storage Google Drive, di-host di Vercel.
Cuma HTML/CSS/JS + 3 function kecil buat nyangkutin ke Google Drive.

## Struktur
```
get-link-by-denzyx/
├── index.html
├── style.css
├── index.js
├── background.jpg       # GANTI dengan foto lu
├── sound.mp3             # GANTI dengan sound lu
├── vercel.json            # rewrite /f/:id -> /api/f/:id
├── package.json
├── .env.example
└── api/
    ├── init-upload.js    # bikin sesi upload resumable ke Drive
    ├── finalize.js         # set file jadi publik + generate link pendek
    ├── f/[id].js            # redirect /f/<id> -> file asli di Drive
    └── _lib/
        ├── drive.js       # auth service account (shared)
        └── constants.js   # tipe file & max size (shared)
```
(File/folder diawali `_` otomatis DIABAIKAN Vercel sebagai route, jadi aman buat helper.)

## Kenapa arsitekturnya begini?
Vercel Serverless Function punya limit body request ±4.5MB. File lu bisa
sampe 25MB, jadi **file-nya ga boleh numpang lewat function**. Solusinya:

1. Browser minta "izin upload" ke `/api/init-upload` (cuma kirim nama file,
   tipe, ukuran — kecil banget).
2. Function itu (pake Service Account) minta *resumable upload session* ke
   Google Drive, terus balikin URL sesi itu ke browser.
3. Browser **PUT file langsung ke Google**, ga lewat server kita sama sekali.
4. Setelah selesai, browser panggil `/api/finalize` (cuma kirim file ID) buat
   nyuruh server bikin file itu publik & balikin link pendek `/f/<id>`.

Jadi kredensial (email & private key) tetep aman di server/`.env`, tapi file
gede-nya ga pernah numpang lewat Vercel function.

## Setup Google Drive

### 1. Service Account
1. [Google Cloud Console](https://console.cloud.google.com/) → project baru/lama.
2. Aktifin **Google Drive API**.
3. **IAM & Admin → Service Accounts** → Create Service Account.
4. Masuk service account itu → tab **Keys** → **Add Key → JSON** → download.
5. Dari file JSON itu, catat `client_email` dan `private_key`.

### 2. Folder Drive
1. Bikin folder di Drive lu (misal `get-link-uploads`).
2. Share folder itu ke email service account (role **Editor**).
3. Ambil ID folder dari URL: `drive.google.com/drive/folders/<ID_INI>`.

## Deploy ke Vercel

### Lewat dashboard (paling gampang)
1. Push project ini ke GitHub/GitLab.
2. Buka [vercel.com/new](https://vercel.com/new) → import repo itu.
3. Vercel otomatis detect struktur ini (ga perlu Build Command khusus).
4. Sebelum/sesudah deploy, buka **Project Settings → Environment Variables**,
   tambahin 3 ini (isi dari langkah Service Account & Folder di atas):
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (paste apa adanya termasuk `\n`)
   - `GOOGLE_DRIVE_FOLDER_ID`
5. Redeploy kalau env var ditambahin setelah deploy pertama.

### Lewat CLI
```
npm i -g vercel
vercel login
vercel
# isi env var pas ditanya, atau set manual:
vercel env add GOOGLE_CLIENT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add GOOGLE_DRIVE_FOLDER_ID
vercel --prod
```

### Dev lokal
```
cp .env.example .env   # isi sendiri
npm i -g vercel
vercel dev
```

## Ganti aset
Ganti `background.jpg` dan `sound.mp3` di root dengan file lu sendiri
(nama boleh beda, tinggal update `src`/`url()` di `index.html` & `style.css`).

## Catatan
- Jangan commit `.env` asli ke git.
- Belum ada rate limiting — kalau bakal dipublish rame-rame, pertimbangin
  tambahin proteksi (captcha/rate limit) biar Drive & function lu ga di-spam.
- CORS ke endpoint upload Google Drive udah didukung native oleh Google buat
  resumable session, jadi PUT langsung dari browser ga butuh konfigurasi
  tambahan.
