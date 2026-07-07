## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-07-07 - Keyboard Accessibility for Custom Div Buttons
**Learning:** In the hub UI, many primary interactive elements (like the Next Goal Panel and Event Panel) are custom `div`s with `onclick` handlers but lack native keyboard support. This renders them invisible to keyboard users and screen readers unless explicitly styled and given behavioral attributes.
**Action:** When implementing or modifying non-native interactive elements (like custom button divs), always add `role="button"`, `tabindex="0"`, and an `onkeydown` handler supporting both 'Enter' and 'Space' to trigger a click.
