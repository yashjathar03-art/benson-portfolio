# Assets

## What's here

```
assets/
├── portrait.jpg           ← Benson's headshot (from the WhatsApp image in the
│                             project folder, resized/compressed for web)
└── sheets/
    ├── spread-03.jpg      ← Timeline of projects & laureates (About section)
    ├── spread-04..07.jpg  ← Thesis: The Bishop's School, Camp, Pune
    ├── spread-08..09.jpg  ← Research & Heritage Centre, Gangapur, Nashik
    ├── spread-10..13.jpg  ← Inclusive Housing for a Lifetime, Pune
    ├── spread-14..16.jpg  ← Nature's Edge, Tapovan, Uttarakhand
    ├── spread-17..18.jpg  ← Competition sheets (Awards section)
    ├── spread-19.jpg      ← NGK Studio / Grand Entrance Canopy, Chakan
    ├── spread-20..21.jpg  ← Malik Architecture / Radisson Villa, Lonavala
    └── spread-22.jpg      ← Neilsoft BIM work
```

The `spread-NN.jpg` files are the book spreads auto-cropped from
`_Benson Mathews_Portfolio_new.pdf` (spread-NN = PDF page NN). They carry the
subtle book-mockup look (page curvature, soft shadow) because the PDF pages are
flattened mockup images — the original flat artwork is not embedded in the PDF.

## Upgrading to flat, full-quality artwork

For crisper images without the book effect, export the original sheets from the
InDesign/source files as JPG (~2200 px wide, quality 80) and overwrite the
corresponding `sheets/spread-NN.jpg` — same filename, no HTML changes needed.

The empty `projects/` folders are kept for any additional per-project imagery
you may want to add later. To add a sheet, copy an existing `.plate` block in
`index.html` (inside the relevant project) and point its `<img>` at the new file.

Also here: `hero-texture.jpg` — the thesis axonometric inverted to a dark field
(white linework, red interventions), clipped inside the big hero name via
`background-clip: text`.
