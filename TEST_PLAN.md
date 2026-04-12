# Test Plan - Bug Fix Validation

## Environment Setup
- Server: `http://localhost:3000`
- Browser: Chrome/Edge (for best DevTools support)
- Cache: Clear or use Incognito/Private mode

---

## Test Case 1: World 1 Free Restart (Once Per Level)

**Objective:** Verify free restart triggers exactly once per World 1 level

### Setup
1. Fresh game or cleared progression
2. Start level 1-1

### Execution
```
Step 1: Get intentionally close to failure
  - Play normally, let health drain to 1 life
  
Step 2: Take final hit to trigger failure
  - Action: Get hit when lives = 1
  - Expected: No fail screen, level resets with full lives
  - Verify: Lives counter shows full health
  
Step 3: Verify fail screen on next failure
  - Action: Play and fail again in same level
  - Expected: Fail screen appears with options (Bank, Revive, Restart, Menu)
  - Verify: Screen shows "You Failed" header and action buttons
  
Step 4: Verify free restart resets for next level
  - Action: Complete level 1-1, move to level 1-2
  - Action: Fail on 1-2
  - Expected: Free restart triggers on 1-2
  - Verify: Level resets without fail screen
```

### Success Criteria
- ✓ First failure in level: Auto-restart (no fail screen)
- ✓ Second failure in level: Fail screen appears
- ✓ New level: Free restart available again
- ✓ World 2+: No free restart, fail screen always shows

---

## Test Case 2: Fail Screen Appears in World 2+

**Objective:** Verify fail screen always shows in World 2 and beyond

### Setup
1. Progress to World 2 (complete World 1)
2. Start any level in World 2+

### Execution
```
Step 1: Fail on first attempt
  - Action: Get hit when lives = 1
  - Expected: Fail screen appears immediately
  - Verify: "You Failed" message visible, action buttons present
  
Step 2: Verify no auto-restart
  - Action: Watch for any automatic level reset
  - Expected: No automatic reset, manual action required
  - Verify: Must click button to proceed (Restart, Bank, Revive, Menu)
```

### Success Criteria
- ✓ Fail screen shows on every failure in World 2+
- ✓ No free restarts available
- ✓ Action buttons are functional

---

## Test Case 3: Tutorial Persistence (First Play Only)

**Objective:** Tutorial shows only on first ever play, not for returning players

### Setup A: Fresh Player
1. Clear all browser data for localhost
2. Open game fresh

### Execution A
```
Step 1: Start new game
  - Action: Click "New Game" or auto-start
  - Expected: Tutorial overlay appears on level 1-1
  - Verify: "TAP WHEN THE ORB ENTERS THE ZONE" message visible
  
Step 2: Complete tutorial sequence
  - Action: Follow tutorial prompts (tap zones, get perfect hits)
  - Expected: Tutorial progresses through phases
  - Verify: Phase counter increments (TAP → EDGE → PERFECT)
  
Step 3: Verify tutorial completion saves
  - Expected: Tutorial overlay disappears after final phase
  - Verify: message "✦ PERFECT ✦" shows then fades
```

### Setup B: Returning Player
1. Close browser tab
2. Reopen to same game

### Execution B
```
Step 1: Return to World 1
  - Action: Reopen game, click Continue or restart level 1-1
  - Expected: NO tutorial overlay
  - Verify: Level plays normally, no tutorial messages
  
Step 2: Verify no tutorial interference
  - Action: Play through level
  - Expected: Game plays as normal, no overlay interruptions
  - Verify: HUD elements visible (score, lives, multiplier)
```

### Success Criteria
- ✓ Fresh player: Tutorial shows
- ✓ Tutorial completes and saves
- ✓ Returning player: No tutorial appears
- ✓ Progression saved across sessions

---

## Test Case 4: Perfect Hit Audio (New Sounds)

**Objective:** Verify perfect hits play correct new audio

### Setup
1. Open DevTools (F12)
2. Go to Console tab
3. Start any level

### Execution
```
Step 1: Get perfect hit
  - Action: Hit a target perfectly (golden glow, "PERFECT" text)
  - Expected: Sharp rising-pitch "crack" sound plays
  - Verify: Sound is DIFFERENT from old sound
  
Step 2: Get consecutive perfects
  - Action: Get 2-3 perfect hits in succession
  - Expected: Each hit plays slightly different pitch
  - Verify: Pitch increases with each hit (soundPerfectCrack)
  
Step 3: Get filthy perfect
  - Action: Get hit at exact center of zone
  - Expected: Louder/different "crack" sound
  - Verify: Sound matches new audio system
```

### Success Criteria
- ✓ Perfect hits play new "crack" audio
- ✓ Consecutive perfects vary in pitch
- ✓ Audio is responsive and immediate
- ✓ No silence or old audio sounds

### Troubleshooting if Audio is Wrong
```
Issue: Still hearing old sound
Fix 1: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
Fix 2: Clear cache (DevTools → Application → Storage → Clear All)
Fix 3: Incognito/Private mode to bypass cache
```

---

## Test Case 5: Scoring Points System

**Objective:** Verify new point values are awarded correctly

### Setup
1. Start any level
2. Have DevTools console open to watch for point changes

### Execution
```
Step 1: Miss a target
  - Action: Fail to hit a target or hit while in red zone
  - Expected: 0 points awarded, lose multiplier
  - Verify: Score doesn't increase, multiplier resets to 1x
  
Step 2: Get OK hit
  - Action: Hit target in orange zone
  - Expected: +2 points
  - Verify: Score increases by 2
  
Step 3: Get Good hit
  - Action: Hit target in yellow zone
  - Expected: +5 points
  - Verify: Score increases by 5
  
Step 4: Get Perfect hit
  - Action: Hit target in green zone
  - Expected: +10 points, multiplier increases
  - Verify: Score increases by 10, multiplier goes up (1x→2x)
  
Step 5: Get Filthy Perfect
  - Action: Hit target at center of zone
  - Expected: +15 points, multiplier increases
  - Verify: Score increases by 15, multiplier goes up
```

### Success Criteria
- ✓ Miss = 0 pts, lose multiplier
- ✓ OK = +2 pts
- ✓ Good = +5 pts
- ✓ Perfect = +10 pts, multiplier up
- ✓ Filthy Perfect = +15 pts, multiplier up

---

## Test Case 6: Boss Core Rendering

**Objective:** Verify boss cores render correctly on boss fights

### Setup
1. Progress to level 1-6 (Aegis boss)
2. Start the boss encounter

### Execution
```
Step 1: Boss fight starts
  - Expected: Boss core graphic appears in center
  - Verify: Unique Aegis core rendering visible
  
Step 2: Get hits on boss
  - Action: Hit boss normally
  - Expected: Core visual updates, no interference
  
Step 3: Defeat or fail boss
  - Action: Complete or exit boss fight
  - Expected: Core rendering stops
  - Verify: Core disappears on level end
```

### Success Criteria
- ✓ Boss cores render correctly
- ✓ Cores activate/deactivate with boss fights
- ✓ Core visuals don't interfere with gameplay

---

## Regression Test - All Existing Features

### Scoring System
- ✓ Multiplier still increments on perfect hits
- ✓ Multiplier still resets on miss
- ✓ Score calculation matches new formula

### World Progression
- ✓ Can progress through all worlds
- ✓ Boss fights work correctly
- ✓ World mechanics still active (echo, split, etc.)

### UI Elements
- ✓ Score displays correctly
- ✓ Lives counter updates
- ✓ Multiplier shows correctly
- ✓ Fail screen has all buttons (Bank, Revive, Restart, Menu)

### Audio System
- ✓ Background music plays
- ✓ Sound effects trigger on hits
- ✓ Vibration works on perfect hits
- ✓ No audio stuttering or lag

---

## Bug Report Template (if issues found)

```
BUG REPORT:
-----------
Issue: [Describe what went wrong]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Browser: [Chrome/Firefox/Safari/Edge]
OS: [Windows/Mac/Linux]
Console Errors: [Any red errors in DevTools]
```

---

## Sign-Off

Once all tests pass:
- [ ] Test Case 1 (Free Restart) - PASS
- [ ] Test Case 2 (Fail Screen) - PASS
- [ ] Test Case 3 (Tutorial) - PASS
- [ ] Test Case 4 (Audio) - PASS
- [ ] Test Case 5 (Scoring) - PASS
- [ ] Test Case 6 (Boss Cores) - PASS
- [ ] Regression Tests - PASS

**All bugs fixed and verified:** _________________ (Date/Time)
