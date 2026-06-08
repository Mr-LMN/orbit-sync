## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-06-08 - Adding explicit ARIA labels to text-and-icon combined buttons
**Learning:** For buttons combining unicode icons/emojis and text (like bottom navigation items), explicitly setting an `aria-label` on the `<button>` element ensures screen readers announce a clean text label without parsing the raw unicode icons or potentially hidden nested text elements.
**Action:** When inspecting buttons with icon-only content or complex internal text/icon DOM structures, ensure a clear, explicit `aria-label` attribute is applied directly to the outer button element.
