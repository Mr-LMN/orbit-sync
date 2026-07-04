## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Avoiding double-announcements in compound navigation buttons
**Learning:** When adding `aria-label` to compound buttons (buttons containing multiple elements like icons and text labels), screen readers may double-announce the content if the inner text elements are not hidden. Decorative Unicode characters in the icon placeholders can also be parsed poorly by screen readers.
**Action:** When applying `aria-label` to parent elements like `.nav-item`, explicitly add `aria-hidden="true"` to any child elements (e.g., `.nav-icon`, `.nav-label`) that contain visual information duplicating the label or decorative characters to ensure a clean, single announcement.
