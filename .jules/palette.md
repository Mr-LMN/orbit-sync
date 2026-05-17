## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2024-06-25 - Focus-visible for accessibility
**Learning:** Custom interactive elements missing `:focus-visible` styles prevent users navigating via keyboard from knowing which element is focused. Additionally, those custom interactive elements need `tabindex="0"` to be focusable and a keyboard event listener for space/enter to be functional.
**Action:** When creating custom elements that function as buttons (using `role="button"`), apply `:focus-visible` styles globally to ensure standard feedback, add `tabindex="0"` directly, and ensure a global `keydown` event listener acts on `Space` and `Enter` keys on focused interactive elements.
