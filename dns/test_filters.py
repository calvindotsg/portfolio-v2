#!/usr/bin/env python3
"""Proves, by executing them, the four claims `config.yaml` makes about its own safety.

The migration plan established these by READING octodns' source. That was the right thing to
do at the time and it was correct, but a source reading is only true of the version that was
read: `pip install -U` can falsify it silently, and the way you find out is that inbound mail
stops. This file makes the same claims answerable by running them, so a version bump that
changes the behaviour goes red in CI instead of red in the zone.

    python dns/test_filters.py          # from the repository root; no network, no credentials

EVERY CLAIM HERE IS CALIBRATED. A test that says "no records were deleted" is also green when
nothing was compared, when the filter matched everything, or when the provider quietly failed
to populate — the three ways this file could lie. So each claim is paired with a control that
removes exactly one thing and asserts the deletion DOES appear. A control that stays green is
a failure and is reported as one.
"""

import sys
from pathlib import Path

from yaml import safe_load

from octodns.processor.filter import NameRejectlistFilter, TypeRejectlistFilter
from octodns.provider.yaml import YamlProvider
from octodns.record import Delete, Record
from octodns.zone import Zone
from octodns_cloudflare import CloudflareProvider

ZONE = "calvin.sg."
ZONE_ID = "bbc51eedf64c3f4780c0c5dbf46d6569"
ROOT = Path(__file__).resolve().parent.parent

# The live zone as the Cloudflare API returns it, captured 2026-07-31 with
# `cf dns records list --zone calvin.sg`. Two values are redacted, and redacting them costs
# nothing: this fixture exists to exercise NAME and TYPE matching, and neither filter reads
# content. The DKIM key is truncated to its first field, and the DMARC `rua` mailbox is
# replaced — that address is precisely what `config.yaml` declines to commit, so committing it
# in a fixture instead would defeat the exclusion rather than test it.
LIVE_RECORDS = [
    {"name": "calvin.sg", "type": "CNAME", "content": "calvindotsg.pages.dev", "ttl": 1, "proxied": True},
    {"name": "www.calvin.sg", "type": "CNAME", "content": "calvindotsg.pages.dev", "ttl": 1, "proxied": True},
    {"name": "battleship.calvin.sg", "type": "CNAME", "content": "calvindotsg.github.io", "ttl": 1, "proxied": True},
    {"name": "diving.calvin.sg", "type": "CNAME", "content": "calvindotsg.github.io", "ttl": 1, "proxied": True},
    {"name": "garden.calvin.sg", "type": "CNAME", "content": "calvindotsg.github.io", "ttl": 1, "proxied": True},
    {"name": "model.calvin.sg", "type": "CNAME", "content": "calvindotsg.github.io", "ttl": 1, "proxied": True},
    {"name": "slickshots.calvin.sg", "type": "CNAME", "content": "calvin.sg", "ttl": 1, "proxied": True},
    # meta.email_routing — Cloudflare's, not ours.
    {"name": "calvin.sg", "type": "MX", "content": "route1.mx.cloudflare.net", "priority": 28, "ttl": 1, "proxied": False},
    {"name": "calvin.sg", "type": "MX", "content": "route2.mx.cloudflare.net", "priority": 54, "ttl": 1, "proxied": False},
    {"name": "calvin.sg", "type": "MX", "content": "route3.mx.cloudflare.net", "priority": 90, "ttl": 1, "proxied": False},
    {"name": "calvin.sg", "type": "TXT", "content": "google-site-verification=jFiJ01OUV_Mmxa0ptV9HaXWeOqXO67456dAbTlgTcZk", "ttl": 1, "proxied": False},
    {"name": "calvin.sg", "type": "TXT", "content": "google-site-verification=l7o6u3vVat-T_oPwXJQjdAabpMlVVUZvfmRygupTsY0", "ttl": 1, "proxied": False},
    {"name": "calvin.sg", "type": "TXT", "content": "v=spf1 include:_spf.mx.cloudflare.net ~all", "ttl": 1, "proxied": False},
    # meta.read_only — the API refuses to write this one at all.
    {"name": "cf2024-1._domainkey.calvin.sg", "type": "TXT", "content": "v=DKIM1; h=sha256; k=rsa; p=REDACTED", "ttl": 1, "proxied": False},
    {"name": "_dmarc.calvin.sg", "type": "TXT", "content": "v=DMARC1; p=quarantine; rua=mailto:redacted@example.com", "ttl": 1, "proxied": False},
]

# One legacy Page Rule, standing in for the redirects that were created by hand the day before
# this file existed. `pagerules: true` — the provider's DEFAULT — makes the provider read these
# as if they were records it owns.
LIVE_PAGERULES = [
    {
        "id": "pagerule-www-to-apex",
        "status": "active",
        "priority": 1,
        "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "www.calvin.sg/*"}}],
        "actions": [{"id": "forwarding_url", "value": {"url": "https://calvin.sg/$1", "status_code": 301}}],
    }
]


# Cloudflare rotates the Email Routing DKIM selector, and the selector carries a year. This is
# what the live zone looks like the day after that happens.
ROTATED_DKIM = {
    "name": "cf2025-1._domainkey.calvin.sg", "type": "TXT",
    "content": "v=DKIM1; h=sha256; k=rsa; p=ROTATED", "ttl": 1, "proxied": False,
}


def cloudflare(pagerules, pagerule_result=(), extra_records=()):
    """A real CloudflareProvider with its single HTTP seam stubbed.

    Everything above the seam is the shipped code path — pagination, the SUPPORTS filter,
    `_data_for_*`, the root-CNAME-to-ALIAS rewrite. Only the socket is fake.
    """
    provider = CloudflareProvider("cloudflare", token="not-a-real-token", pagerules=pagerules)

    def seam(_self, method, path, params=None, data=None):
        if path == "/zones":
            return {"result": [{"name": "calvin.sg", "id": ZONE_ID, "plan": {"legacy_id": "free"}}],
                    "result_info": {"count": 1, "per_page": 50}}
        if path == f"/zones/{ZONE_ID}/dns_records":
            records = LIVE_RECORDS + list(extra_records)
            return {"result": records, "result_info": {"count": len(records), "per_page": 100}}
        if path == f"/zones/{ZONE_ID}/pagerules":
            return {"result": list(pagerule_result)}
        # Anything else means the provider tried to reach a surface this test does not model,
        # and a silent {} would let it pass as "nothing there". Fail loudly instead.
        raise AssertionError(f"provider requested an unstubbed path: {method} {path}")

    provider._try_request = seam.__get__(provider)
    return provider


def committed_zone():
    """The desired state, read from the file that is actually committed."""
    zone = Zone(ZONE, [])
    YamlProvider("config", directory=str(ROOT / "dns" / "zones")).populate(zone)
    return zone


def deletions(processors, pagerules=False, pagerule_result=()):
    plan = cloudflare(pagerules, pagerule_result).plan(committed_zone(), processors=processors)
    changes = plan.changes if plan else []
    return sorted(f"{c.existing._type} {c.existing.name or '@'}" for c in changes if isinstance(c, Delete))


def deletions_after_dkim_rotation(processors):
    """Deletes planned against a live zone whose DKIM selector has rolled to next year's."""
    plan = cloudflare(pagerules=False, extra_records=[ROTATED_DKIM]).plan(
        committed_zone(), processors=processors
    )
    changes = plan.changes if plan else []
    return sorted(f"{c.existing._type} {c.existing.name or '@'}" for c in changes if isinstance(c, Delete))


def unmanaged():
    """The names and types the SHIPPED config declines to manage, read off the filters themselves.

    Derived rather than restated, for the same reason `configured()` reads the file: a hard-coded
    list here would stay green while someone edited the rejectlist that actually runs.

    THE LIMIT OF DERIVING IT, stated because it is not obvious and was measured: if someone
    DELETES a rejectlist entry, this set shrinks with it, so the gate below goes looking for a
    record it no longer considers unmanaged and stays green. That edit is caught by "MX survives
    the type rejectlist" and "DKIM and DMARC survive the name rejectlist", which compare against
    a literal expectation. Verified by mutation: emptying the MX rejectlist reddens 5 checks but
    NOT the gate; setting `include_target: false` — where the filter still declares MX but stops
    protecting it — reddens the gate itself. The two together cover both directions; neither
    does alone.
    """
    types, names, patterns = set(), set(), []
    for p in SAFE:
        types |= getattr(p, "_list", set())
        names |= getattr(p, "exact", set())
        # A `/…/` entry is a regex, not a name. Reading only `exact` would quietly stop covering
        # the DKIM key the moment its exclusion became a pattern — which it now is.
        patterns += getattr(p, "regex", [])
    return types, names, patterns


def is_unmanaged(record):
    """Mirrors octoDNS' own matching: exact name, regex `search`, or rejected type."""
    types, names, patterns = unmanaged()
    return (
        record._type in types
        or record.name in names
        or any(r.search(record.name) for r in patterns)
    )


def changes_touching_unmanaged(processors):
    """Any change at all — Create, Update or Delete — against a record this zone file excludes."""
    plan = cloudflare(pagerules=False).plan(committed_zone(), processors=processors)
    return sorted(
        f"{type(c).__name__} {c.record._type} {c.record.name or '@'}"
        for c in (plan.changes if plan else [])
        if is_unmanaged(c.record)
    )


# A name no real record will ever use, so this probe cannot collide with the zone file. The first
# draft used `gallery`, and adding a `gallery` record to the zone made octoDNS raise a duplicate
# rather than fail a check — a probe that breaks when someone happens to pick its name is a trap
# for whoever picks it, not a test.
PROBE = "octodns-selftest-probe"


def plan_for_an_added_record(processors):
    """What an operator following README.md's "Making a change" actually gets back."""
    zone = committed_zone()
    assert PROBE not in {r.name for r in zone.records}, f"{PROBE} is a test probe; rename the real record"
    zone.add_record(
        Record.new(zone, PROBE, {"type": "CNAME", "ttl": 300, "value": "calvindotsg.github.io."})
    )
    plan = cloudflare(pagerules=False).plan(zone, processors=processors)
    return [f"{type(c).__name__} {c.record._type} {c.record.name or '@'}" for c in (plan.changes if plan else [])]


def configured():
    """The processors and the `pagerules` setting, built from `config.yaml` itself.

    The point of reading the config rather than restating it: a test that constructs its own
    filters proves octoDNS behaves, but stays green while someone deletes the MX rejectlist
    from the file that actually runs. Everything below is therefore a claim about the shipped
    config, not about a copy of it.
    """
    with open(ROOT / "dns" / "config.yaml") as f:
        config = safe_load(f)

    classes = {
        "octodns.processor.filter.TypeRejectlistFilter": (TypeRejectlistFilter, "rejectlist"),
        "octodns.processor.filter.NameRejectlistFilter": (NameRejectlistFilter, "rejectlist"),
    }
    processors = []
    for name in config["zones"][ZONE]["processors"]:
        spec = dict(config["processors"][name])
        cls, arg = classes[spec.pop("class")]
        processors.append(cls(name, spec.pop(arg), **spec))

    return processors, config["providers"]["cloudflare"].get("pagerules", True)


SAFE, CONFIGURED_PAGERULES = configured()

passed = failed = 0


def check(name, actual, expected):
    global passed, failed
    if actual == expected:
        print(f"  \033[32mPASS\033[0m  {name}")
        passed += 1
    else:
        print(f"  \033[31mFAIL\033[0m  {name}\n          got      {actual}\n          expected {expected}")
        failed += 1


def main():
    print("── the gate: no plan may touch a record this file does not manage ─────────────")
    # WHAT THIS DELIBERATELY NO LONGER ASSERTS: that the committed zone equals the live zone.
    # It did, against the LIVE_RECORDS snapshot above, and that was a bootstrap precondition
    # wired into a permanent gate. Every INTENDED edit made this job red — and `plan` and `apply`
    # both sit behind `needs: semantics`, so the runbook in README.md ("edit, open a PR, read the
    # plan, paste the checksum") could never reach step 2. Reproduced before removing it: adding
    # one ordinary `gallery` CNAME took this file from 9 passed to `FAIL ... got
    # ['Create CNAME gallery']`, exit 1.
    #
    # Drift is a real property and it is still checked — against the LIVE zone, by the `plan` job,
    # on every PR touching `dns/` and again every Monday. That is where it belongs: frozen in a
    # fixture it can only go stale or block. What stays here is the part a snapshot CAN answer
    # offline, and the part that must never regress whatever the zone file says.
    check("no change of any kind touches an unmanaged record", changes_touching_unmanaged(SAFE), [])
    # The control: with the filters gone, those same records are exactly what a plan hits.
    check("without the filters, the unmanaged records ARE touched",
          changes_touching_unmanaged([]),
          ["Delete MX @", "Delete TXT _dmarc", "Delete TXT cf2024-1._domainkey"])
    # And the property the old gate destroyed, asserted so it cannot come back: an ordinary new
    # subdomain must REACH a plan as a Create rather than failing the job that gates the plan.
    # Asserted as "is present", not "is the only change" — and that distinction is the whole bug.
    # The first draft compared the plan to exactly [Create <probe>], which is once again a claim
    # that the committed zone matches the snapshot, and it failed the moment the zone file carried
    # any real edit. The operator's own changes are not this check's business; that the added
    # record REACHES a plan is.
    check("an ordinary added record still plans as a Create",
          f"Create CNAME {PROBE}" in plan_for_an_added_record(SAFE), True)

    print("\n── the claim: a reject list is not a delete list ──────────────────────────────")
    check("MX survives the type rejectlist", deletions(SAFE), [])
    check("DKIM and DMARC survive the name rejectlist", deletions(SAFE), [])
    # NEXT year's key, not this one. The exclusion is matched by suffix precisely so that a
    # rotation is not an outage waiting on a calendar.
    check("so does the DKIM key Cloudflare has not rotated to yet",
          deletions_after_dkim_rotation(SAFE), [])
    # The control, and the reason the line above is not decoration: pinned to one literal
    # selector — which is what shipped until 2026-07-31 — the rotated key IS deleted.
    check("pinned to one selector, a rotation would have been deleted",
          deletions_after_dkim_rotation([
              TypeRejectlistFilter("mx", ["MX"]),
              NameRejectlistFilter("names", ["cf2024-1._domainkey", "_dmarc"]),
          ]),
          ["TXT cf2025-1._domainkey"])

    print("\n── the controls: each says the same thing with one guard removed ──────────────")
    # Without the MX filter the three MX records are in `existing` and absent from `desired`, so
    # the diff is a Delete. This is what the config would do unguarded, and seeing it here is the
    # only reason to believe the green above means anything.
    check("without the type filter, MX is deleted",
          deletions([NameRejectlistFilter("names", ["cf2024-1._domainkey", "_dmarc"])]), ["MX @"])
    check("without the name filter, DKIM and DMARC are deleted",
          deletions([TypeRejectlistFilter("mx", ["MX"])]), ["TXT _dmarc", "TXT cf2024-1._domainkey"])
    # The polarity trap, executed. `include_target=False` leaves the record in the target zone
    # while removing it from desired — which is exactly a Delete. The default is True; this is
    # what "do not fix it to False" costs.
    check("include_target=False deletes what the filter was meant to protect",
          deletions([TypeRejectlistFilter("mx", ["MX"], include_target=False),
                     NameRejectlistFilter("names", ["cf2024-1._domainkey", "_dmarc"], include_target=False)]),
          ["MX @", "TXT _dmarc", "TXT cf2024-1._domainkey"])

    print("\n── the redirect rules: pagerules must stay off ────────────────────────────────")
    # The rule arrives as a URLFWD record named for the host its pattern matches — `www`, the
    # same name as the CNAME two records above it. So no rejectlist can defend it without also
    # unmanaging the CNAME: excluding the type would work only until a second rule appears
    # elsewhere, and excluding the name gives up the record this file most wants to hold. The
    # only defence that costs nothing is not reading page rules at all.
    check("the shipped config turns pagerules off", CONFIGURED_PAGERULES, False)
    check("at the configured setting the redirect rule is invisible",
          deletions(SAFE, pagerules=CONFIGURED_PAGERULES, pagerule_result=LIVE_PAGERULES), [])
    check("with pagerules on — the DEFAULT — the www redirect is deleted",
          deletions(SAFE, pagerules=True, pagerule_result=LIVE_PAGERULES), ["URLFWD www"])

    print()
    print(f"{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
