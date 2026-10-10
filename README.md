# Orbit Sync — The Hunt

One game: **tap to collect → hold to aim → release to attack and switch orbits**. The default page is now a standalone nine-hunt campaign. It loads eight scripts instead of the archived game's entire runtime and UI. No external fonts, audio downloads or build step are required.

- Stage one teaches one mechanic at a time: cyan energy, gold energy, purple repair, an explicitly labelled enemy and a safe dodge. Only the relevant pickup/ring/HUD is visible. It then continues directly into the first real campaign fight. Teaching has no timer or failure penalty and can be replayed from How to Play.
- Three enemy families keep the same controls: Hunters reverse at half hull, Sentinels alternate shields and openings every 2.5 seconds, and Wraiths reverse every four seconds. Each has three encounters, increasing hull and pressure. Shield status and reversal countdowns are visible in the HUD.
- Clear a hunt to unlock the next. Three medals reward a clear, the displayed time target, and at least 70% launch accuracy with three hull remaining. Best medal totals and fastest clear times persist. Replays cannot farm duplicate medals.
- Earn Solar, Nebula and Nova trails at 6, 15 and 24 medals. Equip them in Campaign; they do not change combat stats. Results show the next hunt, objective outcomes and rewards.
- Original synthesized music builds as the enemy loses hull. Separate music, effects, vibration, reduced-motion and battery-saver controls persist. Audio stops on pause, backgrounding and menus; battery saver caps rendering at 30 Hz. Visual effects have bounded particle counts.

Progress uses `orbitSync_hunt_campaign_v2`. Existing hunt best score/run/win totals migrate once when this profile is first saved; old records and campaign saves are untouched. Active fights do not survive reload. Saves are local to this browser; clearing site data clears progress. When browser storage is blocked, results explain the session-only fallback.

## Showcase and friends challenge

The home screen now keeps the campaign, customization and a pass-and-play challenge within reach. Brighter impact rings, a visible aim marker and distinct launch/pickup/hit sounds reinforce the existing controls. The original synth soundtrack adds percussion as the hunt intensifies. Master volume persists; sound stops immediately on pause and menus. Battery saver removes HUD blur and limits visual effects.

**Challenge Friends** uses one seeded Hunter encounter. Save a name and result on this device, pass the phone around, or share a `?challenge=0000cafe` link for the same initial layout on another phone. Winning scores reward time, accuracy and surviving hull. Training resets before the scored fight, so first-time and returning players get identical initial combat states. Challenge runs never award campaign medals. The board is local to each browser, with up to ten entries per seed; it is not an online leaderboard or verified competition.

## First campaign onboarding

Players who have not completed this version of onboarding are offered stage one first, without losing any earned campaign progress or cosmetics. The five introductory actions require real input. Practice hits, time and score reset before the actual fight and cannot earn medals. Clearing that fight awards normal progression; even a one-medal clear now unlocks the Prism frame. Existing unlock thresholds are otherwise unchanged.

Music, combat effects, vibration and all cosmetic options are retained. A home-screen Sound toggle restores both music and effects on request; Settings retains separate switches and adds a short Test Sound control. Browser audio still requires an input gesture and audible device volume.

## Clear colour controls

The arena uses one changing action prompt instead of simultaneous legends and centre instructions. Hull and energy are labelled explicitly; score remains on results. The Colour Guide explains white player, cyan/gold energy arcs, purple repair arcs, red danger arcs, enemy triangles, green/orange/grey aim lines, the gold charge window, white enemy shields and faded pickups. The first campaign starts directly with a single cyan pickup; the full guide stays optional; the in-fight button freezes the timer and resumes the same encounter. Brief hit/pickup/miss feedback shares the instruction slot.

## Guided mastery and customization

- Every unseen stage opens a field guide with the enemy highlighted in the frozen arena. First incoming strikes, Hunter reversals, Sentinel openings, Wraith reversals and low-hull repairs get contextual explanations. Coaching waits until a hold or flight finishes before interrupting. Seen explanations persist in the existing profile.
- Dismiss a coach to resume with the timer unchanged. Automatic guidance can be disabled from a coach or Settings. The pause menu can reopen the current enemy briefing at any time during a normal hunt. Core practice remains replayable through How to Play.
- Tutorial pickup, enemy and danger-arc highlights use white outlines and labels; animation and colour are not their only cues. Portrait and landscape coaching reserve separate space for the arena and instructions. Dialog controls trap keyboard focus.
- Customize offers four colours, three frames and three trail styles, independently combinable. Locked rewards can be previewed without equipping them. Prism unlocks at 1 medal (the first campaign clear), Stardust at 9, Comet at 12 and Ribbon at 18, in addition to the existing colour rewards. All appearance choices preserve combat geometry and stats. A white player centre remains visible with every loadout.
- Save migration validates new appearance and guidance fields. Existing progress stays intact; unavailable storage uses the existing session fallback. Previewing and cancelling do not alter the equipped look.

## Validation and playtesting

Run `node --test tests/*.test.js` and `node tests/focused-browser.cjs`. The browser suite uses Playwright; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for a custom Chromium path and `FOCUSED_SCREENSHOTS` to capture screens. Model tests play all nine hunts through normal controls at 30, 60 and 144 Hz. Browser checks cover real tutorial input, held launches, pause, unlocks, save reload, settings, keyboard and phone layouts. Result fixtures accelerate UI checks; model win tests do not edit combat state.

This patch creates a coherent progression loop; it does not establish commercial readiness or prove retention. Before expanding content, watch new players complete the tutorial and first three hunts. Measure tutorial completion, first-hunt wins, retries after losses, medals chased and next-day voluntary returns. Tune early difficulty from those observations. Test sound latency, touch responsiveness and battery use on physical iOS and Android devices. No analytics or network tracking is added.

## Jules findings

The screenshot's storage warning was already fixed on main: the fallback map has a null prototype and reads use `Object.prototype.hasOwnProperty.call`. The new default runtime uses namespaced audio and does not load legacy audio aliases. The archive retains its compatibility layer because its older callers still need it. The other 26 findings were not included in the screenshot and have not been claimed as reviewed.

## Archived game

`legacy.html` retains the previous hub and modes for old saves and regression checks. It is not linked from the current campaign. Earlier browser suites explicitly target that archive. The sections below describe those older systems.

## Orbit Breaker prototype

Open **Orbit Breaker · Prototype** on the home hub. This is a separate 90-second action experiment: two connected orbits and a moving Hunter with 24 hull.

- Tap cyan safe arcs for 18 energy or narrower gold precision arcs for 32. Let unwanted targets pass. Purple repairs restore one hull but reset your chain; empty taps cost 6 energy. The orbit you occupy has brighter targets.
- Hold anywhere in the arena (or hold Space) to brake and aim. Release with at least 40 energy to launch to the other orbit. The aim line turns mint when the Hunter is aligned for impact. A release in the gold charge window (0.65–1.05 seconds) deals 5 damage; other launches deal 3.
- Dodge telegraphed red strikes by braking or switching orbits. The Hunter reverses direction and attacks more often below half hull.
- At half damage or 45 seconds, choose **Echo** (a delayed repeat of your shot for 2 damage if it connects) or **Slingshot** (dodging grants 20 energy and +2 damage on the next launch). Choice and pause screens stop the timer.
- Retry directly from results. Local records use `orbitSync_breaker_v1`, separate from campaign and Expedition. Active runs do not survive reload. Returning to the hub abandons the run.

This is a playtesting prototype, not a campaign replacement or a claim that retention has improved. It needs human feedback on the decisions and controls. Model tests cover complete wins with both upgrades at 30/60/144 Hz. `node tests/breaker-browser.cjs` checks touch/hold, hit damage, cancellation, pause/visibility/rotation, upgrades, retry, local records and keyboard input. Set `BREAKER_SCREENSHOTS=/path/to/folder` to capture screens. Browser tests accelerate setup/results with controlled model state; model win tests play through normal movement and input.

## Campaign clarity refresh

- Home cards keep their natural height and scroll on small screens; campaign and Expedition buttons no longer overlap.
- Low health no longer dims or flashes the arena or paints a red pulse over the target rail. The lives badge carries the warning.
- Active targets have a dark outline, bright body and visible timing boundaries, including mobile rendering. Dual targets outline only their remaining halves; decoy, echo and timed Phoenix cues retain their mechanics.
- Stage/wave information sits outside the arena; combo and multiplier readouts are compact. The boost screen has readable cards and owns its overlay layer.
- Timing feedback is always shown on phones, replacing the previous timing popup instead of accumulating text.

Run `node tests/clarity-browser.cjs` for compact/landscape home layout, six low-life stage renders, and boost overlay checks. Set `CLARITY_SCREENSHOTS=/path/to/folder` to capture the views. These are browser checks, not a physical-device performance benchmark.

## Orbital Expedition

Open **Orbital Expedition** from the home hub. Choose Anchor (forgiving), Prism (precision rewards), or Pulse (streak-driven speed and score), then clear three sectors and defeat the Gatekeeper. Between sectors choose a free upgrade and a steady or volatile route.

- Tap targets, hold-and-release arcs, numbered links, and gold precision targets.
- Perfect hits charge a seven-second Overdrive with double hit scores; upgrades can change charge rate and duration.
- The Guardian telegraphs hold, link, and precision shield patterns before exposing its core.
- Practice mechanics unlock as you reach their sector. Practice has unlimited lives and does not update run records.
- Results show hit rate, perfects, streak, Overdrives and timing bias. Personal records use a separate save key; campaign progress is unaffected.
- Tap/hold the arena or use Space. Escape, app switching, and resizing pause active runs. Interrupted holds restart without a penalty. Active runs are held in memory; reloading the page ends the current run.

The new engine is independent of the campaign loop and uses small simulation steps. Run `node --test tests/*.test.js` for model regression tests and `node tests/expedition-browser.cjs` for the Playwright touch, hold, full boss-run, upgrade, practice and persistence checks. The browser setup instructions below also apply. `EXPEDITION_SCREENSHOTS=/path/to/folder` optionally captures mobile and landscape screenshots.

## Stability and performance refresh

- Refresh-rate-independent movement and feedback animation, including 120/144/240 Hz displays.
- Pointer input ignores nested buttons, menus and secondary touches.
- Explicit resume, app-switch auto-pause, pause timer race fixes and rotation handling.
- GPU-friendly canvas rendering; cached ambient lighting and vignette without skipped-frame flicker.
- Cached sphere progression reads, invalidated by saves and cross-tab storage changes.
- Existing saves remain readable; Unicode saves and storage-quota fallback are covered by tests.
- Daily login gifts no longer skip onboarding; new runs start from the Start button.
- Named navigation destinations, SVG icons, clearer settings, reduced motion and battery-saver graphics.
  The five toolbar icons now total 1,306 bytes instead of 4,400,817 bytes. Original PNGs are retained for compatibility but no longer requested by the page.

## Run and test

Serve the repository using `python3 -m http.server 3000`, then open `http://localhost:3000`.

Unit tests (Node 22+; no dependencies):

```sh
node --test tests/*.test.js
```

Browser regression checks (Playwright/Chromium):

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser-smoke.cjs
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium installation. The browser test starts and stops its own local server. It checks mobile input, scoring, settings persistence, pause races, visibility, rotation, 30 regular campaign stage loads/renders, Phoenix pause/cleanup, and desktop keyboard play. Stage smoke tests are not full campaign playthroughs; real-device frame rates and late-game balance still need hands-on testing.

---

## Earlier changes and roadmap

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
