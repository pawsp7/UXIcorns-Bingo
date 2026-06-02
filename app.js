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

async function exportSheet() {
  const exportArea = document.getElementById("export-area");

  exportBtn.disabled = true;
  exportBtn.textContent = "Exporting…";

  try {
    await document.fonts.ready;

    const canvas = await html2canvas(exportArea, {
      backgroundColor: "#e8e8e8",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = `uxicorns-bingo-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    alert("Export failed. Please try again.");
    console.error(error);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = "Export Card";
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
