# PM Store Hero 3D Animation Enhancements

## What's New

The hero section's 3D device illustration now features **smooth, layered animations** that create depth, movement, and visual interest. The SVG elements now dance, float, and glow in synchronized but staggered patterns.

---

## Animation Breakdown

### **1. Main 3D Rotation** (`rotateHero`)
- **Duration:** 15 seconds (continuous loop)
- **Effect:** The entire SVG slowly rotates 360° on the Y-axis while maintaining slight X and Z rotations
- **Purpose:** Creates the illusion of a 3D object spinning in space

### **2. Float & Sway Motion** (`float3d`)
- **Duration:** 8 seconds
- **Effect:** The whole composition gently bobs up and down while subtly tilting
- **Purpose:** Adds organic, life-like movement (like a device floating in water)

---

## Individual Element Animations

Each device is animated independently with staggered timing to create visual complexity:

### **Phone** (`.device-1`)
- **Animation:** `floatDevice1` (4 seconds)
- **Motion:** Rises and falls with subtle scaling
- **Timing:** Starts immediately

### **Tablet** (`.device-2`)
- **Animation:** `floatDevice2` (5 seconds)
- **Motion:** Floats with gentle rotation back and forth
- **Timing:** Delayed 0.3s (staggered entry)

### **Headphones** (`.device-3`)
- **Animation:** `floatDevice3` (4.5 seconds)
- **Motion:** Bobs with slight scale changes
- **Timing:** Delayed 0.6s (enters last)

---

## Accent Effects

### **Glow Pulse** (`.accent-1`, `.accent-2`)
- **Duration:** 3–3.5 seconds
- **Effect:** Circular indicators brighten and expand with a glowing shadow
- **Purpose:** Draws attention to interactive elements; feels "alive"

### **Shimmer Lines** (`.lines`)
- **Duration:** 3 seconds
- **Effect:** Tablet's screen lines fade in/out and thicken
- **Purpose:** Suggests active display/content updates

### **Arc Bounce** (`.headphone-arc`, `.speaker-arc`)
- **Duration:** 3–3.8 seconds
- **Effect:** Curved paths (headphone band, speaker arc) scale and pulse
- **Purpose:** Creates dynamic energy; implies sound or signal transmission

---

## Technical Details

### **Performance Optimizations**
- All animations use GPU-accelerated properties: `transform`, `opacity`, and `filter`
- `perspective: 1200px` enables smooth 3D rendering
- `transform-style: preserve-3d` maintains depth layering
- No JavaScript required—purely CSS-based for performance

### **Browser Compatibility**
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Falls back gracefully on older browsers (animation simply won't play)
- Respects `prefers-reduced-motion` (existing code at line 234 disables all animations if user preference is set)

---

## Customization

### **Speed Up All Animations**
In CSS, adjust the main animations:
```css
.hero-panel svg {
  animation: float3d 6s ease-in-out infinite, /* 8s → 6s */
             rotateHero 10s linear infinite;   /* 15s → 10s */
}
```

### **Remove the 360° Spin**
If you prefer just floating without rotation:
```css
.hero-panel svg {
  animation: float3d 8s ease-in-out infinite; /* Remove rotateHero */
}
```

### **Reverse the Rotation Direction**
Change `rotateY(360deg)` to `rotateY(-360deg)` in the `@keyframes rotateHero` rule.

### **Add a Glow to the Entire Panel**
Add this to `.hero-panel`:
```css
box-shadow: inset 0 0 60px rgba(255,255,255,0.05);
```

---

## What Each Animation Does at a Glance

| Element | Animation | Duration | Delay | Effect |
|---------|-----------|----------|-------|--------|
| SVG (all) | `rotateHero` | 15s | 0s | 360° Y-axis spin |
| SVG (all) | `float3d` | 8s | 0s | Up/down bob + tilt |
| Phone | `floatDevice1` | 4s | 0s | Float + scale |
| Tablet | `floatDevice2` | 5s | 0.3s | Float + rotate |
| Headphones | `floatDevice3` | 4.5s | 0.6s | Float + scale |
| Phone indicator | `glowPulse` | 3s | 0s | Brightness & glow pulse |
| Tablet button | `glowPulse` | 3.5s | 0.4s | Brightness & glow pulse |
| Tablet lines | `shimmer` | 3s | 0.2s | Opacity + thickness shift |
| Headphone arc | `arcBounce` | 3.2s | 0.5s | Vertical scale pulse |
| Speaker arc | `arcBounce` | 3.8s | 0.1s | Vertical scale pulse |

---

## Why This Works

1. **Staggered Timing:** No two elements animate at the same pace, creating visual complexity from simple parts
2. **Layered Motion:** Multiple animations on the SVG (rotation + float) compound to create organic, less-predictable movement
3. **Accent Glows:** Small interactive elements pulse independently, suggesting they're "responsive"
4. **Subtlety:** Animations are gentle—not jerky or overwhelming—keeping focus on content
5. **Infinite Loop:** Smooth, seamless repeats feel planned and deliberate, not accidental

---

## Next Steps (Optional)

- **Add sound effects** (subtle whoosh on rotation)
- **Trigger animations on scroll** (start animation when hero comes into view)
- **Sync animations to music** (if a background track plays)
- **Add particle effects** (floating dots around the devices for extra visual flair)
- **Implement parallax** (different animation speeds based on scroll depth)

---

**File Updated:** `index.html`  
**No additional files required** — all animations are CSS-only, embedded in the existing stylesheet.
