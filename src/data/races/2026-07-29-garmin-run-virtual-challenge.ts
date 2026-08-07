import type {RaceEvent} from "../../lib/race"

/**
 * THE ROW THAT DELIBERATELY GAINS NOTHING FROM THE LEDGER, and it is not an omission to be
 * filled in later. A VIRTUAL RACE CERTIFIES THE FILE YOU UPLOADED. Its certificate reads
 * 00:58:26, which is this recording's own elapsed time to the second, and its "10 km
 * division" is a rounding of what the same file said — so there is no second instrument
 * and nothing to disagree with. Giving it an `official` block would print one account
 * twice under two names, which is precisely the thing the ledger exists to avoid. No
 * `advertised_km` either, for the same reason: 10 km here is the file, not a course.
 */
export default {date: "2026-07-29", name: "Garmin Run Virtual Challenge", sport: "running", country: "Singapore", elapsed_time: "0:58:26",
                recordings: [{id: "19513789157", metres: 10166.6, elapsed_time: "0:58:26"}]} satisfies RaceEvent
