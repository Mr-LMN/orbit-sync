## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2024-11-20 - Unicode Icon and Text Navigation Buttons
**Learning:** This app heavily uses decorative unicode characters alongside text in buttons, particularly in the bottom navigation. Without `aria-hidden="true"` on the icon container, screen readers will read out the unicode character (e.g., "house with yard") and then the label ("Home"), creating a redundant and confusing experience. Adding `aria-label` to the button and hiding the icon creates a much cleaner audio experience.
**Action:** Always add `aria-hidden="true"` to decorative unicode icons inside buttons to prevent screen readers from parsing them, relying instead on explicit `aria-label`s on the parent `<button>`.
