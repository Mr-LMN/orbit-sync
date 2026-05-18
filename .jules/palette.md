## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-05-18 - Making Custom DIV Buttons Accessible
**Learning:** In this application, custom interactive `div` elements used as buttons (e.g., `#vipBadge`, `#nextGoalPanel`, `#liveEventPanel`) often lack the `tabindex="0"` attribute. Without `tabindex="0"`, these elements cannot receive focus, breaking keyboard navigation and the app's global `:focus-visible` styles which map the `Enter`/`Space` keys to `click()`.
**Action:** When implementing or updating custom `div` elements that act as buttons, always verify they include both `role="button"` and `tabindex="0"`.
