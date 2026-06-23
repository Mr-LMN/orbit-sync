## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-06-23 - Custom interactive elements require keyboard support
**Learning:** Custom interactive elements (like `div` acting as a button with `role="button"`) must have `tabindex="0"`, an `onkeydown` handler for 'Enter' and 'Space', and `:focus-visible` styling to be accessible to keyboard users.
**Action:** When implementing custom buttons, ensure these attributes and styles are always applied alongside `role="button"`.
