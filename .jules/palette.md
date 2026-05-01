## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-05-01 - Focus Visible Styles for Custom Interactive Elements
**Learning:** In standard browsers, custom interactive elements using `role="button"` that rely on javascript `onclick` events do not automatically receive `:focus-visible` styling nor keyboard activation unless explicitly mapped using `tabindex="0"` and an explicit global keydown listener mapped to `Enter`/`Space`.
**Action:** Always verify `role="button"` elements have explicit `tabindex="0"` and ensure `keydown` listeners are added to standard custom components.
