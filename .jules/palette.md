## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-06-10 - Adding aria-labels to buttons mixing text and emojis
**Learning:** Buttons that mix unicode emojis with text (like the bottom navigation items) can cause screen readers to announce confusing or redundant strings. Explicit `aria-label` attributes help override this behavior with clean text.
**Action:** When creating buttons that use emojis as icons alongside text, explicitly set an `aria-label` on the `<button>` to ensure screen readers announce a concise, readable label.
