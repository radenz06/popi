const { getAccessToken } = require("./_lib/drive");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method ga didukung." });
  }

  const { fileId } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ ok: false, error: "fileId ga ada." });
  }

  try {
    const token = await getAccessToken();

    // Bikin file bisa diakses "anyone with the link" (read-only)
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    if (!permRes.ok) {
      const errText = await permRes.text();
      console.error("finalize permission error:", errText);
      return res.status(502).json({ ok: false, error: "Gagal bikin file jadi publik." });
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const link = `${proto}://${host}/f/${fileId}`;

    return res.status(200).json({ ok: true, link });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error pas finalisasi." });
  }
};
