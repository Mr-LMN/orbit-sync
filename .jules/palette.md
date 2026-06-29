## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-05-14 - Accessibility for icon + text buttons
**Learning:** For buttons combining unicode icons/emojis and text (like bottom navigation items), applying an `aria-label` directly to the `<button>` element is the best approach for screen readers. However, simply adding the label will cause screen readers to read the icon and then double-announce the text.
**Action:** Always explicitly set an `aria-label` on the parent `<button>` element and apply `aria-hidden="true"` to any inner decorative elements (like `div`s containing unicode icons) AND inner text elements that visually display the same label to ensure screen readers announce a single, clean text label without parsing the icons.
