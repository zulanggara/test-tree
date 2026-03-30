# The Living Archive — Family Tree

A beautiful, interactive family tree web application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🌳 **Interactive Family Tree** — Visual tree with SVG connectors
- 🔍 **Smart Search** — Search by name with Descendants or Ancestors mode
- 💡 **Visual Highlighting** — Green for descendants, blue for ancestors
- 💑 **Spouse Support** — Multiple spouses, dashed connector lines
- 📱 **Responsive** — Mobile-optimized with horizontal scroll
- 🖱️ **Click for Details** — Modal with full info, biografi, and family relations
- ⚡ **Fast** — O(1) member lookup, BFS/DFS traversal

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Fonts**: Playfair Display + DM Sans (Google Fonts)
- **Avatars**: DiceBear API (fallback when no photo)
- **Deploy**: Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Adding Family Members

Edit `data/family.json`. Each member follows this schema:

```json
{
  "id": "unique-string",
  "name": "Full Name",
  "photo": "",
  "gender": "male",
  "birthDate": "1985-03-15",
  "deathDate": null,
  "birthPlace": "Jakarta, ID",
  "fatherId": "parent-id-or-null",
  "motherId": "parent-id-or-null",
  "spouseIds": ["spouse-id"],
  "childrenIds": ["child-id-1", "child-id-2"],
  "biography": "Optional biography text."
}
```

**Important rules:**
- `fatherId` / `motherId` → null if no parent in the system
- `spouseIds` → array of spouse IDs (supports multiple)
- `childrenIds` → must match the parent's `spouseIds` entry as well
- Both spouses should list shared children in their `childrenIds`

## Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Project Structure

```
family-tree/
├── data/
│   └── family.json          # Your family data
├── src/
│   ├── app/
│   │   ├── globals.css      # Design system & animations
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main page
│   ├── components/
│   │   ├── FamilyTree.tsx   # Tree layout & SVG connectors
│   │   ├── TreeNode.tsx     # Individual node component
│   │   ├── SearchBar.tsx    # Search + mode toggle
│   │   ├── DetailModal.tsx  # Member detail popup
│   │   └── Legend.tsx       # Color legend
│   ├── lib/
│   │   └── family.ts        # Traversal logic & utilities
│   └── types/
│       └── index.ts         # TypeScript types
```
