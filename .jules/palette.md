## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2024-06-14 - Accessible Icon/Emoji Buttons
**Learning:** This app frequently relies on buttons containing complex combinations of emojis (like Bottom Navigation labels or special action icons) or `<img>` elements without sufficient ARIA descriptors, causing screen readers to misread the buttons or pronounce the emoji descriptions unnecessarily.
**Action:** When implementing icon-only buttons or buttons with decorative elements, place the descriptive text inside `aria-label` directly on the `<button>` element. Also add `aria-hidden="true"` to the inner decorative elements (such as `<div>`s wrapping emojis or `<img>` elements) to ensure screen readers narrate a clean, specific text label rather than guessing from icons.
