const { getAccessToken } = require("./_lib/drive");
const { ALLOWED_MIME, MAX_SIZE } = require("./_lib/constants");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method ga didukung." });
  }

  const { name, mimeType, size } = req.body || {};

  if (!name || !mimeType || !size) {
    return res.status(400).json({ ok: false, error: "Data file ga lengkap." });
  }
  if (!ALLOWED_MIME[mimeType]) {
    return res.status(400).json({ ok: false, error: "Tipe file ditolak. Cuma mp3, jpg, png, pdf, mp4." });
  }
  if (size > MAX_SIZE) {
    return res.status(400).json({ ok: false, error: "File kegedean, maksimal 25MB." });
  }

  try {
    const token = await getAccessToken();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Minta sesi resumable upload ke Drive. Browser bakal PUT file-nya
    // LANGSUNG ke sesi ini, ga lewat server kita lagi.
    const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify({
        name,
        parents: folderId ? [folderId] : undefined,
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error("init-upload drive error:", errText);
      return res.status(502).json({ ok: false, error: "Gagal mulai sesi upload ke Drive." });
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) {
      return res.status(502).json({ ok: false, error: "Drive ga ngasih upload URL." });
    }

    return res.status(200).json({ ok: true, uploadUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error pas nyiapin upload.", details: e.message, stack: e.stack });
  }
};
