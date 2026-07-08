## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-07-08 - Adding aria-hidden to decorative emoji icons in nav elements
**Learning:** For bottom navigation buttons that contain both a text label and a decorative unicode character/emoji, simply adding an `aria-label` to the outer `<button>` is good, but it's crucial to also add `aria-hidden="true"` to the inner element containing the icon. Otherwise, screen readers may still try to parse and announce the unicode character, creating noise.
**Action:** When improving button accessibility where both text and a decorative icon/emoji exist, ensure the icon container explicitly receives `aria-hidden="true"`.
