## 2026-07-05 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-07-05 - Adding `aria-hidden` to child elements for buttons combining text and unicode icons
**Learning:** When using an `aria-label` directly on a `<button>` that combines unicode icons/emojis and text, it's important to add `aria-hidden="true"` to any internal elements (like `div`s containing the decorative icons or visually displayed labels). Otherwise, screen readers may double-announce the content or attempt to parse the unicode icons awkwardly, confusing the user.
**Action:** When adding `aria-label`s to composite buttons containing text and icons, systematically apply `aria-hidden="true"` to the inner decorative and text child elements to maintain a clean announcement.
