## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-07-01 - Redundant screen reader announcements on icon+text buttons
**Learning:** When an `aria-label` is applied to a parent button, screen readers may still announce the inner text elements.
**Action:** Apply `aria-hidden="true"` to any child text elements that visually display the same label to prevent screen readers from double-announcing the content.
