# CREW LINK payment integration (sandbox only)

This repository now contains a Stripe-hosted Checkout integration and a payment UI. It is **not a production-ready membership service**. Live API keys and live webhook events are rejected, and production startup is disabled. The existing community messages remain client-only demos.

## Local preview

Requirements: Node.js 24+, `npm install`, then `npm start`. Open `http://localhost:4173/#billing`. Without Stripe credentials the full UI is visible, but no checkout is started.

Store sandbox credentials in a local ignored `.env` file or the hosting platform's secrets vault. Never commit credentials. Prefer a restricted sandbox key with the required Checkout, subscription, portal, and refund permissions. `STRIPE_WEBHOOK_SECRET` is required alongside `STRIPE_SECRET_KEY`.

Use a separate Stripe sandbox for development. Provision it with `stripe sandbox create`; the CLI requires the account holder's email. Run `stripe listen --forward-to localhost:4173/api/stripe/webhook` with that sandbox and place the listener's signing secret in the ignored local environment.

## Prices and behavior

- Male membership: JPY 2,980, billed monthly; the displayed price is tax inclusive.
- Female admission deposit: JPY 10,000, one-time, refunded when the agreed conditions are satisfied. The minimum was specified as JPY 10,000; this implementation uses that minimum.
- Three/six-month plans are not enabled in this initial version.
- No additional charge per message.
- Prices, account ownership, deposit balances and eligibility are controlled on the server, not by browser state.
- Checkout completion URLs do not grant access. Signed paid Stripe events do.
- Self-service payment-method changes and cancellation use Stripe Customer Portal. Enable these options in the sandbox portal configuration before testing them.
- This implementation does not enable Stripe Tax or `automatic_tax`. Tax registrations and business tax treatment must be configured before a live launch. The deposit is presented as refundable money, without labeling it as a tax-inclusive service fee.

## Refund policy

The business has not specified the required number of people, messages, duration, violation handling, or withdrawal rules. Female Checkout therefore stays blocked by default.

Set `DEPOSIT_POLICY_JSON` only after deciding and approving the complete terms. The schema requires a version, a plain-language description, minimum distinct conversation partners, minimum messages **from each side** per partner, and minimum active days. The values in `.env.example` describe the schema, not proposed business rules. UI metrics are computed from reciprocal server-side message records after payment, never from the demo chat or client-supplied counters. Policy versions are saved with each deposit.

Only a trusted authenticated messaging integration may populate the `messages` table. There is deliberately no public endpoint to insert eligibility records. The current demo conversation does not count toward refunds. Failed or canceled refunds require operator reconciliation, rather than automatic repeated attempts. Refund requests are idempotent; the balance changes only on a confirmed charge refund event.

## Required Stripe webhook events

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `invoice.paid`, `invoice.payment_failed`
- `charge.refunded`
- `refund.created`, `refund.updated`, `refund.failed`

The handler verifies signatures and rejects live events. It deduplicates Stripe event IDs, validates the paid amount/currency/order identity, and refreshes the authoritative subscription state. Cancellation and renewal status update asynchronously. The initial payment history currently lists Checkout orders; detailed recurring invoice history is available in Stripe Customer Portal.

## Tests

`npm test` uses a mocked Stripe gateway with the actual Stripe signature verifier. It tests amount tampering, consent, duplicate checkouts and retries, delayed payment confirmation, webhook replay/signatures, stale subscription events, refund eligibility, refund completion, account isolation, cross-origin requests, protected files, and return-page behavior. These tests do not charge real cards or claim that real Stripe sandbox end-to-end tests have run.

## Before live operation

Replace the test-session switcher with real member authentication and verified member types. Connect durable authenticated messaging, settle the complete deposit and cancellation terms, configure the hosting backend and Stripe events, and complete real sandbox Checkout/renewal/refund tests. GitHub Pages alone cannot run this Node server. Production remains deliberately disabled until these steps are implemented and reviewed.
