## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons often miss `aria-label`s, making them difficult for screen readers to interpret correctly. The `alt` text on the inner `<img>` tags is present, but an `aria-label` directly on the `<button>` is better for overall accessibility.
**Action:** When inspecting buttons with icon-only content, ensure `aria-label` attributes are applied directly to the button element.

## 2025-02-14 - Interactive DIVs Need Global Keyboard Handlers
**Learning:** Adding `role="button"` and `tabindex="0"` to `div` elements makes them focusable and readable by screen readers, but natively they do not respond to `Enter` or `Space` key presses like `<button>` elements do. In a codebase with many custom interactive `div`s, a global keyboard event listener is needed to translate these key presses into `.click()` events.
**Action:** Always ensure that when implementing custom interactive elements (e.g., `div` acting as a button), they are correctly wired up either locally with a `keydown` handler or rely on a global `Enter`/`Space` keydown listener that targets `role="button"` elements.
