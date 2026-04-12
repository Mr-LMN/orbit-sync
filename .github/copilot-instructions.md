# Orbit Sync – AI Coding Agent Instructions

## Architecture Overview

**Orbit Sync** is a web-based rhythm game with a modular architecture centered on a single game loop. The codebase uses an `OG` (OrbitGame) global namespace with domain-specific sub-modules.

### Core Structure
- **`js/core/`** – Boot, state, storage, input, loop management
- **`js/entities/`** – Targets, bosses, particles, effects with type-based renderers
- **`js/systems/`** – Collision, rendering, scoring, spawning, progression, challenges, tutorial
- **`js/ui/`** – DOM references, menus, shop, settings, HUD
- **`js/audio/`** – Audio synthesis (Web Audio API), music, haptics
- **`js/data/`** – Campaign metadata, world definitions

### Data Flow
1. **Initialization** (`boot.js`) → Campaign data loaded, input bound, main loop started
2. **Game State** (`state.js`, `storage.js`) → Centralized player/run state with integrity-checked localStorage
3. **Main Loop** (`loop.js`) → Frame pump that calls collision, rendering, progression
4. **Entity Spawning** → Targets created from campaign config, collision tests, visual rendering
5. **UI Updates** → DOM cached in `ui` object, minimal reflows via `display` toggles

---

## Project-Specific Conventions

### Module Pattern
Every JS file uses IIFE wrapper with `OG` namespace assignment:
```javascript
(function moduleName(window) {
  const OG = window.OrbitGame;
  OG.moduleName = { /* exports */ };
})(window);
```
**Why**: Avoids global pollution; each module is self-contained and explicit about dependencies on the `OG` object.

### State Access
- **Runtime state** → `OG.state.player`, `OG.state.arrays` (targets, particles, effects)
- **Persistent state** → `OG.storage.getItem()`, `OG.storage.setItem()` (encodes + signs with HMAC)
- **Legacy globals** → `levelData`, `hardModeActive`, `globalCoins` (used inline in `loop.js`)

### Conditional Subsystem Activation
Check subsystems before calling:
```javascript
if (OG.systems && OG.systems.phoenixBossV2 && OG.systems.phoenixBossV2.isActive()) {
  OG.systems.phoenixBossV2.stop();
}
```
**Why**: Subsystems are optional; some feature flags and experimental systems load conditionally.

### Campaign as Configuration
Campaign data in `js/data/campaign.js` is a flat array of stage objects with properties:
- `id` (e.g., `'1-2'`), `title`, `hitsNeeded`, `speed`, `targets`, `moveSpeed`, `reverse`
- Optional: `boss`, `mechanics` (e.g., `['echo', 'split']`), `shrink`, `pulse`, `isFrenzy`

**Pattern**: Don't hardcode stage behavior; read from campaign config. New difficulty mechanics should be added as a property here first.

---

## Critical Integration Points

### Event Hooks in Main Loop (`loop.js`)
The main loop is large (5755 lines) with injected hooks:
- **`loadLevel(idx)`** – Triggered when starting a stage; tutorial system hooks here
- **`returnToMenu()`** – Cleanup and UI reset on menu return
- **`onTargetHit(hit, target, isPerfect)`** – Hit scoring logic
- **`onMiss()`** – Life loss and UI updates

**Gotcha**: Audio effects are called directly; always check `audioCtx` is initialized before calling sound functions.

### Collision System (`js/systems/collision.js`)
Angular-based hit detection:
- `signedAngularDistance(from, to)` – Normalize angle differences to [-π, π]
- `getTargetApproachIntensity(target, playerAngle, playerDirection)` – Returns [0, 1] confidence of hit

**Why**: The orb travels around a circular ring; collision is purely angular.

### Rendering System (`js/systems/rendering.js`)
Canvas rendering with shape support:
- `getPointOnShape(t, shape, cx, cy, radius)` – Returns {x, y} on ring perimeter (circle, square, diamond, triangle)
- Supports **shrinking targets** via lerp on spawn distance
- All visual updates go through canvas context (`ctx`), never DOM elements during gameplay

---

## Common Workflows

### Adding a New World Mechanic
1. Add stage entries to `campaign.js` with new `mechanics` property
2. In spawning logic (`js/systems/spawning.js`), check `levelData.mechanics` array
3. Create target definitions in `js/entities/target-definitions.js` if new type needed
4. Add rendering handler in `js/systems/rendering.js` if visual difference
5. Write collision logic in `js/systems/collision.js` if hit-detection differs

**Example**: The `echo` mechanic reads `levelData.mechanics.includes('echo')` and spawns "ghost" targets with delayed activation.

### Adding a Boss
1. Define in campaign: `{ id: '1-6', boss: 'aegis', hitsNeeded: 99, ... }`
2. Create boss module in `js/entities/` or `js/systems/`
3. In main loop, check `if (levelData.boss === 'aegis')` and call boss logic
4. Boss modules implement: `activate()`, `update(frameTime)`, `isDefeated()`, `stop()`

**Current Bosses**: `aegis`, `prism`, `corruptor`; experimental `phoenixBossV2` in `js/systems/experimental/`.

### Modifying Audio
All audio delegated to `js/audio/` modules:
- `playTone(freq, type, vol, attack, decay)` – Synth tones
- `startDynamicMusic(baseTrackPath)` – Music system with multiplier-based intensity
- `vibrate(pattern)` – Haptic feedback via Vibration API

**Pattern**: Don't add new audio calls directly in `loop.js`; add to `js/audio/audio-core.js`, then expose wrapper in `loop.js`.

### Updating UI
DOM references cached at load in `js/ui/dom.js`:
```javascript
ui.score = document.getElementById('scoreDisplay');
ui.combo = document.getElementById('comboDisplay');
// etc.
```

Updates use `.innerHTML`, `.innerText`, or `.style` directly. No React/Vue; keep it bare-DOM for minimal payload.

---

## Testing & Debugging

### Test Infrastructure
- **Unit tests**: `tests/storage.test.js`, `tests/utils.test.js` (manual; run in browser)
- **Verification scripts**: `verify_frontend.py`, `verify_fail_menu.py` (Selenium-based UI tests)
- **Benchmark**: `benchmark_loop.js`, `benchmark_dom.js` (profiling frame rate, render cost)

### Local Server
```bash
bash start_server.sh
# Runs: python3 -m http.server 3000
```
Access at `http://localhost:3000`

### Common Debug Points
- **Storage corrupted?** Check `OG.storage.getItem()` returns correct value; HMAC signature may be stale
- **Target not rendering?** Ensure target is in `OG.state.arrays.targets`; check `active` flag
- **No audio?** Verify `audioCtx` is initialized in `initAudio()`; check audio throttling logic
- **Tutorial stuck?** Check `orbitSync_masterTutorial_v2` storage key; phases are enum-based, not indices

---

## Known Gotchas & Patterns

1. **Window globals are legacy** – `levelData`, `score`, `currentWorld` stored as window globals for fast access; prefer `OG.state` for new code
2. **Audio throttling** – Multiple sound calls in one frame are coalesced; check `shouldThrottleAudio()` for SFX spam
3. **Boss UI cleanup** – Phoenix boss leaves UI elements visible; always check `phoenixBossV2.isActive()` and call `.stop()` on level exit
4. **Hard mode toggle** – `hardModeActive` flag gates alternate difficulty; check before spawning challenges
5. **Skins vs. Augments** – Skins are cosmetic (visual renderer); augments are gameplay modifiers (progression system)

---

## File Reference for Key Patterns

| File | Pattern | Use When |
|------|---------|----------|
| `js/data/campaign.js` | Stage definitions | Adding levels, mechanics, bosses |
| `js/core/loop.js` | Main frame pump | Game logic, hook injection, audio/UI updates |
| `js/systems/collision.js` | Hit detection | Angular geometry, target approach logic |
| `js/systems/rendering.js` | Canvas draw | Shape rendering, visual effects |
| `js/systems/tutorial.js` | Onboarding state machine | New tutorial phases, overlay text |
| `js/entities/boss.js` | Boss interface | Boss behavior, phases, health |
| `js/core/storage.js` | Save system | Persistence, data integrity |
| `js/audio/audio-core.js` | Sound synthesis | New SFX or music features |

---

## Recent Project Direction

- **Modularization**: Extract boss logic from `loop.js` into `js/systems/`; keep `loop.js` as frame pump only
- **Tutorial expansion**: Add more phases (Perk intro, Sphere evolution), theme-aware overlays
- **Performance**: Profile added UI checks (`if (OG.systems && ...)`) to ensure negligible impact
- **Testing**: Move UI verification to automated unit tests vs. Selenium scripts

