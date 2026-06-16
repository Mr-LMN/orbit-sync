## 2026-06-16 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-06-16 - Adding aria-hidden to decorative elements inside buttons
**Learning:** For buttons combining unicode icons/emojis and text, putting an explicit `aria-label` directly on the parent `<button>` and applying `aria-hidden="true"` to inner child elements (like `.nav-icon` and `.nav-label` divs) prevents screen readers from confusingly reading out unicode descriptions along with the text label.
**Action:** When creating buttons with both visual icons and text, set an explicit `aria-label` on the parent button and use `aria-hidden="true"` on the internal decorative/text elements for a clean read.
