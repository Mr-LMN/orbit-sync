## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## $(date +%Y-%m-%d) - Hiding redundant inner text when an outer aria-label is present
**Learning:** When using `<button aria-label="Label">`, screen readers can sometimes double-announce the label if there are inner visible elements (like `<div class="nav-label">Label</div>`). It's important to add `aria-hidden="true"` to inner elements that are visually displaying the same text to prevent this confusing repetition.
**Action:** Whenever adding an `aria-label` to a parent button that contains text or icons duplicating that label, apply `aria-hidden="true"` to those child elements.
