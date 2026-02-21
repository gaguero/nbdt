# Luxury Shimmer Reveal — Logo Animation Plan

## Concept
A premium, cinematic reveal for the Nayara Bocas del Toro brand mark. The animation creates a sense of unveiling something exclusive — like curtains parting at a luxury resort.

---

## Scene Setup
- **Full-viewport dark backdrop**: deep charcoal gradient (`#1a1a2e` → `#16213e`) with a subtle radial vignette
- **Ambient texture**: faint SVG noise grain overlay at 3-4% opacity for depth (not flat digital black)
- **Centered stage**: the medallion sits at vertical center, text below

---

## Animation Timeline

### Phase 1 — Anticipation (0s → 0.8s)
- A faint **horizontal light line** (1px, soft white glow) appears at center-left of the viewport
- It pulses once softly, like a heartbeat, hinting something is about to happen
- The background subtly brightens along the line's path (radial glow following the line)

### Phase 2 — The Sweep Reveal (0.8s → 2.5s)
- The light line **expands into a luminous bar** (~60px tall, soft feathered edges)
- It sweeps **left → right** across the medallion area
- Behind the bar: the logo is progressively revealed using a CSS `clip-path: inset()` animation
- The medallion fades from `opacity: 0.3` → `1.0` as it's uncovered
- Simultaneously: very subtle `scale(0.96)` → `scale(1.0)` easing
- The light bar has a **warm golden-white gradient** (`rgba(255,248,230,0.4)`) — not cold white
- Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — smooth luxury feel

### Phase 3 — Text Entrance (2.5s → 3.8s)
- 0.3s after medallion is fully revealed:
  - **"NAYARA"** fades in + slides up 12px → 0px, letter-spacing animates from `0.5em` → `0.25em` (gathering together)
  - 0.4s later: **"BOCAS DEL TORO"** same treatment, slightly smaller
- Font: clean serif or elegant sans (use Google Font `Cormorant Garamond` for headings)
- Color: white with very slight warm tint (`#f5f0eb`)

### Phase 4 — Ambient Loop (3.8s → ∞)
Three layered infinite animations:

1. **Breathing pulse** — the entire logo group gently scales:
   - `1.0 → 1.012 → 1.0` over 6 seconds
   - Easing: `ease-in-out`, infinite

2. **Shimmer sweep** — a diagonal gradient pseudo-element:
   - 45° angle, thin highlight band (`transparent → rgba(255,255,255,0.12) → transparent`)
   - Sweeps across the medallion every **5 seconds**
   - Uses `mix-blend-mode: soft-light`
   - 1.2s duration for each sweep, 3.8s pause between

3. **Soft glow halo** — a radial shadow behind the medallion:
   - Fades between two opacity levels (`0.08 → 0.15 → 0.08`)
   - Color-tinted to match the medallion blue (`rgba(160, 180, 191, 0.15)`)
   - 8-second cycle, offset from the breathing

---

## Technical Approach

### File: `index.html` (single file, all inline)

```
Structure:
<body>
  <div class="scene">
    <div class="light-bar"></div>         ← the sweeping light effect
    <div class="logo-group">
      <div class="glow-halo"></div>       ← soft glow behind
      <div class="medallion-wrap">
        <img class="medallion" src="..." />
        <div class="shimmer"></div>       ← diagonal shimmer overlay
      </div>
      <h1 class="brand-name">NAYARA</h1>
      <p class="brand-sub">BOCAS DEL TORO</p>
    </div>
  </div>
</body>
```

### Key CSS Techniques
- **Reveal**: `clip-path: inset(0 100% 0 0)` → `clip-path: inset(0 0% 0 0)` on the medallion
- **Light bar**: absolute-positioned div with `background: linear-gradient(90deg, transparent, rgba(255,248,230,0.4), transparent)`, animated `translateX(-100vw)` → `translateX(100vw)`
- **Shimmer**: pseudo-element with `background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)`, animated `translateX(-200%)` → `translateX(200%)`
- **Breathing**: `@keyframes breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.012) } }`
- **Grain**: inline SVG `<filter>` with `feTurbulence` for background texture

### Assets Used
- `brand_assets/nayara-logo-round.png` — the medallion
- Text set in CSS (no image needed for the hotel name)
- Google Font: `Cormorant Garamond` (or similar elegant serif)

---

## Polish Details
- All animations use `transform` and `opacity` only (GPU-accelerated, no jank)
- `prefers-reduced-motion` media query: skip animations, show logo immediately
- The medallion image gets a subtle `filter: drop-shadow()` after reveal for lift
- Background grain uses `pointer-events: none` so it doesn't interfere
- Responsive: medallion scales from 180px (mobile) to 300px (desktop)

---

## Stretch Ideas (if time allows)
- **Floating leaf particles**: 4-5 tiny white leaf shapes (CSS clip-path) drift slowly across the background, very faint (opacity 0.05-0.08)
- **Mouse parallax**: medallion shifts very slightly in response to mouse position (3-5px max)
- **Sound design hook**: `data-` attribute for where to trigger a soft chime sound (implementation left to user)
