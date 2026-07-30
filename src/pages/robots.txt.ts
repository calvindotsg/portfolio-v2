import type {APIRoute} from "astro"

/**
 * `robots.txt`, generated rather than kept as a file in `public/`.
 *
 * WHAT THIS FIXES, and it is the only reason the file moved. The static version
 * hard-coded `Sitemap: https://calvin.sg/sitemap-index.xml` — the site's origin written
 * down a second time, when `astro.config.mjs` already declares it as `site` and every
 * canonical, `og:url` and sitemap entry is built from that. Two copies of an origin agree
 * until one of them moves, and this repo moved hosts the same week this was written.
 * Deriving it from `Astro.site` means the day the origin changes, this changes with it
 * and cannot be the one thing left pointing at the old name.
 *
 * WHY THERE ARE NO PER-CRAWLER GROUPS, WHICH THE FIRST DRAFT OF THIS FILE HAD. It listed
 * eight answer-engine agents — GPTBot, ClaudeBot, PerplexityBot, Google-Extended and so
 * on — each with `Allow: /`, as a statement that citation is welcome. That was worse than
 * useless in two ways, and both are worth recording so nobody adds it back.
 *
 * First it changed nothing: `User-agent: *` already allows every one of them, so the
 * twenty-four extra lines expressed a preference the file was expressing anyway.
 *
 * Second, and this is the actual defect, it was a LOADED GUN. Under the robots protocol a
 * crawler obeys the single most specific group matching its name and ignores `*`
 * ENTIRELY. So the day anyone adds a `Disallow:` to the `*` group — a staging path, a
 * draft, anything — all eight named agents would sail straight past it, because they were
 * given their own group back when the only rule in it was "yes". The first draft argued
 * this was fail-safe. It is fail-safe only in the direction that was already safe, and
 * fail-open in the one that is not.
 *
 * The rule that follows: name an agent here ONLY to give it rules that differ from `*`.
 * Naming one to repeat `*` buys nothing and quietly exempts it from the future.
 *
 * NOTHING HERE IS A SECURITY BOUNDARY. `robots.txt` is a request, not access control, and
 * every URL it names is public and in the sitemap anyway.
 */
export const GET: APIRoute = ({site}) => {
    // `site` is `astro.config.mjs`'s `site`. Typed optional because a project may omit it;
    // this one cannot — the sitemap integration and every canonical URL already require
    // it — so a missing value should be a build failure rather than the string
    // "undefined/sitemap-index.xml" reaching the served file.
    if (!site) throw new Error("`site` must be set in astro.config.mjs for robots.txt to name the sitemap")

    const body = [
        "# Everything on this site is public and may be crawled, indexed and cited,",
        "# including by AI and answer engines. /llms.txt is the same site as plain text.",
        "User-agent: *",
        "Allow: /",
        "",
        `Sitemap: ${new URL("sitemap-index.xml", site).href}`,
        "",
    ].join("\n")

    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
