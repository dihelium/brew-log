# my brew log — redesign spec

> This file is the single source of truth for the redesign. Read it fully before touching any file.
> Work through tasks in order. Check off each step as you complete it. Commit after every task.

---

## Stack (do not change)
React 18 · Vite · React Router v6 · localStorage · vanilla CSS · service worker
Add ONE new dependency: `framer-motion` (for animations)

```bash
npm install framer-motion
```

---

## Design tokens — replace ALL existing CSS variables with these

```css
:root {
  --bg: #faf7f2;
  --surface: #f0ead9;
  --surface-raised: #ffffff;
  --border: #e2d5be;
  --border-strong: #c8b89a;
  --text-primary: #3d2b1f;
  --text-secondary: #7a6355;
  --text-muted: #b09880;
  --accent-coffee: #c97b3a;
  --accent-coffee-dark: #a05e28;
  --accent-matcha: #4a7c59;
  --accent-matcha-dark: #365c42;
  --danger: #c0392b;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --shadow-card: 0 1px 3px rgba(61,43,31,0.06), 0 4px 12px rgba(61,43,31,0.04);
}
```

---

## Typography — install via Google Fonts link in index.html

Add this inside `<head>` in index.html, after the existing meta tags:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

Then in index.css:
```css
:root {
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
}

body {
  font-family: var(--font-body);
}
```

---

## Motion spec — use Framer Motion for all animations

All transitions use `ease: [0.4, 0, 0.2, 1]` unless specified otherwise.

| Element | Animation |
|---|---|
| Page enter | `initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.25 }}` |
| Card list | Stagger: each card `delay: index * 0.04`, same enter as above |
| Bottom sheet | `initial={{ y:'100%' }} animate={{ y:0 }} transition={{ duration:0.3 }}` |
| Backdrop | `initial={{ opacity:0 }} animate={{ opacity:1 }}` |
| FAB | `whileTap={{ scale:0.93 }}` |
| Star (on tap) | `whileTap={{ scale:1.3 }}` per star |

---

## Voice / microcopy — replace all existing UI strings with these

| Location | New copy |
|---|---|
| Empty feed heading | `No brews yet.` |
| Empty feed subtext | `Your future self will thank you for starting.` |
| Add page heading | `What did you make today?` |
| Coffee type label | `Coffee` |
| Matcha type label | `Matcha` |
| Name field placeholder | `e.g. oat flat white, ceremonial matcha` |
| Notes placeholder | `Tasting notes, how you brewed it, anything…` |
| Save button | `Log it` |
| After save (toast or return) | `Logged. ☕` |
| Delete button | `Delete brew` |
| Delete confirm message | `Gone forever. (We won't judge.)` |
| Delete confirm button | `Yes, delete` |
| Cancel | `Keep it` |

---

## File-by-file tasks

### Task 1 — index.html + index.css
- [ ] Add Google Fonts link to index.html
- [ ] Replace all CSS variables in index.css with the new design tokens above
- [ ] Add `--font-display` and `--font-body` variables
- [ ] Set `font-family: var(--font-body)` on body
- [ ] Set `background: var(--bg)` on html, body
- [ ] Commit: `style: update design tokens and load DM fonts`

---

### Task 2 — EntryCard.jsx

Redesign the card that appears in the feed list. Target look: warm parchment card, photo strip on the left (72px wide, full card height, object-fit cover), name in display font on the right, time + type badge below name, stars below that.

```jsx
// Structure to aim for:
<motion.div
  className="entry-card"
  initial={{ opacity:0, y:10 }}
  animate={{ opacity:1, y:0 }}
  transition={{ duration:0.22, delay: index * 0.04, ease:[0.4,0,0.2,1] }}
  onClick={() => navigate(`/entry/${entry.id}`)}
>
  <div className="entry-card__photo">
    {entry.photo
      ? <img src={entry.photo} alt="" />
      : <div className="entry-card__photo-placeholder" data-type={entry.type} />
    }
  </div>
  <div className="entry-card__body">
    <p className="entry-card__name">{entry.name}</p>
    <div className="entry-card__meta">
      <span className="entry-card__badge" data-type={entry.type}>
        {entry.type === 'coffee' ? 'Coffee' : 'Matcha'}
      </span>
      <span className="entry-card__time">{formatTime(entry.timestamp)}</span>
    </div>
    {entry.rating && <StarRating value={entry.rating} readOnly />}
  </div>
</motion.div>
```

CSS targets:
- `.entry-card`: `background: var(--surface-raised)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-card)`, `display: flex`, `overflow: hidden`, `cursor: pointer`, min-height 88px
- `.entry-card__photo`: `width: 72px`, `flex-shrink: 0`, `background: var(--surface)`
- `.entry-card__photo img`: `width:100%`, `height:100%`, `object-fit:cover`
- `.entry-card__photo-placeholder[data-type="coffee"]`: `background: var(--accent-coffee)` with a ☕ emoji centered
- `.entry-card__photo-placeholder[data-type="matcha"]`: `background: var(--accent-matcha)` with a 🍵 emoji centered
- `.entry-card__body`: `padding: 12px 14px`, `flex:1`, `display:flex`, `flex-direction:column`, `justify-content:center`, `gap:4px`
- `.entry-card__name`: `font-family: var(--font-display)`, `font-size: 17px`, `color: var(--text-primary)`, no margin
- `.entry-card__badge[data-type="coffee"]`: `background: #fdf0e0`, `color: var(--accent-coffee-dark)`, `font-size:11px`, `padding:2px 8px`, `border-radius:20px`
- `.entry-card__badge[data-type="matcha"]`: `background: #e8f4ec`, `color: var(--accent-matcha-dark)`
- `.entry-card__time`: `font-size: 12px`, `color: var(--text-muted)`

- [ ] Rewrite EntryCard.jsx with the above structure and styles
- [ ] Accept `index` prop from FeedPage for stagger delay
- [ ] Commit: `feat: redesign EntryCard with warm card style and stagger animation`

---

### Task 3 — StarRating.jsx

Make each star animate on tap. Stars should be larger and more tactile.

```jsx
// Each star:
<motion.button
  key={i}
  whileTap={{ scale: 1.35 }}
  transition={{ duration: 0.12 }}
  onClick={() => !readOnly && onChange(i + 1)}
  style={{ fontSize: readOnly ? '18px' : '24px', background:'none', border:'none', cursor: readOnly ? 'default' : 'pointer', padding:'2px' }}
>
  {i < value ? '★' : '☆'}
</motion.button>
```

Star colour when filled: `var(--accent-coffee)`. When empty: `var(--border-strong)`.

- [ ] Rewrite StarRating.jsx with motion stars
- [ ] Commit: `feat: tactile star rating with motion`

---

### Task 4 — FeedPage.jsx

Page wrapper should animate in. FAB should have whileTap. Empty state should use new copy.

```jsx
// Page wrapper:
<motion.div
  className="feed-page"
  initial={{ opacity:0, y:10 }}
  animate={{ opacity:1, y:0 }}
  transition={{ duration:0.25, ease:[0.4,0,0.2,1] }}
>
```

CSS:
- `.feed-page`: `padding: 16px 16px 100px`, `max-width: 480px`, `margin: 0 auto`
- Page heading: `font-family: var(--font-display)`, `font-size: 28px`, `color: var(--text-primary)`, `margin-bottom: 20px`
- Entry list: `display:flex`, `flex-direction:column`, `gap:10px`
- FAB: `position:fixed`, `bottom:28px`, `right:24px`, `width:56px`, `height:56px`, `border-radius:50%`, `background:var(--accent-coffee)`, `color:white`, `font-size:28px`, `border:none`, `cursor:pointer`, `box-shadow: 0 4px 16px rgba(201,123,58,0.35)`

Empty state:
```jsx
<div className="empty-state">
  <div className="empty-state__icon">☕</div>
  <p className="empty-state__heading">No brews yet.</p>
  <p className="empty-state__sub">Your future self will thank you for starting.</p>
</div>
```
CSS: centred, `padding: 60px 24px`, heading in display font 22px, sub in body font muted colour.

Pass `index={i}` to each EntryCard.

- [ ] Rewrite FeedPage.jsx with new layout, copy, and FAB animation
- [ ] Commit: `feat: redesign FeedPage with animated layout and empty state`

---

### Task 5 — AddPage.jsx → convert to bottom sheet

This is the most significant change. Instead of a separate route, render AddPage as a bottom sheet overlay that slides up from the bottom. Keep the `/add` route but render a fixed overlay.

```jsx
// In App.jsx, render AddPage as overlay over FeedPage:
// Route /add renders:
<>
  <FeedPage />
  <AddPage />  {/* renders as fixed overlay */}
</>

// AddPage structure:
<>
  {/* Backdrop */}
  <motion.div
    className="sheet-backdrop"
    initial={{ opacity:0 }}
    animate={{ opacity:1 }}
    exit={{ opacity:0 }}
    onClick={() => navigate('/')}
  />
  {/* Sheet */}
  <motion.div
    className="sheet"
    initial={{ y:'100%' }}
    animate={{ y:0 }}
    exit={{ y:'100%' }}
    transition={{ duration:0.3, ease:[0.4,0,0.2,1] }}
  >
    <div className="sheet__handle" />
    <h2 className="sheet__heading">What did you make today?</h2>
    {/* ... form fields ... */}
    <button className="sheet__save-btn">Log it</button>
  </motion.div>
</>
```

For `exit` animations to work, wrap routes in `<AnimatePresence>` in App.jsx.

CSS:
- `.sheet-backdrop`: `position:fixed`, `inset:0`, `background:rgba(61,43,31,0.3)`, `z-index:100`
- `.sheet`: `position:fixed`, `bottom:0`, `left:0`, `right:0`, `background:var(--surface-raised)`, `border-radius:var(--radius-lg) var(--radius-lg) 0 0`, `padding:12px 20px 48px`, `z-index:101`, `max-height:92vh`, `overflow-y:auto`
- `.sheet__handle`: `width:36px`, `height:4px`, `background:var(--border-strong)`, `border-radius:2px`, `margin:0 auto 20px`
- `.sheet__heading`: `font-family:var(--font-display)`, `font-size:22px`, `margin-bottom:20px`
- Form inputs: `width:100%`, `padding:12px 14px`, `border:1px solid var(--border)`, `border-radius:var(--radius-sm)`, `background:var(--surface)`, `font-size:16px`, `font-family:var(--font-body)`, `color:var(--text-primary)`
- `.sheet__save-btn`: `width:100%`, `padding:14px`, `background:var(--accent-coffee)`, `color:white`, `border:none`, `border-radius:var(--radius-md)`, `font-size:16px`, `font-weight:500`, `cursor:pointer`, `margin-top:20px`

- [ ] Rewrite AddPage.jsx as a bottom sheet overlay
- [ ] Update App.jsx to use AnimatePresence and render AddPage as overlay on /add route
- [ ] Commit: `feat: convert add page to animated bottom sheet`

---

### Task 6 — DetailPage.jsx

Photo-first hero. Name in display font overlaid on bottom of photo.

```
┌─────────────────────┐
│                     │
│   [full bleed photo │
│    or colour block] │
│                     │
│  name in white      │  ← absolute, bottom of hero
│  type badge         │
└─────────────────────┘
  stars
  notes block
  [delete button — bottom]
```

CSS:
- `.detail-hero`: `height:42vh`, `position:relative`, `overflow:hidden`, `border-radius:0 0 var(--radius-lg) var(--radius-lg)`
- `.detail-hero img` or colour fallback: fills the hero, `object-fit:cover`
- Coffee fallback bg: `var(--accent-coffee)`. Matcha fallback: `var(--accent-matcha)`
- Scrim: `position:absolute`, `inset:0`, `background:linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)`
- `.detail-hero__text`: `position:absolute`, `bottom:16px`, `left:20px`
- `.detail-hero__name`: `font-family:var(--font-display)`, `font-size:26px`, `color:white`
- `.detail-body`: `padding:20px`
- `.detail-notes`: `background:var(--surface)`, `border-radius:var(--radius-sm)`, `padding:14px`, `font-size:15px`, `color:var(--text-secondary)`, `line-height:1.6`
- Delete button: `width:100%`, `padding:14px`, `background:none`, `border:1px solid var(--danger)`, `color:var(--danger)`, `border-radius:var(--radius-md)`, `font-size:15px`, `cursor:pointer`, `margin-top:24px`
- Delete confirm uses new copy: "Gone forever. (We won't judge.)" / "Yes, delete" / "Keep it"

- [ ] Rewrite DetailPage.jsx with photo hero and new layout
- [ ] Commit: `feat: redesign detail page with full-bleed hero`

---

### Task 7 — final wiring and smoke test

- [ ] Run `npm run dev` and verify:
  1. Feed loads with animation, empty state shows correct copy
  2. FAB tap navigates to /add, bottom sheet slides up
  3. Backdrop tap dismisses sheet
  4. Add a coffee entry — card appears in feed with stagger
  5. Tap card — detail view opens, hero shows
  6. Delete works with correct confirm copy
  7. Reload page — entries persist (localStorage)
- [ ] Run `npm run build` — no errors
- [ ] Commit: `chore: smoke test and production build verified`

---

## What NOT to change
- BrewContext.jsx — logic is fine, no changes needed
- compressImage.js — no changes needed
- PhotoPicker.jsx — structure fine, only update styles to match new inputs
- sw.js, manifest.json, vercel.json — no changes needed
- All localStorage keys — do not rename
