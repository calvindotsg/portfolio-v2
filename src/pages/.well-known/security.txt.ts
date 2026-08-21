import type {APIRoute} from "astro"
import {SECURITY} from "../../content/site"

/**
 * `/.well-known/security.txt` — RFC 9116.
 *
 * WHY THIS EXISTS WHEN A SECURITY POLICY ALREADY DOES. The security policy in the
 * `calvindotsg/.github` repository is inherited by every repository on that account, so a
 * human who lands on any of them can find the address. A scanner cannot: RFC 9116 makes
 * this path THE machine-readable location for a security contact, and disclosure tooling
 * looks here before it goes hunting for a policy document. Two paths, one mailbox. The
 * `Policy` field is what ties them together, so the machine-readable half cannot quietly
 * start saying something the human-readable half does not.
 *
 * THIS FILE HOLDS NO VALUES, AND THAT IS THE POINT OF ITS SHAPE. The contact, the expiry
 * and the policy URL are all things a maintainer edits, so they live in `src/content/`
 * with the rest of the site's configurable content — see {@link SECURITY}, which carries
 * the argument for each of them, including why the expiry is a constant rather than
 * derived from the build date. This module decides the WIRE FORMAT: which fields RFC 9116
 * requires, what order they read in, and that every line ends `\n`. `src/pages/llms.txt.ts`
 * is the same division of labour at a larger scale.
 *
 * THE ORIGIN COMES FROM `site` for the reason `src/pages/robots.txt.ts` gives: two copies
 * of an origin agree until one of them moves, and this repo moved hosts once already.
 *
 * `Canonical` NAMES ONLY THE SITE'S OWN ORIGIN, AND THAT EXCLUDES THE PAGES HOSTNAME ON
 * PURPOSE. The same bytes are fetchable at the deployment hostname `public/_headers` names,
 * and RFC 9116 says a reader that retrieved this file from a URI no `Canonical` field lists
 * SHOULD NOT trust its contents. That is the correct outcome rather than a gap: the
 * deployment hostname is an artifact of the host, the site is the origin `site` declares,
 * and listing both would tell a scanner that a name this project does not publish is an
 * equally good place to report a vulnerability.
 *
 * NO SIGNATURE AND NO ENCRYPTION KEY, DELIBERATELY. RFC 9116 permits a detached PGP
 * signature and an encryption key and requires neither. There is no published key for this
 * identity, and a file pointing at a key nobody holds is worse than an unsigned one — it
 * invites a reporter to encrypt a report that cannot then be read.
 */
export const GET: APIRoute = ({site}) => {
    // As in `src/pages/robots.txt.ts`: `site` is typed optional because a project may omit
    // it, and this one cannot — every canonical URL already depends on it. A missing value
    // must be a build failure rather than the string "undefined" reaching a field whose
    // entire job is to say where this file legitimately lives.
    if (!site) throw new Error("`site` must be set in astro.config.mjs for security.txt to name its canonical URI")

    const body = [
        `Contact: ${SECURITY.contact}`,
        `Expires: ${SECURITY.expires}`,
        "Preferred-Languages: en",
        `Canonical: ${new URL(".well-known/security.txt", site).href}`,
        `Policy: ${SECURITY.policy}`,
        "",
    ].join("\n")

    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
