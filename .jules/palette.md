## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-07-02 - Preventing double-announcing for icon-text buttons
**Learning:** When adding `aria-label` to a parent button that contains both decorative icons and text labels (which visually display the same label), screen readers will often announce the `aria-label` followed by the text content, resulting in double-announcing (e.g., "Home button, Home").
**Action:** When an `aria-label` is applied to a parent button, always apply `aria-hidden="true"` to any child text elements that visually display the same label to prevent screen readers from double-announcing the content.
