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
const CONFIG_STORAGE_KEY = "uxicorns-bingo-config";

let cells = [];
let editingIndex = null;
let pendingImageDataUrl = null;
let saveStatusTimeout = null;
let configPanelMode = "copy";

const grid = document.getElementById("bingo-grid");
const editor = document.getElementById("cell-editor");
const editorForm = document.getElementById("cell-editor-form");
const editorCriterion = document.getElementById("cell-editor-criterion");
const editorText = document.getElementById("cell-editor-text");
const editorImage = document.getElementById("cell-editor-image");
const editorPreview = document.getElementById("cell-editor-preview");
const editorPreviewImg = document.getElementById("cell-editor-preview-img");
const exportBtn = document.getElementById("export-btn");
const copyConfigBtn = document.getElementById("copy-config-btn");
const pasteConfigBtn = document.getElementById("paste-config-btn");
const saveStatus = document.getElementById("save-status");
const configPanel = document.getElementById("config-panel");
const configPanelTitle = document.getElementById("config-panel-title");
const configPanelHint = document.getElementById("config-panel-hint");
const configPanelLabel = document.getElementById("config-panel-label");
const configText = document.getElementById("config-text");
const configPanelPrimary = document.getElementById("config-panel-primary");
const configPanelClose = document.getElementById("config-panel-close");
const configSelectAllBtn = document.getElementById("config-select-all-btn");

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

  return {
    criterion: String(cell.criterion || "Unknown criterion"),
    style,
    customText: String(cell.customText ?? ""),
    imageDataUrl: typeof cell.imageDataUrl === "string" ? cell.imageDataUrl : null,
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

function serializeConfiguration() {
  return JSON.stringify(buildConfiguration());
}

function parseConfigurationText(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Paste your configuration text first.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Invalid configuration text — make sure you copied the full config.");
  }
}

function persistConfiguration({ silent = false } = {}) {
  if (!cells.length) {
    return "";
  }

  const serialized = serializeConfiguration();

  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, serialized);
    if (!silent) showSaveStatus("Configuration saved to this browser.");
  } catch (error) {
    if (!silent) {
      showSaveStatus("Browser storage full — copy your config text to keep it safe.", true);
    }
    console.warn("Could not save to localStorage:", error);
  }

  return serialized;
}

function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return false;

    applyConfiguration(JSON.parse(raw));
    showSaveStatus("Restored your last saved card.");
    return true;
  } catch (error) {
    console.warn("Could not restore saved configuration:", error);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    return false;
  }
}

function loadConfigurationText(raw) {
  applyConfiguration(parseConfigurationText(raw));
  persistConfiguration({ silent: true });
  showSaveStatus("Configuration loaded.");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (!configText) return false;

  configText.focus();
  configText.select();
  return document.execCommand("copy");
}

function showConfigPanel() {
  if (!configPanel) return;

  configPanel.hidden = false;
  configPanel.classList.add("is-visible");
  configPanel.style.display = "flex";
}

function hideConfigPanel() {
  if (!configPanel) return;

  configPanel.hidden = true;
  configPanel.classList.remove("is-visible");
  configPanel.style.display = "";
}

function openConfigPanel(mode) {
  if (!configPanel || !configText) {
    alert("Config panel is unavailable. Please refresh the page.");
    return;
  }

  configPanelMode = mode;
  showConfigPanel();

  if (mode === "copy") {
    const serialized = persistConfiguration({ silent: true }) || serializeConfiguration();

    if (configPanelTitle) configPanelTitle.textContent = "Copy Configuration";
    if (configPanelHint) {
      configPanelHint.textContent =
        "Your full config is shown below. Select all and copy it, or use the buttons.";
    }
    if (configPanelLabel) configPanelLabel.textContent = "Your config";
    configText.readOnly = false;
    configText.value = serialized;
    configText.readOnly = true;
    if (configPanelPrimary) {
      configPanelPrimary.textContent = "Copy to Clipboard";
      configPanelPrimary.hidden = false;
    }
    if (configSelectAllBtn) configSelectAllBtn.hidden = false;
  } else {
    if (configPanelTitle) configPanelTitle.textContent = "Paste Configuration";
    if (configPanelHint) {
      configPanelHint.textContent = "Paste your saved config text below, then click Apply.";
    }
    if (configPanelLabel) configPanelLabel.textContent = "Config text";
    configText.readOnly = false;
    configText.value = "";
    if (configPanelPrimary) {
      configPanelPrimary.textContent = "Apply";
      configPanelPrimary.hidden = false;
    }
    if (configSelectAllBtn) configSelectAllBtn.hidden = true;
  }

  window.setTimeout(() => {
    configText.focus();
    if (mode === "copy") {
      configText.select();
    }
    configPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 0);
}

function closeConfigPanel() {
  hideConfigPanel();
}

function selectAllConfigText() {
  if (!configText) return;
  configText.focus();
  configText.select();
}

async function handleConfigPanelPrimary() {
  if (configPanelMode === "copy") {
    try {
      await copyTextToClipboard(configText.value);
      showSaveStatus("Configuration copied to clipboard.");
    } catch (error) {
      selectAllConfigText();
      showSaveStatus("Select the text above and copy manually (Ctrl+C / Cmd+C).", true);
    }
    return;
  }

  try {
    loadConfigurationText(configText.value);
    closeConfigPanel();
  } catch (error) {
    showSaveStatus(error.message || "Could not load configuration.", true);
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
  copyConfigBtn?.addEventListener("click", () => openConfigPanel("copy"));
  pasteConfigBtn?.addEventListener("click", () => openConfigPanel("paste"));
  configPanelPrimary?.addEventListener("click", handleConfigPanelPrimary);
  configPanelClose?.addEventListener("click", closeConfigPanel);
  configSelectAllBtn?.addEventListener("click", selectAllConfigText);
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
    if (!restoreFromLocalStorage()) {
      renderSheet(true);
    }
  } catch (error) {
    console.error("Failed to restore configuration:", error);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    renderSheet(true);
  }

  ensureSheetRendered();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
