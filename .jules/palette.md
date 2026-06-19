## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Adding aria-hidden to decorative icons in buttons
**Learning:** When buttons combine unicode icons/emojis and text, screen readers may read both, resulting in cluttered or confusing audio feedback. While `aria-label` on the button provides the intended reading, adding `aria-hidden="true"` to inner decorative elements ensures screen readers skip over parsing those icons.
**Action:** Always add an `aria-label` on the `<button>` element and apply `aria-hidden="true"` to inner decorative elements (like `div`s containing unicode icons) to ensure a clean text label for screen readers.
