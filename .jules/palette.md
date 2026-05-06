## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-05-06 - Adding :focus-visible for keyboard accessibility
**Learning:** The application does not currently define `:focus-visible` styles globally. As a result, interactive elements (like buttons, links, inputs, and elements with `tabindex`) do not provide clear visual feedback when navigated via keyboard. This is a significant accessibility issue for keyboard users.
**Action:** Always add a global `:focus-visible` rule in the main stylesheet (e.g., `css/styles.css`) to ensure all interactive elements display a clear, accessible focus indicator (like an outline) by default.
## 2026-05-06 - Custom div buttons need keyboard handlers
**Learning:** Adding `tabindex="0"` and `role="button"` to a `div` makes it focusable and semantically correct, but it does NOT automatically make it activatable via keyboard. Unlike native `<button>` elements, `div` elements require explicit `onkeydown` handlers to trigger actions when the user presses Enter or Space.
**Action:** When creating custom interactive elements, ensure an application-wide or element-specific `keydown` listener is in place to translate Enter/Space key presses into click events to guarantee full keyboard accessibility.
