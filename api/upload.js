const { getAccessToken } = require("./_lib/drive");
const { ALLOWED_MIME, MAX_SIZE } = require("./_lib/constants");

// Parse multipart form data manually untuk Vercel (ga ada multer)
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    // Kalau udah di-parse multer (local Express), langsung return
    if (req.file) return resolve(req.file);

    const busboy = require("busboy");
    const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_SIZE } });
    let fileData = null;

    bb.on("file", (fieldname, stream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        fileData = {
          buffer: Buffer.concat(chunks),
          originalname: filename,
          mimetype: mimeType,
          size: Buffer.concat(chunks).length,
        };
      });
    });

    bb.on("finish", () => {
      if (fileData) resolve(fileData);
      else reject(new Error("No file"));
    });
    bb.on("error", reject);

    req.pipe(bb);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "x" });
  }

  try {
    const file = await parseMultipart(req);

    if (!ALLOWED_MIME[file.mimetype]) {
      return res.status(400).json({ ok: false, error: "Tipe file ditolak." });
    }
    if (file.size > MAX_SIZE) {
      return res.status(400).json({ ok: false, error: "Kegedean, max 25MB." });
    }

    const token = await getAccessToken();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Upload ke Google Drive (multipart)
    const metadata = JSON.stringify({
      name: file.originalname,
      parents: folderId ? [folderId] : undefined,
    });

    const boundary = "----B" + Date.now().toString(36);
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.mimetype}\r\n\r\n`), file.buffer, Buffer.from(`\r\n--${boundary}--`)]);

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("drive upload err:", errText);
      return res.status(502).json({ ok: false, error: "Upload gagal." });
    }

    const { id: fileId } = await uploadRes.json();

    // Set permission publik
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    if (!permRes.ok) {
      console.error("perm err:", await permRes.text());
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const link = `${proto}://${host}/f/${fileId}`;

    // Response di-encode biar ga readable di network tab
    const payload = JSON.stringify({ ok: true, link });
    const encoded = Buffer.from(payload).toString("base64");
    return res.status(200).json({ d: encoded });
  } catch (e) {
    console.error("upload error:", e);
    const payload = JSON.stringify({ ok: false, error: e.message });
    const encoded = Buffer.from(payload).toString("base64");
    return res.status(500).json({ d: encoded });
  }
};

// Disable Vercel's default body parser (kita parse sendiri pake busboy)
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
