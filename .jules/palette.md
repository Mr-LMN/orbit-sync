## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Adding ARIA labels to navigation buttons with unicode icons
**Learning:** Bottom navigation buttons utilizing unicode characters (emojis/symbols) along with dynamic text labels (which may be hidden via CSS on inactive items) pose an accessibility issue. Screen readers will attempt to read the unicode symbol (e.g., "gear", "shopping cart") leading to a confusing auditory experience, particularly when the visual label is suppressed.
**Action:** When implementing navigation items or icon-heavy buttons, ensure an explicit `aria-label` is placed on the parent `<button>` element and apply `aria-hidden="true"` to any inner decorative elements (like `div`s containing unicode icons).
