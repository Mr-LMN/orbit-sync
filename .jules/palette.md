## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-05-08 - Adding global focus-visible and keyboard support
**Learning:** The application lacks global focus-visible styling and a global keyboard listener (Space/Enter) for triggering interactive elements or the main `tap()` game action, which severely limits keyboard accessibility. Custom elements acting as buttons need `tabindex="0"` and `role="button"`.
**Action:** Add global `:focus-visible` styling in `css/styles.css` and a `keydown` event listener in `js/core/input.js` to support global keyboard navigation and game interaction.
