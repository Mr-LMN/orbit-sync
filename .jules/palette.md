## 2026-07-06 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2026-07-06 - Adding aria-hidden to decorative text in buttons
**Learning:** For buttons combining unicode icons/emojis and text (like bottom navigation items), applying an explicit `aria-label` to the parent `<button>` is insufficient if the inner text elements remain visible to screen readers. The screen reader can end up announcing both the parent `aria-label` and the inner text content redundantly.
**Action:** When a button relies on a text label, apply `aria-hidden="true"` to any child elements that visually display the same label or act as decorative icons (e.g., `<div class="nav-label">Label</div>`) to prevent screen readers from double-announcing the content.
