## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-05-28 - Making custom divs keyboard accessible
**Learning:** In vanilla JS setups, custom UI elements like `<div>` functioning as buttons are commonly used for complex visual styling (like panels and badges). These are skipped by keyboard navigation (Tab key) by default, frustrating keyboard users.
**Action:** Always add `tabindex="0"`, `role="button"`, and a descriptive `aria-label` to these interactive divs to ensure they join the focus ring and are announced correctly by screen readers.
