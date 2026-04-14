## 2024-05-18 - [Optimized for loops]
**Learning:** Replaced `forEach` and `filter` in hot paths (`draw` and `update` loop) to avoid object allocation and Garbage Collection stutter.
**Action:** Always prefer standard `for` loop over `.forEach()` or `.filter()` in real-time loops.
