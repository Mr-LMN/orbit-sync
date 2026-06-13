## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-11-20 - Unicode Emoji Accessibility in Compound Buttons
**Learning:** For buttons containing both text and unicode emojis/icons (like the bottom navigation), screen readers can sometimes parse the unicode symbol separately, leading to repetitive or confusing announcements (e.g., "House, Home, button").
**Action:** When a button contains decorative inner text or unicode icons, apply an explicit `aria-label` to the main `<button>` element and set `aria-hidden="true"` on the decorative inner `div` or `span` elements to ensure screen readers announce a clean, single text label.
