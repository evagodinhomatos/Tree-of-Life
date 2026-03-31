# Tree of Life Explorer

A Next.js application for exploring the Tree of Life as an interactive, navigable system — combining hierarchical data visualization, lineage tracing, and taxonomic comparison.

Designed to make evolutionary relationships intuitive, not abstract.

## Highlights

- Interactive tree canvas with pan and zoom
- Expand and collapse lineage branches
- Overlay taxon panel with specimen image, metadata, and lineage summary
- Search with contextual hierarchy hints (rank and parent relationships)
- Auto-focused navigation with pan and zoom to selected taxa
- Focus modes:
  - `Full Tree`
  - `Lineage`
  - `Relatives`
- Taxon comparison mode with dual-lineage highlighting and shared ancestor summary
- Local JSON dataset generated from Open Tree of Life taxonomy data

## Stack

- Next.js App Router
- React
- TypeScript
- Local JSON dataset
- Custom SVG tree renderer

## Project Structure

```text
app/
  api/taxon-media/route.ts    Media lookup route
  globals.css                Global styling
  layout.tsx                 App layout
  page.tsx                   Main explorer page
components/
  Sidebar.tsx                Overlay detail and comparison panel
  TreeView.tsx               Tree rendering and interaction logic
data/
  tree-of-life.json          Local generated taxonomy dataset
lib/
  tree-utils.ts              Tree helpers and traversal utilities
  types.ts                   Shared TypeScript types
scripts/
  generate_tree_data.mjs     Dataset generator
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Regenerating the Dataset

The local taxonomy dataset can be regenerated with:

```bash
npm run generate:data
```

The generator builds `data/tree-of-life.json` from curated seed taxa and supported Open Tree subtree slices.

## How to Use

### Explore

- Click any visible node to inspect it
- Drag to pan
- Scroll to zoom
- Use node toggles to open or close branches

### Search

- Use the main search box to find a taxon
- Selecting a result reveals its lineage and focuses the map

### Compare

- Select a primary taxon
- In the overlay card, use the `Compare` search to choose a second taxon
- Switch to `Lineage` to see a normalized side-by-side lineage comparison
- The detail panel will show the shared ancestor when available
- The shared ancestor in the tree gets a subtle pulse animation so the merge point is immediately visible

## Data and Media Notes

- Taxonomy is stored locally in `data/tree-of-life.json`
- Taxon images are resolved at runtime through `app/api/taxon-media/route.ts`
- Media may come from OneZoom or Wikipedia/Wikimedia depending on availability
- Some extinct taxa use curated or fallback image sources because representative media is uneven across public datasets

## License

This project is released under the [MIT License](./LICENSE).

## Notes

- This project focuses on visualization and interaction, not phylogenetic inference
- The dataset is a curated slice of life, not a complete global taxonomy
- The current implementation uses a local dataset for performance and simplicity; future iterations could introduce server-side filtering and geospatial querying for larger-scale datasets
