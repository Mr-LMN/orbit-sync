## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## $(date +%Y-%m-%d) - Adding ARIA labels to mixed content buttons
**Learning:** Buttons combining unicode icons/emojis and text can cause screen readers to announce confusing or unhelpful information if the decorative icons are parsed. Explicit `aria-label`s on the `<button>` and `aria-hidden="true"` on inner decorative icon elements provide a much cleaner accessibility experience.
**Action:** When implementing buttons with unicode icons or mixed content, set an `aria-label` directly on the `<button>` and apply `aria-hidden="true"` to any inner decorative `<div>` or `<span>` elements.
