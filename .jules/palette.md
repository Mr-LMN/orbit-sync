## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## 2026-07-03 - Adding ARIA labels to buttons combining icons and text
**Learning:** When buttons combine decorative icons (like emojis or unicode characters) and visual text, screen readers can sometimes read out the icons confusingly, or double-announce the content if structural elements break it up. Adding an `aria-label` directly to the button and `aria-hidden="true"` to the internal presentation elements provides a clean, single announcement for screen readers.
**Action:** For buttons with mixed content (icons and text) or icon-only buttons, apply an `aria-label` to the `<button>` tag and `aria-hidden="true"` to inner `<div>` or `<span>` elements that visually duplicate the meaning or are decorative.
