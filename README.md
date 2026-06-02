# UXIcorns-Bingo

A static website that randomly generates a **2×2 UX bingo sheet** styled after the UXIcorns reference PDF.

## Features

- Randomly picks 4 criteria from 33 UX/design bingo items on each load
- Circular cells with the signature yellow, blue, and pink palette
- Multi-colour **UXICORNS** title, Lorem Ipsum footer, and pop-in animations
- **New Sheet** button to shuffle a fresh board
- **Click any circle** to add a custom image and caption text
- **Export Card** downloads the completed sheet as a PNG (including your images and text)

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Files

- `index.html` — page structure
- `styles.css` — layout and visual styling
- `app.js` — random selection and rendering logic
