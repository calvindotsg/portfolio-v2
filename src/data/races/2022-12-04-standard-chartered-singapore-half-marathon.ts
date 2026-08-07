import type {RaceEvent} from "../../lib/race"

/**
 * THE ROW THE LEDGER WAS DESIGNED AROUND: two accounts of one race that disagree about
 * everything and are both correct. The course is certified at 21.10 km and the watch
 * recorded 22.45; the chip says 3:30:59, the watch 3:44:25 and the gun 3:48:04. Nothing
 * here is a correction of anything else — see `OfficialResult`.
 *
 * THE DATE IS RIGHT AND THE PAGE IT LINKS TO IS ALSO RIGHT. sportsplits heads that result
 * "3rd December 2022"; the 3rd was the FULL marathon and the half was the 4th. This is the
 * same shape as the `OCBC Cycle Singapore Virtual Ride` / `Malaysia` pairing on 2026-05-09, which
 * a reviewer once proposed "fixing" — do not change the date to match the heading.
 */
export default {date: "2022-12-04", name: "Standard Chartered Singapore Half Marathon", sport: "running", country: "Singapore", elapsed_time: "3:44:25",
                advertised_km: 21.10,
                official: {net_time: "3:30:59", gun_time: "3:48:04",
                           url: "https://www.sportsplits.com/races/singapore-marathon-2022/events/3/results/individuals/23925"},
                recordings: [{id: "8204481233", metres: 22454.7, elapsed_time: "3:44:25"}]} satisfies RaceEvent
