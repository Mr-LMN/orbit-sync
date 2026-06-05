## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Interactive elements accessibility
**Learning:** Custom interactive elements (e.g., `div` acting as a button) need `role="button"` and `tabindex="0"` to properly hook into global `:focus-visible` styling and keyboard input listeners. Without these attributes, users navigating via keyboard cannot easily perceive or trigger these pseudo-buttons.
**Action:** When implementing clickable components using generic container tags like `<div>` or `<span>`, always apply `role="button"` and `tabindex="0"`.
