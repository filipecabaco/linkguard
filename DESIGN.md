# Design

World: **Return to Sender.** A link is an address. Look Twice is the sorting office that checks it, stamps the bad ones and ticks the reason on the return slip. The world lends type, palette, density and one signature move; layout and controls stay standard web.

## Palette

Three inks per surface plus a state colour. Colour commits whole regions: the kraft band owns the shell, the label owns the content. No gradients, no tints between them.

| Token | Light | Dark | Job |
|---|---|---|---|
| `--kraft` | `#B48A5C` | `#4A3826` | Shell band (header). Text on it is `--on-kraft`. |
| `--on-kraft` | `#1C2238` | `#F1E6D6` | Text and mark on the band. |
| `--label` | `#F6F5F1` | `#1E2129` | Content surface (address labels, sheets). |
| `--ground` | `#E9E4DA` | `#14161C` | Page behind the sheet on full pages. |
| `--ink` | `#1C2238` | `#ECEAE4` | Primary text, primary button fill. |
| `--ink-2` | `#4A5068` | `#A9AEBC` | Secondary text. |
| `--rule` | `#1C223833` | `#ECEAE42E` | Hairlines, always 1px. |
| `--stamp` | `#E2382B` | `#FF5A4E` | Dangerous: stamp outline, filled mark. |
| `--stamp-text` | `#C1261B` | `#FF7A70` | Dangerous as text on `--label` (AA). |
| `--tag` | `#F2B705` | `#F2B705` | Suspicious: sticker fill, always with `--ink`-dark text. |
| `--tag-edge` | `#8A6500` | `#F2B705` | Suspicious dashed edge / outline on light pages. |
| `--ok` | `#2E6B4A` | `#7CC79D` | Nothing found / connected. Used sparingly. |

State is carried by form as well as colour: **suspicious** = yellow sticker, dashed edge, "?" mark; **dangerous** = red double-ruled stamp, filled "!" mark. Never colour alone.

## Type

- **Display / stamps:** Archivo (variable, self-hosted in `fonts/`, OFL). Headlines at `font-stretch: 75%`, weight 800, tracking -0.01em. Stamp and slip labels: caps, `font-stretch: 68–90%`, tracking 0.06–0.16em.
- **Body / UI:** system stack (`system-ui, -apple-system, "Segoe UI", sans-serif`).
- **Addresses:** `ui-monospace, "SF Mono", Menlo, monospace`: a URL is data, set like a printed address label. The deceptive part is highlighted in `--stamp-text` on a 12% stamp wash.

## Signature move: the return slip

Every warning (block page, click warning, popup rows) has the same anatomy:

1. **Address label**: "It really goes to" plus the real address in mono, with "The link said …" when the text lied.
2. **Stamp**: one stamp form at every scale, from the 14px in-page mark to the 46px block-page stamp, tilted −9° only at large sizes.
3. **Reason slip**: "Why it was stopped" as a ruled checklist of at most three plain-language reasons; extra reasons and technical detail sit behind "More details".
4. **One safe action**: "Go back to safety" is the only filled button. "Open anyway" and "I trust this site" are quiet text buttons.

## Components

- Buttons: primary is `--ink` fill with `--label` text, radius 10px, min height 48px on touch. Quiet buttons are underlined text with offset 4px.
- Elevation: one soft offset shadow on the sheet (`0 18px 40px` with a kraft-brown shadow at 20%); no border plus shadow.
- Radii: sheet 4px (paper), labels 3px, buttons 10px, stamp 6px.
- Focus: 3px `--ink` outline, offset 2px (on kraft: `--on-kraft`).
- Motion: one moment, the stamp landing (scale 1.15→1, opacity, 180ms ease-out), disabled under `prefers-reduced-motion`.

## Voice

Plain words for non-technical people. Say what the link does ("pretending to be PayPal"), never how we detected it ("Levenshtein distance"). Headlines are one sentence. Buttons name the outcome.
