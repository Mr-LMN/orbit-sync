## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.
## $(date +%Y-%m-%d) - Preventing screen reader double-announcements in mixed-content buttons
**Learning:** When adding `aria-label`s to buttons containing both decorative icons (like Unicode characters or images) and text (like bottom navigation items), screen readers may double-announce the content or read out meaningless Unicode descriptions.
**Action:** Always set the descriptive `aria-label` on the parent `<button>` element and apply `aria-hidden="true"` to *all* inner child elements (both the decorative icons and the text labels) to ensure a clean, single announcement.
