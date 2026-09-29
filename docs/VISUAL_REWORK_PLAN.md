# VISUAL REWORK PLAN — DOGFOOD 2026 HERO & ENVIRONMENT

**Document Version:** 1.0.0  
**Target Specification:** `Dogfood_Design_Reference.md`  
**Scope:** Complete Architectural & Visual Overhaul of the Hero Composition, Organic Sculptural Core, Lighting Engine, Floating Spatial HUDs, Typography, and Depth Micro-interactions.  
**Preservation Mandate:** 100% of underlying Dogfood backend, database, offline capabilities, API endpoints, judging algorithms, and test suites must remain intact.

---

## 1. WHAT IS WRONG

1. **Disconnected Component-Based Assembly vs. Unified Composition**:
   - The current hero is constructed as a vertical stack of discrete components (a top status bar, a text container, a 2D canvas, two floating boxes, and a navbar) placed into a standard flex container.
   - The elements feel like independent HTML widgets placed onto a dark page rather than an integrated, cinematic digital environment.

2. **Generic 2D Canvas Blob vs. Living 3D Sculptural Core**:
   - The central visual (`FluidLivingCore.jsx`) currently generates a 2D polygon with smoothed harmonic sine-wave radius distortion and a flat radial gradient fill.
   - It appears as a flat, wobbling purple shape with a 2D drop-shadow. It lacks physical silhouette, internal volume, surface curvature, light-catching ridges, ambient occlusion, and material depth.

3. **Flat CSS Lighting vs. Layered Physical Volumetric Atmosphere**:
   - Lighting is currently achieved via basic CSS `radial-gradient` and box-shadows.
   - It lacks rim illumination (Fresnel grazing angles), dark internal core density, subtle bloom, and atmospheric interaction between the sculptural body and the surrounding near-black vacuum.

4. **SaaS-Style Cards vs. Integrated Spatial HUD Elements**:
   - The floating cards (`FloatingHudCard.jsx`) look like typical dashboard metric containers with heavy padding, loud icons, and full progress bars.
   - They do not feel tethered to the 3D space or optical depth planes of the composition.

5. **Mechanical Web Typography vs. Editorial Display Presence**:
   - The display headline ("BUILD. BREAK. SHIP.") and supporting copy lack the exact editorial confidence, optical proportions, line-height, letter tracking, and spatial breathing room demonstrated in the reference.

6. **Flat 2D Translation Parallax vs. Multi-Axis Perspective Depth**:
   - Mouse interaction currently translates coordinates linearly in 2D (`translateX/translateY`).
   - There is no subtle perspective tilt, no dynamic specular highlight travel across the deforming surface, and no authentic optical parallax differential between foreground, midground, and background layers.

---

## 2. WHY IT IS WRONG

- **Violation of Design Intent**: `Dogfood_Design_Reference.md` explicitly specifies a **"cinematic, sophisticated, spacious, dark creative-tech environment"** anchored by a single dominant, deforming sculptural object with violet-illuminated contours and small, whisper-quiet floating information markers.
- **Superficial Interpretation**: The previous pass treated the requirement as "make a dark container, center text, put a purple canvas at the bottom, and place two cards on the sides." This missed the entire spatial relationship between typography, mass, light, depth, and negative space.
- **Lack of Physical Materiality**: The central visual must look like a real physical form sculpted from ultra-dark obsidian/matte carbon, where the center remains dark and deep while the evolving edges catch razor-sharp and soft-blooming violet rim light.

---

## 3. WHAT WILL BE REBUILT

### A. The Central Sculptural Core (`FluidLivingCore.jsx` / `SculpturalLivingCore.jsx`)
- **Multi-layered 3D Volumetric Contour Engine**:
  - Reconstruct the rendering engine into a continuous, organic deforming sculpture using multi-octave non-repeating noise with differential depth layers.
  - Implement **Fresnel Rim Illumination**: Grazing-angle calculations that generate brilliant violet/indigo edges (`#bfa5ff`, `#7a4ee0`, `#351c68`) while keeping the internal body deep obsidian (`#07050d`, `#0b0914`).
  - **Internal Surface Ridges & Light Creases**: Render dynamic internal curvature contours that travel across the form as it undulates and breathes, conveying physical volume and changing topology.
  - **Specular Traveling Highlights**: Light points that shift naturally with surface normal vectors and pointer coordinates.
  - **Soft Deep Atmospheric Occlusion & Bloom**: Multi-pass ambient glow that bleeds into the surrounding space without flat gradient banding.

### B. The Hero Composition & Spatial Hierarchy (`ReferenceHero.jsx`)
- **Cohesive Environmental Canvas**:
  - Remove all artificial container segmentation and dashboard-like status headers.
  - Structure a unified depth stack:
    1. `Layer 0 (Background)`: Deep near-black canvas (`#050407` / `#070609`) with very low-opacity atmospheric violet haze and micro-stardust depth.
    2. `Layer 1 (Atmospheric Backlight)`: Volumetric radial bloom anchored behind the sculpture.
    3. `Layer 2 (Central Sculpture)`: Massive organic living core dominating the middle and lower zones, cropped naturally at the base.
    4. `Layer 3 (Floating HUD Data Elements)`: Translucent spatial information capsules positioned at distinct optical depths.
    5. `Layer 4 (Editorial Display Typography & CTA)`: Dominant headline, muted 1-line description, and crisp pill CTA integrated harmoniously over the upper negative space.
    6. `Layer 5 (Micro Navigation)`: Whispering top navigation bar blending into the global environment.

### C. Floating Spatial HUDs (`FloatingSpatialHUD.jsx`)
- Re-engineer the floating markers into minimalist spatial HUD capsules:
  - Deep dark frosted glass (`rgba(10, 8, 16, 0.60)` with `backdrop-filter: blur(16px)`).
  - Ultra-thin, low-opacity borders (`rgba(255, 255, 255, 0.05)`).
  - Restrained typographic hierarchy with crisp monospace metadata labels and clean sans-serif metrics.
  - Independent, differential spring-lerp parallax physics (the left card moves at depth factor `0.04`, the right card at depth factor `0.06`, creating genuine 3D parallax separation).

### D. Typography & Editorial Hierarchy
- Re-craft the typography system with exact tracking, line-height, and scale:
  - Display Headline: Precision uppercase typography with `-0.04em` letter-spacing, tight leading (`0.95`), and off-white radiance (`#f5f4f8`).
  - Supporting Text: Narrow max-width, muted warm slate (`#9a98a6`), clean line-height.
  - CTA: Pure white, high-contrast, compact pill with smooth spring hover elevation and subtle halo.

### E. Micro-Interactions & Organic Motion System
- **Continuous Living Breathing Motion**: Non-looping, continuous harmonic state where the silhouette evolves unpredictably and smoothly at 60 FPS.
- **Perspective Parallax Tilt**: Pointer movement produces subtle 3D rotational tilt (`perspective(1000px) rotateX(...) rotateY(...)`) and differential multi-plane translation across the typography, sculpture, and floating HUDs.

---

## 4. WHAT WILL BE PRESERVED

- **100% Backend & API Integrity**:
  - Express server, Prisma ORM, PostgreSQL database, JWT authentication, and RBAC middleware.
  - Event creation, track management, team matchmaking, submissions, file uploads, real-time SSE broadcasts, in-app notifications, community voting, rubric scoring, judge assignments, and Z-Score normalization engines.
- **Offline-First & Zero-CDN Mandate**:
  - Pure local execution without any external fonts, CDN scripts, or remote API dependencies.
  - High-performance, GPU-accelerated standard web APIs (HTML5 Canvas 2D / WebGL / CSS GPU transforms).
- **All 21 Backend Test Suites**:
  - Complete regression-free preservation of all 200 unit and integration tests.

---

## 5. STEP-BY-STEP RECONSTRUCTION BLUEPRINT

```
Step 1: Sculptural Living Core Engine
  └─ Build procedural 3D-like organic deformation engine with Fresnel rim lighting, dynamic curvature creases, and specular highlight physics.

Step 2: Floating Spatial HUD Components
  └─ Build ultra-clean, frosted spatial HUD capsules with optical depth differentials and independent spring physics.

Step 3: Unified Hero Environmental Composition
  └─ Reassemble the Hero container with unified depth layers, editorial typography, and 3D perspective parallax.

Step 4: Minimal Nav & Atmosphere Integration
  └─ Align top navigation and surrounding page transitions to the unified visual design language.

Step 5: Visual Verification & Polish Review
  └─ Test at 60 FPS across desktop and responsive viewports against every criteria in Dogfood_Design_Reference.md.
```

---

**Status:** Plan complete. Execution paused awaiting user confirmation.
