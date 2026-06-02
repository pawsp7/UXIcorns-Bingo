const CRITERIA = [
  "Colour palette",
  "Unique icon for a tab (eg. dm tab, home tab)",
  "Strong brand identity",
  "Easily identifiable navigation tab icon",
  "Perfect alignment",
  "3+ different fonts on a page",
  "UI with animations",
  "Clean and Sleek",
  "90's style",
  "Solid coloured background",
  "Gradient Element",
  "No text, only images",
  "Secret easter egg",
  "Hidden symbolism",
  "Cursed layout",
  "Totally designed by AI",
  "Multiple menus open at once",
  "Unique accessibility feature",
  "Caption inclusion",
  "Most information in smallest space",
  "Engaging notification",
  "Least content shown but still understandable",
  "Pop-up (email prompt/discount prompt)",
  "Only UI with only images",
  "Only Black/White UI",
  "Excessive navigation to complete a simple task",
  "Changing a setting",
  "Checking out from a store",
  "Finding contact email",
  "Most confusing symbol",
  "Contradictory information",
  "Redundant feature",
  "Terrible sizing",
];

const CELL_STYLES = [
  "cell--yellow",
  "cell--blue-light",
  "cell--blue-mid",
  "cell--pink",
];

let cells = [];
let editingIndex = null;
let pendingImageDataUrl = null;

const grid = document.getElementById("bingo-grid");
const editor = document.getElementById("cell-editor");
const editorForm = document.getElementById("cell-editor-form");
const editorCriterion = document.getElementById("cell-editor-criterion");
const editorText = document.getElementById("cell-editor-text");
const editorImage = document.getElementById("cell-editor-image");
const editorPreview = document.getElementById("cell-editor-preview");
const editorPreviewImg = document.getElementById("cell-editor-preview-img");
const exportBtn = document.getElementById("export-btn");

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
  grid.innerHTML = "";
  cells.forEach((cell, index) => {
    grid.appendChild(renderCellElement(cell, index));
  });
}

function renderSheet() {
  const picked = shuffle(CRITERIA).slice(0, 4);
  const styles = shuffle(CELL_STYLES);
  cells = picked.map((criterion, index) => createCellState(criterion, styles[index]));
  renderGrid();
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

document.getElementById("cell-editor-clear").addEventListener("click", () => {
  editorText.value = "";
  editorImage.value = "";
  pendingImageDataUrl = null;
  updateEditorPreview(null);
});

document.querySelector(".cell-editor__cancel").addEventListener("click", closeCellEditor);

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCellEditor();
});

editor.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeCellEditor();
});

document.getElementById("shuffle-btn").addEventListener("click", renderSheet);
exportBtn.addEventListener("click", exportSheet);

renderSheet();
