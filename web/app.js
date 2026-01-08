(() => {
  const MAX_TEXT_LENGTH = 10_000;
  const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;
  const MAX_MEDIA_DURATION_SECONDS = 120;

  const ALLOWED_MIME_TYPES = new Set([
    // video
    "video/mp4",
    "video/quicktime",
    "video/3gpp",
    // audio
    "audio/mp4",
    "audio/aac",
  ]);

  const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "3gp", "m4a", "aac"]);

  function $(id) {
    return document.getElementById(id);
  }

  function currentPage() {
    const path = window.location.pathname;
    return path.split("/").pop() || "index.html";
  }

  function showError(message) {
    const el = $("error");
    if (!el) return;
    el.textContent = message;
  }

  function clearError() {
    const el = $("error");
    if (!el) return;
    el.textContent = "";
  }

  function getExtension(fileName) {
    const idx = fileName.lastIndexOf(".");
    if (idx === -1) return "";
    return fileName.slice(idx + 1).toLowerCase();
  }

  function validateText(inputText) {
    if (!inputText) return null;
    if (inputText.length > MAX_TEXT_LENGTH) {
      return `テキストが最大文字数（${MAX_TEXT_LENGTH}文字）を超えています。`;
    }
    return null;
  }

  function validateFileBasics(file) {
    if (!file) return null;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "ファイルサイズが上限（300MB）を超えています。";
    }

    const ext = getExtension(file.name);
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return "許可されていない拡張子です（mp4/mov/3gp/m4a/aac のみ）。";
    }

    // iOSなどで空のtypeになることがあるので、typeがある場合だけ厳格にチェック
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return "許可されていないContent-Typeです。";
    }

    return null;
  }

  async function readMediaDurationSeconds(file) {
    // メタデータ読み取り用に video 要素を使う（音声でも動作することが多い）
    const url = URL.createObjectURL(file);
    try {
      const media = document.createElement("video");
      media.preload = "metadata";
      media.src = url;

      const duration = await new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          reject(new Error("metadata timeout"));
        }, 4000);

        media.onloadedmetadata = () => {
          window.clearTimeout(timeoutId);
          resolve(media.duration);
        };

        media.onerror = () => {
          window.clearTimeout(timeoutId);
          reject(new Error("metadata error"));
        };
      });

      if (typeof duration !== "number" || !Number.isFinite(duration)) {
        throw new Error("invalid duration");
      }
      return duration;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function validateMediaDuration(file) {
    if (!file) return null;

    // duration取得は環境依存なので、取得できたらチェックする（取得失敗時はスキップ）
    try {
      const durationSeconds = await readMediaDurationSeconds(file);
      if (durationSeconds > MAX_MEDIA_DURATION_SECONDS) {
        return "動画/音声の長さが上限（2分）を超えています。";
      }
    } catch {
      // noop
    }

    return null;
  }

  function saveUploadDraft({ inputText, fileMeta }) {
    const payload = {
      inputText: inputText || "",
      file: fileMeta || null,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem("slowtech_upload_draft", JSON.stringify(payload));
  }

  function loadUploadDraft() {
    const raw = sessionStorage.getItem("slowtech_upload_draft");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setupUploadPage() {
    const form = $("upload-form");
    const fileInput = $("media-file");
    const textArea = $("input-text");
    const textCount = $("text-count");

    if (!form || !fileInput || !textArea || !textCount) return;

    const updateCount = () => {
      textCount.textContent = String(textArea.value.length);
    };

    textArea.addEventListener("input", () => {
      clearError();
      updateCount();
    });

    fileInput.addEventListener("change", () => {
      clearError();
    });

    updateCount();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const inputText = textArea.value.trim();
      const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

      if (!inputText && !file) {
        showError("動画/音声、またはテキストのどちらかを入力してください。");
        return;
      }

      const textError = validateText(inputText);
      if (textError) {
        showError(textError);
        return;
      }

      const fileBasicError = validateFileBasics(file);
      if (fileBasicError) {
        showError(fileBasicError);
        return;
      }

      const durationError = await validateMediaDuration(file);
      if (durationError) {
        showError(durationError);
        return;
      }

      const fileMeta = file
        ? {
            name: file.name,
            sizeBytes: file.size,
            contentType: file.type || "",
          }
        : null;

      saveUploadDraft({ inputText, fileMeta });

      window.location.href = "./processing.html";
    });
  }

  function setupProcessingPage() {
    const progress = $("progress");
    if (!progress) return;

    // ダミー進捗
    let pct = 0;
    const intervalId = window.setInterval(() => {
      pct = Math.min(100, pct + 20);
      progress.textContent = `進捗: ${pct}%`;
      if (pct >= 100) {
        window.clearInterval(intervalId);
        window.location.href = "./result.html";
      }
    }, 600);
  }

  function setupResultPage() {
    const preview = $("input-preview");
    if (!preview) return;

    const draft = loadUploadDraft();
    if (!draft) {
      preview.textContent = "（入力が見つかりませんでした。Upload画面からやり直してください）";
      return;
    }

    const lines = [];
    if (draft.file) {
      lines.push(`ファイル名: ${draft.file.name}`);
      lines.push(`サイズ: ${draft.file.sizeBytes} bytes`);
      lines.push(`Content-Type: ${draft.file.contentType || "（未取得）"}`);
    } else {
      lines.push("ファイル: なし");
    }

    lines.push("");
    lines.push("テキスト:");
    lines.push(draft.inputText || "（なし）");

    preview.textContent = lines.join("\n");
  }

  const page = currentPage();
  if (page === "" || page === "index.html") {
    setupUploadPage();
  } else if (page === "processing.html") {
    setupProcessingPage();
  } else if (page === "result.html") {
    setupResultPage();
  }
})();
