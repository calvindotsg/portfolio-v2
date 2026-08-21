# DNS as code

The calvin.sg zone, in git. `zones/calvin.sg.yaml` is the record of intent, `config.yaml` says
what octoDNS may touch, and `.github/workflows/dns.yml` runs it. Each of those files explains its
own decisions at the line that makes them; this page is the part that lives nowhere else — what
to do, and what has to exist first.

**DNS is not all the zone does, and the rest of it is not in git.** The feature toggles and the
two Redirect Rules are recorded in [`EDGE.md`](EDGE.md), which is a dated snapshot rather than a
drift check and explains why it cannot be more than that. The check for that half is
`.github/workflows/origin.yml`, which reads the live site weekly and asserts what the edge does
to the response rather than what the dashboard says it is set to.

## The two tokens it runs on

**Live since 2026-07-31.** The first plan against the real zone reported *"No changes were
planned"* — Cloudflare returned 11 records, the reject lists removed 3, and the remaining 8 matched
this directory exactly.

Neither `cf` nor any token in CI can create these: Cloudflare's token-minting endpoints refuse
every credential this repository holds, by design. **Both were made by hand at
[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)**, and a
replacement has to be too.

| Secret | Scope | Zone resources | Where it goes |
|---|---|---|---|
| `CLOUDFLARE_DNS_READ_TOKEN` | Zone → Zone: **Read**, Zone → DNS: **Read** | Include → Specific zone → `calvin.sg` | Repository secret |
| `CLOUDFLARE_DNS_WRITE_TOKEN` | Zone → Zone: **Read**, Zone → DNS: **Edit** | Include → Specific zone → `calvin.sg` | **`dns` environment** secret |

Two tokens rather than one, because the job that runs weekly and on every PR should not be able
to change anything — and one token would mean it could. The write token belongs to the `dns`
environment specifically: a repository-level secret of that name would be readable by every job
that omits `environment:`, and the separation would be decorative. That is the same invariant
`ci.yml` states for `CLOUDFLARE_API_TOKEN`.

Neither token grants Pages, Workers, or account access, so neither can deploy the site, and the
existing `CLOUDFLARE_API_TOKEN` cannot touch DNS. If either secret goes missing the workflow fails
naming it, rather than surfacing a Cloudflare authentication error.

**The separation is measured, not assumed.** Both tokens were exercised against the live API
before being stored: each lists only `calvin.sg` and reads all 15 records, and on an attempted
write the read token returns **403 Authentication error** while the write token returns 400 for an
invalid record type — permission present, body rejected, zone unchanged at 15 records throughout.
Re-run that check after any rotation; a token pasted from the wrong place passes every test except
using it.

## What is managed, and what is deliberately not

Ten of the zone's fifteen records are in `zones/calvin.sg.yaml`. The other five are excluded, and
`config.yaml` gives the reason beside each exclusion:

- **The three `MX` records** belong to Cloudflare Email Routing, which marks them as its own and
  rewrites them from its own UI.
- **Any `._domainkey` name** is an Email Routing DKIM key, and Cloudflare marks it `read_only` —
  the API refuses to write it at all. Matched by suffix rather than by name on purpose: the
  selector carries a year, and an exclusion pinned to `cf2024-1._domainkey` stops covering the
  key the moment Cloudflare rotates it.
- **`_dmarc`** is excluded for a reason that is not about DNS: its `rua=` is a personal mailbox,
  and no email address appears anywhere else in this public repository. That is a choice about
  publishing an address, not about correctness.

To adopt `_dmarc` later, **add the record to `zones/calvin.sg.yaml` first, then remove it from the
reject list** — in that order. Removing the line on its own does not adopt the record, it plans a
**delete** of it: the name becomes visible to the diff, which finds it live and absent from the
file. This page and `config.yaml` both used to say "delete the line to adopt it", which is exactly
backwards; running it plans `Delete TXT _dmarc`.

An excluded record is invisible to octoDNS on **both** sides of the diff, so no plan can ever
propose deleting one. `test_filters.py` proves that by executing it rather than by citing it.

## Making a change

1. Edit `zones/calvin.sg.yaml`. Keys must stay sorted — octoDNS refuses to parse the file
   otherwise, so a wrongly ordered record fails loudly rather than silently.
2. Open a PR. The **DNS** workflow proves the filter semantics and prints the plan to the job
   summary, along with a checksum.
3. Merge, then run the workflow from the Actions tab with that **checksum** pasted into the input.
   That is what applies it. Leaving the input empty re-plans and changes nothing.

The checksum is not a confirmation prompt. It identifies *which* plan you approved: if the zone
moved between the plan and the apply, octoDNS refuses rather than writing something nobody read.

## The weekly run is the point

Realistically, DNS gets changed in the Cloudflare dashboard — that is how the `www` redirect and
every record here came to exist. So the job this repository is actually good for is noticing when
the zone and the file disagree. The Monday-morning run plans against the live zone and **fails if
it finds anything**, which is the only way a drift becomes a notification rather than a surprise.

When it fails, one of two things is true: someone edited DNS by hand, and the file should be
updated to match; or the file is ahead of the zone, and wants applying.

Which makes *how it decides* load-bearing, and it is not the exit code — `octodns-sync` exits 0
whether or not it found changes. It reports in prose instead: a `checksum=` line when there is at
least one change, `No changes were planned` when there is none. `drift.sh` reads both signals and
requires them to agree, and **exits non-zero when it can tell neither**, because the alternative is
a check reporting a zone it failed to read as unchanged. `tests/dns-config.test.ts` executes that
against fixtures of every shape, including a plan whose checksum line has changed format — the
realistic version-bump case, which under the original one-line grep reported "No changes" and took
Monday's run green. Those cases live in `pnpm test` rather than beside this file so that they run on
every pull request, including the ones that touch nothing under `dns/` and so never start this
workflow at all.

## Working on it locally

```sh
uv venv dns/.venv --python 3.13
uv pip install --python dns/.venv/bin/python --require-hashes -r dns/requirements.txt
dns/.venv/bin/python dns/test_filters.py          # no network, no credentials
```

`test_filters.py` runs a real octoDNS plan against a fixture of the live zone with only the HTTP
call stubbed, so it exercises the shipped code path. It needs no token and should stay that way.

`dns/requirements.txt` is **compiled**, not written. Its direct pins live in
`dns/requirements.in`, and the lock carries a hash for every distribution in the transitive tree.
To change a version, edit the `.in` file and recompile with the command in its header — never
hand-edit a hash line. Both the workflow and the command above pass `--require-hashes`, which
catches the case pip does not: a file that has lost **all** its hashes is still exactly pinned and
installs clean without it.

To plan against the live zone you need the read token in `CLOUDFLARE_DNS_TOKEN`, and then
`octodns-sync --config-file dns/config.yaml` **from the repository root** — `directory:` in the
config resolves against the working directory, not against the config file.

Never pass `--checksum` to a run you intend as a dry run. With `enable_checksum: true` that flag,
not `--doit`, is what makes octoDNS write.
