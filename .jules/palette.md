## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Preventing Double Announcements on Compound Buttons
**Learning:** When adding `aria-label` to a parent button element that contains both decorative icons and visual text labels (like a bottom navigation item), screen readers will announce both the parent's `aria-label` and the inner text.
**Action:** Apply `aria-hidden="true"` to the inner child elements (both the icon container and the text container) to ensure the screen reader only reads the clean `aria-label` on the parent `<button>` and doesn't double-announce the text or try to interpret the icon.
