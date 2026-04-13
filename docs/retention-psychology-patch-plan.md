# Orbit Sync retention psychology patch plan (surgical)

This plan is intentionally **small and low-risk**. It keeps the current core loop (tap timing, hit tiers, stage progression) and only strengthens underpowered retention surfaces already in the code.

## 1) Results screen as an ego-and-information machine

### Files involved
- `js/core/loop.js`
- `index.html`
- `css/styles.css`
- `js/ui/share.js`

### What already exists
- The fail overlay already shows generated identity titles (`generateTitle(...)`) and PB blocks/banners. 
- The overlay already has a run coin block, close-miss banner, retry/revive/share/menu actions, and compact styling.
- Share card generation already uses the title system and can include a clean-run line.

### What is underpowered
- `generateTitle(...)` currently receives `personalBest.world` at fail time instead of the run's current world, which can mislabel identity value and reduce trust in the title.
- The subtitle is generic (`"Tap to sync again"`) rather than a concise skill diagnosis (`too early/too late`, close margin, next short goal).
- Share card stats pull `personalBest` values for streak/world rather than the current run context, reducing social meaning from *this* run.

### Safest implementation path
- Keep the current overlay layout and title logic structure.
- Pass **current run world** into `generateTitle(...)` where the fail title is generated.
- Add one short dynamic subtitle line using existing fail context (`failEdgeDistance`, `streakBeforeFail`) without introducing new RNG or hidden scoring.
- On share card, keep format but switch to run-local streak/world fields if available.

### Copy-paste patch instructions (small chunks)

#### Chunk A — truthful run-world title input (`js/core/loop.js`)
1. In `handleFail(...)`, near `ui.title.innerText = generateTitle(...)`, add:
```js
const currentRunWorld = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
```
2. Replace:
```js
ui.title.innerText = generateTitle(score, personalBest.world, streakBeforeFail, reviveCount);
```
with:
```js
ui.title.innerText = generateTitle(score, currentRunWorld, streakBeforeFail, reviveCount);
```

#### Chunk B — skill-forward subtitle (`js/core/loop.js`)
Inside the same fail-overlay branch, replace static subtitle assignment with:
```js
const missHint = Number.isFinite(failEdgeDistance)
  ? (failEdgeDistance < 0.04 ? 'Ultra close.' : (failEdgeDistance < 0.08 ? 'Close miss.' : 'Reset and re-time.'))
  : 'Reset and re-time.';
const quickGoal = streakBeforeFail >= 8 ? 'Goal: rebuild to 5 streak.' : 'Goal: 3 clean hits.';
ui.subtitle.innerText = `${missHint} ${quickGoal}`;
```

#### Chunk C — share card uses current run identity (`js/ui/share.js`)
Near the stats block in `generateShareCard()`, compute:
```js
const currentRunWorld = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
const runTitle = generateTitle(score, currentRunWorld, runBestStreak || streak, reviveCount);
```
Then use `runTitle` everywhere title text is used and update stats array values:
```js
{ label: 'BEST STREAK', value: runBestStreak || streak },
{ label: 'WORLD', value: currentRunWorld },
```

### Clarity/fairness/readability risk flags
- **Low risk** if subtitle stays short and non-judgmental.
- Avoid adding too many lines or gamer slang in subtitle (readability for younger players).

---

## 2) Retry friction reduction

### Files involved
- `js/core/loop.js`
- `index.html`

### What already exists
- `Retry` button immediately calls `restartFromCheckpoint()`.
- `ONE MORE TRY` revive path exists and preserves run currency state.

### What is underpowered
- The default CTA label is generic (`Retry`) while the more emotionally direct `ONE MORE TRY` is gated behind a separate button.
- No keyboard quick-retry on overlay (desktop friction remains).

### Safest implementation path
- Keep both revive/economy buttons exactly as-is.
- Make primary CTA text/action explicit and immediate (`SYNC AGAIN`).
- Add an Enter/Space quick-retry binding only while game-over overlay is visible.

### Copy-paste patch instructions (small chunks)

#### Chunk A — rename primary retry CTA (`js/core/loop.js` + `index.html`)
- In fail overlay setup, change `ui.btn.innerText = "Retry";` to:
```js
ui.btn.innerText = "SYNC AGAIN";
```
- In `index.html`, update initial button text to match:
```html
<button id="actionBtn" class="btn btn-play primary" ...>SYNC AGAIN</button>
```

#### Chunk B — keyboard fast retry (`js/core/loop.js`)
Add once near other listeners:
```js
window.addEventListener('keydown', (e) => {
  const overlayVisible = ui.overlay && ui.overlay.style.display === 'flex';
  if (!overlayVisible || isPlaying) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    restartFromCheckpoint();
  }
});
```

### Clarity/fairness/readability risk flags
- **Low risk** if keyboard shortcut is limited to overlay-visible state.
- Do not override gameplay-spacebar input while run is active.

---

## 3) Multiplier escalation using current VFX/audio systems

### Files involved
- `js/systems/scoring.js`
- `js/entities/effects.js`
- `css/styles.css`

### What already exists
- Multiplier color/scale pulse exists.
- Milestone popups at x4/x6/x8 exist.
- Intensity classes (`intensity-2`, `intensity-3`) already pulse background.

### What is underpowered
- x2/x3/x5/x7 transitions feel mostly numeric; visible state shift is concentrated late.
- Intensity 1 currently relies mainly on variable `--pulse` but lacks explicit class styling.

### Safest implementation path
- Keep existing thresholds and cap (8x).
- Add **small** milestone feedback at x3/x5/x7 using existing popup/shockwave/audio helpers.
- Add a subtle `body.intensity-1` style so multiplier escalation starts feeling physical earlier.

### Copy-paste patch instructions (small chunks)

#### Chunk A — add mid-tier milestone cue (`js/systems/scoring.js`)
After existing milestone checks, add:
```js
if (didChange && (multiplier === 3 || multiplier === 5 || multiplier === 7)) {
  createPopup(centerObj.x, centerObj.y - orbitRadius - 12, `RISING x${multiplier}`, mColor);
  createShockwave(mColor, 32);
}
```

#### Chunk B — early intensity style (`css/styles.css`)
Add before `body.intensity-2`:
```css
body.intensity-1 { animation: bgPulse 2.2s infinite; }
```

#### Chunk C — preserve readability of multiplier widget (`css/styles.css`)
Add:
```css
body.intensity-3 #bigMultiplier { filter: saturate(1.2) brightness(1.06); }
```

### Clarity/fairness/readability risk flags
- **Medium risk** if effects become too noisy and hide timing readability.
- Keep any new flashes short (<120ms) and avoid changing target geometry/contrast.

---

## 4) Coin economy tuning for short-term motivation

### Files involved
- `js/core/loop.js`

### What already exists
- Per-hit run currency scales with hit quality and multiplier.
- Streak grants at 10/20/30 give immediate coin injections.
- World clear tally banks coins with celebration pacing.

### What is underpowered
- Early horizon from 0→first reward can feel long for weaker players.
- Streak thresholds skip beginner-friendly micro-goals (e.g., 3 or 5 streak).

### Safest implementation path
- Keep existing 10/20/30 milestones unchanged.
- Add tiny micro-rewards at 3 and 5 streak only (+1, +2) to create near-term goals without inflating economy.

### Copy-paste patch instructions (small chunks)

#### Chunk A — add short-horizon streak rewards (`js/core/loop.js`)
In the streak reward block, prepend:
```js
if (streak === 3) globalCoins += 1;
if (streak === 5) globalCoins += 2;
```
Leave existing `10/20/30` rewards as-is.

#### Chunk B — reinforce achievement visibility (`js/core/loop.js`)
Inside `if (streak % 5 === 0) { ... }`, add a compact popup:
```js
createPopup(streakPt.x, streakPt.y - 28, `STREAK ${streak}`, '#ffd54a');
```

### Clarity/fairness/readability risk flags
- **Low risk** if values stay tiny.
- Avoid larger passive drip that could devalue precision skill.

---

## 5) Safe social/share improvements using existing title/share system

### Files involved
- `js/ui/share.js`
- `js/core/loop.js`

### What already exists
- Share uses native share sheet or file download fallback.
- Title string is already integrated into share text.

### What is underpowered
- Share payload centers on score and revives, while title identity is not foregrounded enough.
- Share copy doesn’t include an immediate challenge horizon (e.g., beat this run this session).

### Safest implementation path
- Keep current image generation and fallback flows.
- Shift share text to identity-first wording using current run title and compact challenge line.

### Copy-paste patch instructions (small chunks)

#### Chunk A — identity-first share copy (`js/ui/share.js`)
Replace current `navigator.share({ text: ... })` text with:
```js
text: `Title unlocked: "${runTitle}". Score ${score}, streak ${runBestStreak || streak}, world ${currentRunWorld}. Beat this run?`,
```

#### Chunk B — consistent naming in card footer (`js/ui/share.js`)
Replace footer text:
```js
c.fillText('CAN YOU BEAT THIS?', 760, 415);
```
with:
```js
c.fillText('BEAT THIS TITLE RUN?', 760, 415);
```

### Clarity/fairness/readability risk flags
- **Low risk** if copy avoids shame/comparison language.
- Keep claims factual (title/score/streak/world from actual run state only).

---

## Explicit “do not do” guardrails (to preserve fairness + clarity)

- Do **not** alter hit windows, NEAR_MISS threshold, or miss detection math to force fake suspense.
- Do **not** add random bonus multipliers; preserve deterministic skill-reward mapping.
- Do **not** hide retry behind coin prompts; free retry must remain one-tap.
- Do **not** replace plain-language feedback (`TOO EARLY`, `TOO LATE`) with ambiguous hype text.
