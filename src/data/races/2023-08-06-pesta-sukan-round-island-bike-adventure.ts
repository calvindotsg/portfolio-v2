import type {RaceEvent} from "../../lib/race"

/**
 * A RACE THAT WAS NOT FINISHED, and the one that shows the split and the abandonment are
 * independent: it was ridden in two parts and the split has nothing to do with why it
 * ended. (The other `outcome` row, 2025-12-14, is a single recording.) Its distance is the
 * summed metres converted ONCE (87422.6 + 22619.7 = 110042.3, so 110.04) and `elapsed_time`
 * is first start to last stop, 13:14:12, NOT the 13:07:06 the parts sum to. The race figure
 * does NOT discriminate the rounding rule here — 110042.3 m is 110.04 either way — but the
 * second RECORDING does: 22619.7 m is 22.61 rounded down and 22.62 half-up, and 22.62 is
 * also the one figure ever read off Strava's own page that disagrees with the rule this
 * file follows. It is the API's metres that decide, so the bib prints 22.61.
 * Nothing in the recordings says it ended early: Strava stores an abandoned ride exactly
 * like a completed one, which is the whole reason `outcome` is hand-entered.
 */
export default {date: "2023-08-06", name: "Pesta Sukan Round Island Bike Adventure", sport: "cycling", country: "Singapore", outcome: "dnf", elapsed_time: "13:14:12",
                recordings: [{id: "9593519661", metres: 87422.6, elapsed_time: "10:47:28"},
                             {id: "9599925310", metres: 22619.7, elapsed_time: "2:19:38"}]} satisfies RaceEvent
