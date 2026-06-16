const CRITERIA = [
  "Strong brand identity",
  "Single Colour palette",
  "Perfect alignment",
  "3+ different fonts",
  "90's style",
  "Solid coloured background",
  "Gradient Element",
  "Textless",
  "Imageless",
  "Secret easter egg",
  "Totally designed by AI",
  "Multiple menus open at once",
  "Unique accessibility feature",
  "Caption inclusion",
  "Most information in smallest space",
  "Pop-up (email prompt/discount prompt)",
  "Black/White UI",
  "Redundant feature",
  "Terrible sizing",
];

const CELL_STYLES = [
  "cell--yellow",
  "cell--blue-light",
  "cell--blue-mid",
  "cell--pink",
];

const CONFIG_VERSION = 1;
const COOKIE_PREFIX = "uxicorns";
const COOKIE_CHUNK_SIZE = 3500;
const COOKIE_MAX_DAYS = 365;
const IMAGE_STORAGE_PREFIX = "uxicorns-img-";
const LEGACY_STORAGE_KEY = "uxicorns-bingo-config";

let cells = [];
let editingIndex = null;
let pendingImageDataUrl = null;
let saveStatusTimeout = null;

const grid = document.getElementById("bingo-grid");
const editor = document.getElementById("cell-editor");
const editorForm = document.getElementById("cell-editor-form");
const editorCriterion = document.getElementById("cell-editor-criterion");
const editorText = document.getElementById("cell-editor-text");
const editorImage = document.getElementById("cell-editor-image");
const editorPreview = document.getElementById("cell-editor-preview");
const editorPreviewImg = document.getElementById("cell-editor-preview-img");
const exportBtn = document.getElementById("export-btn");
const saveStatus = document.getElementById("save-status");

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatLabel(text) {
  const words = text.replace(/\s+/g, " ").trim().toUpperCase().split(" ");
  if (words.length <= 2) return words.join("\n");

  const mid = Math.ceil(words.length / 2);
  return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
}

function createCellState(criterion, style) {
  return {
    criterion,
    style,
    customText: "",
    imageDataUrl: null,
  };
}

function normalizeCell(cell, index = 0) {
  if (!cell || typeof cell !== "object") {
    throw new Error("Invalid cell data.");
  }

  const style = CELL_STYLES.includes(cell.style)
    ? cell.style
    : CELL_STYLES[index % CELL_STYLES.length];

  let imageDataUrl = null;
  if (typeof cell.imageDataUrl === "string") {
    imageDataUrl = cell.imageDataUrl;
  } else if (cell.hasImage) {
    imageDataUrl = localStorage.getItem(IMAGE_STORAGE_PREFIX + index);
  }

  return {
    criterion: String(cell.criterion || "Unknown criterion"),
    style,
    customText: String(cell.customText ?? ""),
    imageDataUrl,
  };
}

function setCookie(name, value, days = COOKIE_MAX_DAYS) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const escaped = encodeURIComponent(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

function clearCookieChunks() {
  const count = parseInt(getCookie(`${COOKIE_PREFIX}_count`) || "0", 10);
  deleteCookie(`${COOKIE_PREFIX}_count`);
  for (let i = 0; i < count; i++) {
    deleteCookie(`${COOKIE_PREFIX}_${i}`);
  }
}

function writeCookieData(data) {
  clearCookieChunks();

  const chunks = [];
  for (let i = 0; i < data.length; i += COOKIE_CHUNK_SIZE) {
    chunks.push(data.slice(i, i + COOKIE_CHUNK_SIZE));
  }

  setCookie(`${COOKIE_PREFIX}_count`, String(chunks.length));
  chunks.forEach((chunk, index) => {
    setCookie(`${COOKIE_PREFIX}_${index}`, chunk);
  });
}

function readCookieData() {
  const count = parseInt(getCookie(`${COOKIE_PREFIX}_count`) || "0", 10);
  if (!count) return null;

  let data = "";
  for (let i = 0; i < count; i++) {
    const chunk = getCookie(`${COOKIE_PREFIX}_${i}`);
    if (chunk === null) return null;
    data += chunk;
  }

  return data;
}

function saveImagesToStorage() {
  cells.forEach((cell, index) => {
    const key = IMAGE_STORAGE_PREFIX + index;
    if (cell.imageDataUrl) {
      try {
        localStorage.setItem(key, cell.imageDataUrl);
      } catch (error) {
        console.warn(`Could not save image for cell ${index}:`, error);
      }
    } else {
      localStorage.removeItem(key);
    }
  });
}

function clearStoredImages() {
  for (let i = 0; i < 4; i++) {
    localStorage.removeItem(IMAGE_STORAGE_PREFIX + i);
  }
}

function buildCookieConfiguration() {
  const config = buildConfiguration();
  return {
    version: config.version,
    savedAt: config.savedAt,
    cells: config.cells.map((cell) => ({
      criterion: cell.criterion,
      style: cell.style,
      customText: cell.customText,
      hasImage: Boolean(cell.imageDataUrl),
    })),
  };
}

function renderCellElement(cell, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `cell ${cell.style}${cell.imageDataUrl ? " cell--has-image" : ""}`;
  button.setAttribute("role", "gridcell");
  button.setAttribute("aria-label", `Customize: ${cell.criterion}`);

  if (cell.imageDataUrl) {
    const img = document.createElement("img");
    img.className = "cell__image";
    img.src = cell.imageDataUrl;
    img.alt = cell.customText || cell.criterion;
    button.appendChild(img);
  }

  const content = document.createElement("div");
  content.className = "cell__content";

  const label = document.createElement("span");
  label.className = "cell__label";
  label.style.whiteSpace = "pre-line";
  label.textContent = formatLabel(cell.criterion);
  content.appendChild(label);

  if (cell.customText.trim()) {
    const custom = document.createElement("span");
    custom.className = "cell__custom";
    custom.textContent = cell.customText.trim();
    content.appendChild(custom);
  }

  button.appendChild(content);
  button.addEventListener("click", () => openCellEditor(index));

  return button;
}

function renderGrid() {
  if (!grid) {
    console.error("Bingo grid element not found.");
    return;
  }

  grid.innerHTML = "";

  if (!cells.length) {
    return;
  }

  cells.forEach((cell, index) => {
    grid.appendChild(renderCellElement(cell, index));
  });
}

function renderSheet(skipConfirm = false) {
  if (!skipConfirm && cells.length > 0) {
    const hasContent = cells.some((cell) => cell.customText.trim() || cell.imageDataUrl);
    if (hasContent && !confirm("Start a new sheet? Your current card will be replaced.")) {
      return;
    }
  }

  const picked = shuffle(CRITERIA).slice(0, 4);
  const styles = shuffle(CELL_STYLES);
  cells = picked.map((criterion, index) => createCellState(criterion, styles[index]));
  renderGrid();
  persistConfiguration({ silent: true });
}

function buildConfiguration() {
  return {
    version: CONFIG_VERSION,
    savedAt: new Date().toISOString(),
    cells: cells.map((cell) => ({
      criterion: cell.criterion,
      style: cell.style,
      customText: cell.customText,
      imageDataUrl: cell.imageDataUrl,
    })),
  };
}

function applyConfiguration(config) {
  if (!config || !Array.isArray(config.cells) || config.cells.length !== 4) {
    throw new Error("Invalid configuration: expected 4 cells.");
  }

  cells = config.cells.map((cell, index) => normalizeCell(cell, index));
  renderGrid();
}

function showSaveStatus(message, isError = false) {
  if (!saveStatus) return;

  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "var(--pink)" : "var(--blue-dark)";

  if (saveStatusTimeout) clearTimeout(saveStatusTimeout);
  if (message) {
    saveStatusTimeout = setTimeout(() => {
      saveStatus.textContent = "";
    }, 3500);
  }
}

function persistConfiguration({ silent = false } = {}) {
  if (!cells.length) return;

  saveImagesToStorage();

  try {
    writeCookieData(JSON.stringify(buildCookieConfiguration()));
    if (!silent) showSaveStatus("Card saved automatically.");
  } catch (error) {
    console.warn("Could not save configuration to cookies:", error);
    if (!silent) showSaveStatus("Could not save your card.", true);
  }
}

function restoreFromCookies() {
  try {
    const raw = readCookieData();
    if (!raw) return migrateFromLegacyStorage();

    applyConfiguration(JSON.parse(raw));
    showSaveStatus("Restored your saved card.");
    return true;
  } catch (error) {
    console.warn("Could not restore saved configuration:", error);
    clearCookieChunks();
    return migrateFromLegacyStorage();
  }
}

function migrateFromLegacyStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return false;

    applyConfiguration(JSON.parse(raw));
    persistConfiguration({ silent: true });
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    showSaveStatus("Restored your saved card.");
    return true;
  } catch (error) {
    console.warn("Could not migrate legacy storage:", error);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return false;
  }
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose a valid image file."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

function updateEditorPreview(dataUrl) {
  if (dataUrl) {
    editorPreview.hidden = false;
    editorPreviewImg.src = dataUrl;
  } else {
    editorPreview.hidden = true;
    editorPreviewImg.removeAttribute("src");
  }
}

function openCellEditor(index) {
  editingIndex = index;
  const cell = cells[index];

  editorCriterion.textContent = cell.criterion;
  editorText.value = cell.customText;
  editorImage.value = "";
  pendingImageDataUrl = cell.imageDataUrl;
  updateEditorPreview(pendingImageDataUrl);

  editor.showModal();
  editorText.focus();
}

function closeCellEditor() {
  editingIndex = null;
  pendingImageDataUrl = null;
  editor.close();
}

function saveCellEditor() {
  if (editingIndex === null) return;

  cells[editingIndex] = {
    ...cells[editingIndex],
    customText: editorText.value,
    imageDataUrl: pendingImageDataUrl,
  };

  renderGrid();
  closeCellEditor();
  persistConfiguration({ silent: true });
}

const PDF_MARGIN = 20;
const PDF_LINE_HEIGHT = 7;

function getImageFormat(dataUrl) {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  const type = match ? match[1].toUpperCase() : "PNG";
  if (type === "JPG") return "JPEG";
  if (type === "SVG") return "PNG";
  return type;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for export."));
    img.src = dataUrl;
  });
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = PDF_LINE_HEIGHT) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

async function exportSheet() {
  exportBtn.disabled = true;
  exportBtn.textContent = "Exporting…";

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const contentW = pageW - PDF_MARGIN * 2;

    for (let i = 0; i < cells.length; i++) {
      if (i > 0) doc.addPage();

      const cell = cells[i];
      let y = PDF_MARGIN + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Cell ${i + 1} of ${cells.length}`, PDF_MARGIN, PDF_MARGIN + 4);

      doc.setTextColor(26, 79, 208);
      doc.setFontSize(14);
      doc.text("Criteria", PDF_MARGIN, y);
      y += 8;

      doc.setTextColor(0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      y = addWrappedText(doc, cell.criterion, PDF_MARGIN, y, contentW, 8) + 12;

      doc.setTextColor(26, 79, 208);
      doc.setFontSize(14);
      doc.text("Text", PDF_MARGIN, y);
      y += 8;

      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const customText = cell.customText.trim() || "—";
      y = addWrappedText(doc, customText, PDF_MARGIN, y, contentW, 6) + 14;

      doc.setTextColor(26, 79, 208);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Image", PDF_MARGIN, y);
      y += 10;

      if (cell.imageDataUrl) {
        const img = await loadImage(cell.imageDataUrl);
        const format = getImageFormat(cell.imageDataUrl);
        const maxW = contentW;
        const maxH = pageH - y - PDF_MARGIN;
        const aspect = img.width / img.height;
        let drawW = maxW;
        let drawH = drawW / aspect;

        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * aspect;
        }

        const x = PDF_MARGIN + (contentW - drawW) / 2;
        doc.addImage(cell.imageDataUrl, format, x, y, drawW, drawH);
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(120);
        doc.text("No image uploaded", PDF_MARGIN, y + 4);
        doc.setTextColor(0);
      }
    }

    doc.save(`uxicorns-bingo-${Date.now()}.pdf`);
  } catch (error) {
    alert("Export failed. Please try again.");
    console.error(error);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = "Export PDF";
  }
}

function setupEventListeners() {
  if (editorImage) {
    editorImage.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        pendingImageDataUrl = await readImageFile(file);
        updateEditorPreview(pendingImageDataUrl);
      } catch (error) {
        alert(error.message);
        editorImage.value = "";
      }
    });
  }

  document.getElementById("cell-editor-clear")?.addEventListener("click", () => {
    editorText.value = "";
    editorImage.value = "";
    pendingImageDataUrl = null;
    updateEditorPreview(null);
  });

  document.querySelector(".cell-editor__cancel")?.addEventListener("click", closeCellEditor);

  editorForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCellEditor();
  });

  editor?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCellEditor();
  });

  document.getElementById("shuffle-btn")?.addEventListener("click", () => renderSheet());
  exportBtn?.addEventListener("click", exportSheet);
}

function ensureSheetRendered() {
  if (!grid) {
    console.error("Cannot render bingo sheet: #bingo-grid is missing.");
    return;
  }

  if (grid.children.length === 0 || cells.length !== 4) {
    renderSheet(true);
  }
}

function initApp() {
  setupEventListeners();

  try {
    if (!restoreFromCookies()) {
      renderSheet(true);
    }
  } catch (error) {
    console.error("Failed to restore configuration:", error);
    clearCookieChunks();
    clearStoredImages();
    renderSheet(true);
  }

  ensureSheetRendered();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
