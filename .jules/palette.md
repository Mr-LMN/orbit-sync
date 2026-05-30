## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-05-30 - Adding global keydown handler for keyboard accessibility
**Learning:** For a web game with custom interactive div components and click listeners, native keyboard interaction (Enter/Space) needs to be explicitly handled at a global level (like a keydown listener), especially for custom button components.
**Action:** When creating new custom UI buttons or divs with onclick handlers, make sure to add `tabindex="0"` and a `role="button"`, and verify they are caught by global keydown handlers.
