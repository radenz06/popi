// ================= CURSOR GLOW =================
const cursorGlow = document.getElementById("cursor-glow");
window.addEventListener("mousemove", (e) => {
  cursorGlow.style.left = `${e.clientX}px`;
  cursorGlow.style.top = `${e.clientY}px`;
});

// ================= SOUND PLAYER =================
const bgSound = document.getElementById("bgSound");
const soundToggle = document.getElementById("soundToggle");
let isPlaying = false;

soundToggle.addEventListener("click", () => {
  if (!isPlaying) {
    bgSound.play().catch(() => {});
    soundToggle.textContent = "⏸";
  } else {
    bgSound.pause();
    soundToggle.textContent = "▶";
  }
  isPlaying = !isPlaying;
});

// ================= UPLOAD LOGIC =================
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const resultBox = document.getElementById("resultBox");
const resultLink = document.getElementById("resultLink");
const copyBtn = document.getElementById("copyBtn");
const statusMsg = document.getElementById("statusMsg");
const copyBtnDefaultText = "COPY";

const ALLOWED_EXT = ["mp3", "jpg", "jpeg", "png", "pdf", "mp4"];
const MAX_SIZE = 25 * 1024 * 1024;

// Endpoint obfuscation — ga keliatan kayak upload endpoint
const _ep = ["/api/", "s"].join("");

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

["dragenter", "dragover"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function resetStatus() {
  statusMsg.textContent = "";
  resultBox.classList.add("hidden");
}

function validateFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return "Tipe file ditolak. Cuma boleh mp3, jpg/png, pdf, mp4.";
  }
  if (file.size > MAX_SIZE) {
    return "File kegedean, maksimal 25MB.";
  }
  return null;
}

function handleFile(file) {
  resetStatus();
  const err = validateFile(file);
  if (err) {
    statusMsg.textContent = err;
    return;
  }
  uploadFile(file);
}

// Decode server response (base64 encoded)
function _d(raw) {
  try {
    if (raw.d) {
      return JSON.parse(atob(raw.d));
    }
    return raw;
  } catch {
    return raw;
  }
}

// -------- UPLOAD: single endpoint, server handles everything --------
async function uploadFile(file) {
  progressWrap.classList.remove("hidden");
  progressBar.style.width = "0%";

  try {
    statusMsg.textContent = "Ngupload file...";

    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", _ep);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = `${pct}%`;
      }
    });

    const result = await new Promise((resolve, reject) => {
      xhr.onload = () => {
        try {
          const raw = JSON.parse(xhr.responseText);
          const data = _d(raw);
          if (data.ok) resolve(data);
          else reject(new Error(data.error || "Upload gagal."));
        } catch {
          reject(new Error("Respon server ga kebaca."));
        }
      };
      xhr.onerror = () => reject(new Error("Koneksi ke server error."));
      xhr.send(fd);
    });

    progressWrap.classList.add("hidden");
    statusMsg.textContent = "";
    resultLink.value = result.link;
    resultBox.classList.remove("hidden");
  } catch (err) {
    progressWrap.classList.add("hidden");
    statusMsg.textContent = err.message || "Upload gagal, coba lagi.";
  }
}

copyBtn.addEventListener("click", () => {
  resultLink.select();
  navigator.clipboard.writeText(resultLink.value).then(() => {
    copyBtn.textContent = "COPIED!";
    setTimeout(() => (copyBtn.textContent = copyBtnDefaultText), 1200);
  });
});
