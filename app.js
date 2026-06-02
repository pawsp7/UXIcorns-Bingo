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

function renderSheet() {
  const grid = document.getElementById("bingo-grid");
  const picked = shuffle(CRITERIA).slice(0, 4);
  const styles = shuffle(CELL_STYLES);

  grid.innerHTML = "";

  picked.forEach((criterion, index) => {
    const cell = document.createElement("div");
    cell.className = `cell ${styles[index]}`;
    cell.setAttribute("role", "gridcell");
    cell.style.whiteSpace = "pre-line";
    cell.textContent = formatLabel(criterion);
    grid.appendChild(cell);
  });
}

document.getElementById("shuffle-btn").addEventListener("click", renderSheet);

renderSheet();
