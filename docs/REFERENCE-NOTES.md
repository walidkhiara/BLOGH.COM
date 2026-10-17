# Reference notes (not a live audit)

**The reference site was never inspected.** This session's network policy refused
`eu.gymshark.com` (proxy 403), and server-side fetching failed DNS. No DOM, computed
CSS, screenshots or network requests from the reference were captured, and none of the
values in this repo are measured from it.

What the theme is built from instead:

- The written art-direction brief supplied with the task (vibe, geometry, motion, page
  composition, product grid and PDP behaviour).
- General, publicly common conventions of large performance-apparel storefronts:
  slim black announcement bar, three-zone header with a centred wordmark, full-bleed
  campaign hero, 2-up category tiles, 4-column product rows with portrait imagery,
  filter/sort drawer, two-column PDP with a stacked gallery and a sticky buy column,
  right-side cart drawer.

Nothing proprietary (logo, artwork, copy, photography, fonts) was used. The brand
(BLOGH wordmark + accent slash), copy and stand-in imagery are original.

## To do a real audit later

Allow `eu.gymshark.com` (and its CDN hosts) in the environment's network settings,
then compare against `docs/screenshots/` at 1440×900 and 390×844, measuring:
header height, hero height/crop, product card ratio and gaps, heading sizes, drawer
widths and transition timings. All of those live as tokens at the top of
`assets/base.css`, so tuning them is a few-line change.
