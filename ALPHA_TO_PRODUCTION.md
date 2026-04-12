# Orbit Sync - Production Roadmap (Alpha -> Mobile Launch)

## Executive Summary
Orbit Sync already has strong gameplay feel, clear visual identity, and multiple progression hooks. What it still needs is a production-ready meta layer: trusted persistence, competitive infrastructure, expandable live-ops, cosmetics and loot worth chasing, and the data plumbing required to tune a mobile game after launch.

This document is intentionally updated against the current codebase. Items that already exist are crossed out so the remaining roadmap stays honest.

---

## Product Principles

### 1. Mobile-first progression
- Player identity and progression must carry across installs, devices, and upgrades.
- Google and Apple sign-in should be the default account rails.
- Guest play is allowed, but the game should gently prompt players to bind progress before risk points like uninstall, prestige, or purchase.

### 2. Every system must feed "one more run"
- Core loop retention beats feature count.
- New systems should reinforce timing mastery, build experimentation, collection, rivalry, or anticipation.

### 3. Cosmetics must feel collectible, not disposable
- Cosmetic rewards should have rarity, theme, presentation, and visibility in play.
- Loot should create excitement without damaging competitive fairness.

### 4. Live service without heavy ops overhead
- Events, rewards, shop rotations, and challenge tables should be content-configurable without deep code edits.

---

## 1. Core Progress Review

### Already in place
- ~~Phoenix event structure exists~~
- ~~Campaign progression exists~~
- ~~Daily challenge system exists~~
- ~~Weekly challenge system exists~~
- ~~Login streaks and login splash exist~~
- ~~Rank / prestige-style orbit XP system exists~~
- ~~Tutorial path extends into spheres, perks, rank, and dailies~~

### Still needed
1. Phoenix event must be fully production-stable
   - Finish balance tuning
   - Remove remaining edge-case UI/render regressions
   - Confirm score fairness and event reward cadence

2. Mid-game progression pacing pass
   - Validate World 2 -> World 4 difficulty climb
   - Reduce dead zones where players stop unlocking meaningful things
   - Tie rewards more tightly to mastery, not just grind volume

3. Clear long-tail goals
   - Add visible "next chase" messaging in hub/profile
   - Examples: next rank unlock, next cosmetic drop, next event reward, next loot milestone

---

## 2. Accounts, Save Data, and Cross-Device Progression

**Why this is critical**: this is a mobile game. Progress loss destroys retention, trust, and monetization potential.

### Current state
- Local persistence exists
- ~~Some progression systems persist locally~~
- No verified cloud save
- No account identity layer
- No restore flow for purchases / progression

### Required for production
1. Account system
   - Sign in with Apple
   - Sign in with Google
   - Anonymous guest account fallback
   - Account linking flow: guest -> Apple/Google without losing progress

2. Cloud save
   - Sync campaign progress
   - Sync currencies
   - Sync owned spheres, levels, stars, perks, cosmetics
   - Sync rank / XP / challenge state / event rewards
   - Sync settings where useful

3. Conflict handling
   - Last-write-wins is not enough for a progression game
   - Need merge rules for currencies, unlocks, purchases, and consumables
   - Provide player-facing "choose device save / cloud save" recovery flow if conflict occurs

4. Recovery and restore
   - Reinstall should restore progression after sign-in
   - Device switch should be seamless
   - Purchase restore must be explicit and tested on both Apple and Google flows

5. Backend source of truth
   - Runs that affect economy, unlocks, and leaderboards should hit a trusted backend
   - Local-only progression should be treated as temporary until synced

---

## 3. Competitive Layer and Leaderboards

**Why it matters**: the game already has score-chase DNA. It needs a real destination.

### Current state
- ~~Phoenix leaderboard UI placeholder exists~~
- ~~Share card foundations exist~~
- No real persistent leaderboard backend
- No score validation
- No friend or near-rank rivalry layer

### Required next
1. Real leaderboard backend
   - Global all-time
   - Weekly event leaderboard
   - Friends leaderboard
   - "Near you" leaderboard (+/- rank band around player)

2. Score validation / anti-cheat
   - Server-validated run submission
   - Basic tamper detection
   - Rate limiting and suspicious-run flags
   - Event and leaderboard integrity rules before launch

3. Player profile upgrades
   - Best scores by world / mode
   - Event placements
   - Build snapshot
   - Cosmetic showcase

4. Async rivalry features
   - "Beat my score" challenge links
   - Rival notifications
   - Near-rank challenge surfacing in hub

---

## 4. Build Depth: Spheres, Perks, Synergies

**Why it matters**: progression exists, but the build metagame needs more discovery and more reasons to experiment.

### Current state
- ~~Sphere progression exists~~
- ~~Perk slots and passive progression exist~~
- ~~Rank perks exist~~
- Limited synergy depth
- Build diversity risk remains

### Next requirements
1. Expand perk pool
   - Add 10-15 more perks minimum
   - Split into offensive, defensive, economy, event-specialist, and combo-control roles

2. Add explicit synergy system
   - 2-piece and 3-piece perk synergies
   - Sphere + perk theme bonuses
   - Event-specific build recommendations

3. Build surfaces
   - Save named loadouts
   - Recommended loadouts per world / event
   - Quick swap from event screen

4. Prestige v2
   - Current rank system is good, but long-tail reset structure needs to become explicit
   - Add true account-wide prestige loop with cosmetic flex and evergreen rewards

---

## 5. Cosmetics, Loot, and Collection

**Why it matters**: cosmetics and loot are not optional extras here. They are one of the main reasons players return, spend, and share.

### Current state
- Some cosmetic unlock framing exists
- ~~Shop and sphere ownership systems exist~~
- No full cosmetic economy
- No proper loot reward structure
- No rare drop excitement loop

### Production goals
1. Cosmetic categories
   - Sphere skins
   - Trails
   - Impact effects
   - Aura / shell effects
   - Event badges
   - UI themes
   - Nameplates / profile frames
   - Kill / perfect / combo callout variants

2. Loot system
   - Reward capsules / chests from dailies, weeklies, events, bosses, and milestone tracks
   - Rarity tiers: Common / Rare / Epic / Legendary
   - Loot tables that include cosmetics, currencies, perk shards, upgrade materials, and event tokens

3. Duplicate handling
   - Duplicates should convert into a useful resource
   - Example: cosmetic dust, upgrade fragments, or reroll currency

4. Cosmetic visibility
   - Cosmetics must be visible in gameplay, hub, profile, and share cards
   - Event rewards should be recognizable at a glance

5. Loot presentation
   - Chest opening animation
   - New-item spotlight
   - Rarity-specific reveal treatment
   - "Recently earned" section in hub/profile

6. Fairness rules
   - Cosmetics and loot may support progression, but paid loot must not become pay-to-win
   - Competitive modes should remain skill-legible

---

## 6. Economy and Monetization

**Why it matters**: monetization should support the game, not distort it.

### Current state
- ~~Premium / no-ads style value exists~~
- ~~Coin economy exists~~
- Crystal economy is still under-realized
- No real cosmetic shop
- No battle pass
- No structured loot economy

### Recommended production stack
1. Cosmetic shop
   - Crystal-based
   - Rotating featured items
   - Permanent catalog + limited seasonal shelf

2. Loot-backed event rewards
   - Event tokens redeem into themed loot tracks
   - Keeps events distinct and collectible

3. Battle pass
   - Free + premium track
   - Cosmetics, currencies, loot capsules, profile items
   - Must be clean, readable, and not over-engineered at first release

4. Starter and returner bundles
   - New player value bundle
   - Lapsed player catch-up pack
   - Event starter pack tied to weekly mode

5. Economy safety
   - Simulate reward output before shipping
   - Prevent runaway inflation of coins / crystals / loot dust
   - Ensure premium spend feels helpful, not mandatory

---

## 7. Events and Live Ops

**Why it matters**: Phoenix is a good start, but one event does not make a live game.

### Current state
- ~~Phoenix event framework exists~~
- No reusable event calendar system
- No content operations layer
- No reward-tokenized event loop

### Required next
1. Event framework v2
   - Shared event definition schema
   - Start / end time
   - Reward pool
   - Rules modifiers
   - Leaderboard type
   - Shop tie-ins

2. Event calendar
   - Show active event
   - Show next upcoming events
   - Show countdowns
   - Show recommended loadout and reward preview

3. Rotating event set
   - Phoenix Trial
   - Eclipse Mode
   - Resonance Grind
   - Void Surge
   - At least 3 should be truly shippable before scale launch

4. Seasonal layer
   - Monthly or 6-week season
   - Shared cosmetic theme
   - Season pass
   - Seasonal badge / rank reward

5. Internal live-ops controls
   - Server-driven event activation
   - Reward tuning without app update
   - Emergency disable / rollback

---

## 8. Onboarding, Clarity, and Accessibility

**Why it matters**: mobile players churn quickly when they are confused, overloaded, or physically uncomfortable.

### Current state
- ~~Master tutorial framework exists~~
- ~~Extended tutorial phases exist~~
- Still needs stronger post-tutorial guidance
- Accessibility coverage is incomplete

### What should be added
1. Post-tutorial guidance
   - "What to do next" prompts in hub
   - Recommended goals after each unlock
   - Event nudges once the player is eligible

2. Contextual system explainers
   - Tooltip / help mode for currencies, perks, stars, event rewards, loot rarity

3. Accessibility
   - Reduced flash / reduced shake mode
   - Distinct non-color-only zone cues
   - Larger HUD option
   - Haptic intensity controls
   - Separate music / SFX / UI sound controls
   - Readability pass for smaller screens

4. Device reality checks
   - One-thumb usability on common mobile aspect ratios
   - Safe area / notch compliance
   - Resume-from-background handling

---

## 9. Retention Systems

**Why it matters**: the game needs reasons to return even when the player is not currently pushing world progression.

### Current state
- ~~Daily login streak exists~~
- ~~Daily challenge loop exists~~
- ~~Weekly challenge loop exists~~
- No comeback framework
- No real notification strategy
- No strong social retention loop

### Required next
1. Returner incentives
   - 3-day return bonus
   - 7-day comeback boost
   - 14-day welcome-back gift bundle

2. Notification strategy
   - Event ending soon
   - Daily challenge refresh
   - Reward chest ready
   - Rival beat your score
   - Rank unlock available

3. Win / mastery streaks
   - World clear streaks
   - Perfect-run streaks
   - Event streak modifiers

4. Collection retention
   - Missing-item chase display
   - Event-exclusive item tracker
   - Cosmetic set completion bonuses

---

## 10. Analytics, Crash Reporting, and Tuning

**Why it matters**: without data, balancing and retention work become guesswork.

### Current state
- No proper analytics backbone
- No crash reporting layer
- No production balance dashboard

### Required next
1. Analytics
   - Install -> tutorial start -> first clear -> first return funnel
   - Stage fail/drop-off points
   - Event participation
   - Build selection
   - Reward claims
   - Purchase conversion

2. Crash/error reporting
   - JS runtime errors
   - API failure rates
   - device / OS segmentation

3. Performance telemetry
   - FPS buckets
   - load time
   - memory pressure
   - battery-heavy effect hotspots

4. A/B testing readiness
   - Reward tuning
   - Offer pricing
   - Event copy
   - onboarding order

---

## 11. Technical Requirements for Mobile Production

### Must-have
1. Secure backend
   - Accounts
   - cloud saves
   - leaderboard validation
   - inventory and economy sync

2. Content-config system
   - challenges
   - event rotations
   - loot tables
   - shop inventory
   - pricing

3. Release tooling
   - staging and production environments
   - remote config
   - feature flags
   - rollback path

4. QA matrix
   - iPhone small / large / notch
   - Android low / mid / high spec
   - offline / reconnect behavior
   - account-link edge cases
   - purchase restore
   - save conflict resolution

---

## 12. Revised Prioritization

### Critical now
1. Phoenix V2 stability and fairness
2. Apple / Google account system + cloud save
3. Real leaderboard backend + score validation
4. Analytics + crash reporting
5. Cosmetic / loot foundation

### High priority after that
1. Event framework v2 and event calendar
2. Expanded perk pool and synergy system
3. Cosmetic shop
4. Accessibility pass
5. Returner incentive loop

### Medium priority
1. Battle pass
2. Prestige v2
3. Rival / friends layer
4. A/B testing infrastructure

### Backlog
- In-game tournaments
- Creator / streamer integration
- Guild / clan layer
- Advanced social gifting

---

## 13. Suggested 8-Week Production Push

### Phase 1: Foundation
- Phoenix polish and event integrity
- Account auth
- Cloud save
- Analytics
- Crash reporting

### Phase 2: Competitive and collection
- Real leaderboards
- Loot table framework
- Cosmetic inventory model
- First event reward set

### Phase 3: Retention and monetization
- Event calendar
- Cosmetic shop
- Returner rewards
- Accessibility pass

### Phase 4: Scale prep
- Battle pass
- live-ops config tools
- soft-launch balancing

---

## 14. Final Guidance

Orbit Sync does not need more raw systems before launch as much as it needs the existing systems to become trusted, portable, collectible, and socially meaningful.

The correct production order for this game is:
1. Protect player progress with Apple / Google account sync and cloud save.
2. Make competition real with validated leaderboards.
3. Make rewards exciting with cosmetics, loot, and visible collection value.
4. Make live content sustainable with event infrastructure.
5. Use analytics to tune everything after soft launch.

If a feature does not help trust, retention, collection, rivalry, or replayability, it should not outrank these.
