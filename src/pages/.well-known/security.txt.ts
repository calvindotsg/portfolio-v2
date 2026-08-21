import type {APIRoute} from "astro"

/**
 * `/.well-known/security.txt` — RFC 9116.
 *
 * WHY THIS EXISTS WHEN A SECURITY POLICY ALREADY DOES. The security policy in the
 * `calvindotsg/.github` repository is inherited by every repository on that account, so a
 * human who lands on any of them can find `security@calvin.sg`. A scanner cannot: RFC 9116
 * makes this path THE machine-readable location for a security contact, and disclosure
 * tooling looks here before it goes hunting for a policy document. Two paths, one mailbox.
 * `Policy` is what ties them together, so the machine-readable half cannot quietly start
 * saying something the human-readable half does not.
 *
 * WHY `Expires` IS A CONSTANT AND NOT DERIVED FROM THE BUILD DATE. The obvious
 * implementation is the build date plus a year, and it is wrong twice over.
 *
 * It is wrong on this repository's own rule first. `astro.config.mjs` argues at length
 * against stamping a build date into anything a consumer reads as a claim, and closes with
 * an instruction not to reach for `BUILD_DATE` — a nightly rebuild restamping unchanged
 * output is the pattern that gets a date discounted wholesale. This site rebuilds nightly.
 *
 * It is wrong on RFC 9116's terms second, and that is the sharper half. `Expires` exists to
 * force a human to periodically re-confirm the contact still reaches someone. A value
 * computed at build time is pushed forward by every build, so the file can never expire and
 * the field means nothing. A constant CAN lapse, which is the whole point — and
 * `tests/build-output.test.ts` turns the approach into a failed build thirty days out, so
 * the lapse arrives as a red suite rather than as a stale address nobody noticed.
 *
 * WHY THE ORIGIN COMES FROM `site`. Same reason `src/pages/robots.txt.ts` gives: two copies
 * of an origin agree until one of them moves, and this repo moved hosts once already. The
 * only literal origin here is `Policy`, which addresses a DIFFERENT host — GitHub — and so
 * is not a second copy of anything.
 *
 * `Canonical` NAMES ONLY THE SITE'S OWN ORIGIN, AND THAT EXCLUDES THE PAGES HOSTNAME ON
 * PURPOSE. The same bytes are fetchable at the deployment hostname `public/_headers` names,
 * and RFC 9116 says a reader that retrieved this file from a URI no `Canonical` field lists
 * SHOULD NOT trust its contents. That is the correct outcome rather than a gap: the
 * deployment hostname is an artifact of the host, the site is the origin `site` declares,
 * and listing both would tell a scanner that a name this project does not publish is an
 * equally good place to be told about a vulnerability.
 *
 * NO SIGNATURE AND NO ENCRYPTION KEY, DELIBERATELY. RFC 9116 permits a detached PGP
 * signature and an encryption key and requires neither. There is no published key for this
 * identity, and a file pointing at a key nobody holds is worse than an unsigned one — it
 * invites a reporter to encrypt a report that cannot then be read.
 */

// RFC 9116 requires this field and RECOMMENDS it stay under a year out; this is 364 days
// from the day it was written. Hard-coded ON PURPOSE — see the note above. The gate in
// `tests/build-output.test.ts` reddens once it is within 30 days, so it cannot lapse
// quietly, and the fix when it does is to re-confirm the mailbox BEFORE pushing the date.
const EXPIRES = "2027-08-20T00:00:00.000Z"

const CONTACT = "mailto:security@calvin.sg"
const POLICY = "https://github.com/calvindotsg/.github/blob/main/SECURITY.md"

export const GET: APIRoute = ({site}) => {
    // As in `src/pages/robots.txt.ts`: `site` is typed optional because a project may omit
    // it, and this one cannot — every canonical URL already depends on it. A missing value
    // must be a build failure rather than the string "undefined" reaching a field whose
    // entire job is to say where this file legitimately lives.
    if (!site) throw new Error("`site` must be set in astro.config.mjs for security.txt to name its canonical URI")

    const body = [
        `Contact: ${CONTACT}`,
        `Expires: ${EXPIRES}`,
        "Preferred-Languages: en",
        `Canonical: ${new URL(".well-known/security.txt", site).href}`,
        `Policy: ${POLICY}`,
        "",
    ].join("\n")

    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
