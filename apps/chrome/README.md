# Char Chrome Extension (WXT)

Google Meet POC: DOM parsing + native messaging to `com.char.native_host`.

## Dev

- `pnpm -F @hypr/chrome dev`
- WXT launches a browser profile and hot-reloads extension changes.
- Popup UI uses React via `@wxt-dev/module-react`.
- Styling uses Tailwind CSS v4.
- Meet badge UI is injected via WXT Shadow Root UI to isolate styles from the page.

## Testing

- `pnpm -F @hypr/chrome test:unit`
- `pnpm -F @hypr/chrome test:e2e`

## Build / Publish

- `pnpm -F @hypr/chrome build` (output: `apps/chrome/.output/chrome-mv3`)
- `pnpm -F @hypr/chrome zip` (output zip for Chrome Web Store upload)

## Native host

Requires a registered native messaging host `com.char.native_host` pointing to `char-chrome-native-host`.
