# Orbit Sync – Recent Changes & Roadmap

## 📦 What we’ve done

### 1️⃣ Phoenix V2 Event Boss fixes
- **Speed reduction** – lowered the initial `EMBER` phase speed from `0.010` → `0.007`.
- **Core size** – shrunk the visual core from `160px` to `80px` so it no longer overflows the arena.
- **UI cleanup** – added code to hide all Phoenix UI elements (`#phoenixGameUI`, `#phoenixTimer`, `#phoenixPhaseName`, `#phoenixMult`, `#phoenixLives`, `#phoenixCoreObjV2`) when leaving the boss or loading a normal world.

```js
// js/systems/experimental/phoenix-boss-v2.js (snippet)
{ name: 'EMBER', threshold: 0, speed: 0.007, ... }
// core size reduction
_coreEl.style.cssText = `
  width: 80px; height: 80px; ...`;
```

### 2️⃣ Campaign world‑preview bug fix
- The preview canvas was reading a stale palette property (`color1`).
- Updated to use `currentWorldPalette.primary` (fallback to `color1`).

```js
// js/ui/menus.js (snippet)
const shapeColor = currentWorldPalette.primary || currentWorldPalette.color1 || '#00ff88';
```

### 3️⃣ World 3 difficulty rebalance
- Reduced `hitsNeeded` for stages 3‑2 → 3‑6 to make early‑game progression smoother.

```js
// js/data/campaign.js (snippet)
{ id: '3-2', title: 'Echo Field', hitsNeeded: 3, ... }
{ id: '3-3', title: 'Split Field', hitsNeeded: 4, ... }
{ id: '3-4', title: 'Echo Drift', hitsNeeded: 4, ... }
{ id: '3-5', title: 'Cross Signal', hitsNeeded: 5, ... }
{ id: '3-6', title: 'Resonance Core', hitsNeeded: 8, ... }
```

### 4️⃣ Freeze‑frame Master Tutorial
- **Overlay UI** – added a full‑screen modal (`#tutorialOverlay`) with title, description, and confirm button.
- **State system** – persisted `orbitSync_masterTutorial` (0‑6) in storage.
- **Hooks** – injected calls into `loadLevel` (core loop) and `returnToMenu` to trigger tutorial steps and forced routing to Shop/Workshop.
- **Tutorial logic** – shows contextual messages for Worlds 1‑3, Hard‑Mode intro, Shop purchase, and Workshop perk equip.

```js
// js/systems/tutorial.js (excerpt)
function showFreezeFrame(title, desc, btn, onDone) { /* pause timeScale, show overlay */ }
function handleLevelStart(id) { /* switch on id and call showFreezeFrame */ }
function checkMenuRouting() { /* force tab change after certain phases */ }
```

```js
// js/core/loop.js – loadLevel hook
levelData = campaign[idx];
if (OG.systems && OG.systems.phoenixBossV2 && OG.systems.phoenixBossV2.isActive()) {
  OG.systems.phoenixBossV2.stop();
}
// hide lingering UI …
```

```js
// js/core/loop.js – returnToMenu UI cleanup
if (OG.systems && OG.systems.phoenixBossV2 && OG.systems.phoenixBossV2.isActive()) {
  OG.systems.phoenixBossV2.stop();
}
// hide all Phoenix UI elements
```

## 🚀 Next steps & direction
1. **Modularise core loop** – extract boss‑specific logic (Phoenix, other bosses) into their own modules to keep `loop.js` lean.
2. **Expand tutorial** – add more phases (e.g., Perk system intro, Sphere evolution) and make the overlay theme‑aware.
3. **Polish UI/UX** – introduce glass‑morphism styling for the tutorial overlay, add subtle micro‑animations for button presses.
4. **Performance audit** – run profiling to ensure the added UI checks (`if (OG.systems && ...)`) have negligible impact.
5. **Automated tests** – write unit tests for the tutorial state machine and for the world‑preview rendering function.

## 📂 File map of recent changes
- `js/systems/experimental/phoenix-boss-v2.js` – speed & core size tweaks.
- `js/ui/menus.js` – world preview color fix.
- `js/data/campaign.js` – World 3 hit‑count rebalance.
- `js/systems/tutorial.js` – new tutorial system.
- `js/core/loop.js` – loadLevel & returnToMenu hooks, UI cleanup.
- `index.html` – tutorial overlay HTML injection.

---

*This README is intended for collaborators using Claude, Jules, Codex, etc., to quickly understand the current state and where the project is headed.*
