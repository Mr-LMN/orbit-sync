## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Adding ARIA labels to text-and-icon combined buttons
**Learning:** Even when a button contains visible text (like the bottom navigation items), if it also contains decorative Unicode icons or emojis, screen readers may read the icon alongside the text, creating a noisy experience. Simply relying on the text label is not always sufficient.
**Action:** When a button contains both a decorative icon (especially Unicode/emojis) and text, explicitly set an `aria-label` on the `<button>` element to provide a clean reading experience, and apply `aria-hidden="true"` to the wrapper element containing the decorative icon.
