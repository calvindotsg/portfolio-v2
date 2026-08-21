# The edge, as configured

This directory holds the zone's DNS records in git. This page holds the part of the zone that is
**not** DNS and is **not** in git: the feature toggles, and the two Redirect Rules.

**This is a snapshot, and it says so about itself because it cannot say anything else.** Nothing
here is checked by any test, on any schedule. Reading these values back needs a
`zone_settings:read` credential this repository does not hold, and minting one is a decision
rather than a step — so a poller pretending to be a drift check would be the dishonest half of
this. The honest half is writing down what is set and why, dated, with the place to re-read it.

The fix for an entry that has gone stale is to re-read the dashboard and correct it here. It is
never to delete the entry.

**Read on 2026-08-21.** Everything below came from the zone's own API, and every row can be
re-read the same way: the settings from the zone `settings` collection, the redirects from the
zone ruleset in the `http_request_dynamic_redirect` phase. `cf zones settings get <setting-id>`
reaches the first of those with a token carrying the right scope.

## What this page is not

`.github/workflows/origin.yml` runs `scripts/origin-canary.sh` against the live site every week
and fails when the edge has changed the bytes a reader receives. **That is the check; this is the
record.** They cover different things on purpose:

- The canary reads the **output**. It cannot name a setting, and it does not need a credential —
  which is why it can exist at all. It sees any rewriter, present or future, by what the rewriter
  leaves in the response.
- This page names the **settings**. It cannot detect a change. It exists so that the next person
  asking "why is this on?" has an answer that is not "nobody knows".

A setting whose effect the canary cannot see is a setting this page is the only record of.

## The four that were turned off, and why

All four were on and all four were turned off on 2026-08-21. Three of them are HTML rewriters,
which is the class that matters here: this repository's whole claim is that what ships is the
artifact the suite gated, and an HTML rewriter makes that claim false on the wire without
touching a single byte at rest.

| Setting | Why it is off |
|---|---|
| Rocket Loader | It rewrote four of the five shipped script tags and injected its own loader, deferring the pre-paint theme resolver into that loader's queue — which reintroduced exactly the light flash the inline script in `src/layouts/BasicLayout.astro` exists to prevent. There was nothing for it to optimise: the site ships one external script, already deferred, and three inline. |
| Hotlink Protection | It answered 403 to any request for an image carrying a foreign `Referer` — including the site's own `og:image`, so every social card unfurled from another host was broken. `Referer` is client-supplied and Pages bandwidth is unmetered, so it cost only honest consumers. |
| Email Obfuscation | An HTML rewriter, inert today because no mailto is rendered. Inert is not off: it would arm silently the first time the content changed. |
| Server-Side Excludes | The same, for its own markers. Both were left on for years without ever being decided on. |

The canary asserts the *consequences* of all four — no injected loader, no rewritten script type,
and the card readable from a foreign referrer — so re-enabling any of them turns the weekly run
red without anybody having to remember this table.

## The two Redirect Rules

Both live in the zone's single `http_request_dynamic_redirect` ruleset, both are enabled, and
neither is under version control. **There is no legacy Page Rule left** — the second rule below
was one, and its description still records that.

| Matches | Sends | Code | Query string |
|---|---|---|---|
| host is `www.calvin.sg` | the same path on the apex | 301 | preserved |
| host is `slickshots.calvin.sg` | a fixed Instagram profile URL | 302 | dropped |

**Why the `www` rule is worth knowing about even though nothing here touches it.** It is invisible
in normal use — the redirect just works — and it is deletable by accident from this repository:
`octodns-cloudflare` defaults `pagerules` to **true**, which makes the provider treat redirects as
records it owns and plan a delete for every one absent from the zone file. `config.yaml` sets it
to false and explains that at the line that does it. Single Redirects live under the rulesets API
and are invisible to octoDNS either way, so today's rules survive; the setting is what stops that
from being luck.

## What is on, and left alone

Recorded so that "why is this on?" has an answer, not because any of it is a decision this
repository made. Everything in this group is a Cloudflare default that has never been changed.

- **Transport**: TLS 1.3, HTTP/2, HTTP/3, 0-RTT, Opportunistic Encryption, ECH,
  post-quantum key exchange, IPv6, WebSockets. Always Use HTTPS and Automatic HTTPS Rewrites are
  both on.
- **Delivery**: Brotli, Early Hints, Always Online. Auto Minify is off for all three of CSS, HTML
  and JS — which matters more than it looks, because two of those are HTML-and-JS rewriters of
  exactly the kind the section above is about.
- **Security**: Security Level medium, Browser Integrity Check, the managed free WAF ruleset, the
  managed DDoS L7 ruleset, and the normalization ruleset. SSL mode is **strict**.

**One value in this group is not a default and is worth a decision the next time somebody is
here**: the minimum TLS version is **1.0**. Nothing this site serves needs it, and it is the one
row above that a reader should not take as deliberate. It is recorded rather than changed because
changing it is outside what the plan that wrote this page was scoped to do.

## What still is not governed

Stated plainly so that this page is not mistaken for more than it is:

- **No automated drift check on any of the above.** It needs a credential that does not exist.
- **The two Redirect Rules are not in version control**, so there is no backup and no diff. They
  are recorded here and nowhere else.
- **The Pages project's own settings** — build configuration, environment variables, custom
  domains — are likewise outside git. `.github/workflows/pages-retention.yml` governs the one part
  of it that was actively accumulating, which is its deployments.
