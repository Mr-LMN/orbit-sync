## 2024-06-25 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-06-25 - Adding explicit aria-labels on icon-only buttons
**Learning:** Even if an inner `<img>` has an `alt` attribute, screen readers or specific interaction models (like game keymaps) can handle focus mapping better when an explicit `aria-label` is applied directly to the outer `<button>` element. Relying solely on `alt` text of children for an interactive parent button may lead to inconsistent announcement or keyboard navigation issues, especially when elements are programmatically focused.
**Action:** When creating icon-only `<button>`s, always attach the `aria-label` attribute directly to the `<button>` element itself.
