## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-06-22 - Adding ARIA labels to text-and-icon buttons
**Learning:** Screen readers may attempt to read decorative Unicode characters (like `⌂`, `🗺`, etc.) inside text-and-icon buttons, which causes confusion. Just having a text label (`<div class="nav-label">`) is sometimes not enough if the Unicode character gets announced improperly.
**Action:** For buttons combining unicode icons/emojis and text, explicitly set an `aria-label` on the `<button>` element and apply `aria-hidden="true"` to the inner decorative elements containing the Unicode icons to ensure a clean text label is announced.
