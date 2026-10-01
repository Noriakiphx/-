# CREW LINK UI

A Japanese frontend demo for an event-production community. Open `index.html` in a browser or serve the repository root using any static HTTP server.

## Features

- Crew discovery with keyword, profession, region, and purpose filters
- Saved profiles (device-local browser storage)
- Profile detail dialogs
- Demo conversations (in memory; no external message delivery)
- Editable personal profile (device-local browser storage; not published)
- Responsive desktop and mobile navigation
- Keyboard-accessible dialogs, form labels, and focus styles
- Test-only subscription and refundable deposit screens (see `PAYMENTS.md` for the Node server and Stripe sandbox setup)

All displayed member names and descriptions are fictional samples. Photos are illustrative, not actual members. Production authentication, administrator access, identity verification, and registration are not implemented. The payment backend uses isolated demo sessions and accepts test Stripe credentials only. Do not enter sensitive personal data in this demo.

## Assets

Illustrative photos: Unsplash. Icons: Lucide, ISC license (see `assets/lucide-LICENSE`). Japanese font: Noto Sans JP (see `assets/noto-sans-jp-LICENSE`). The frontend uses the site and billing stylesheets and scripts in `assets/`.
