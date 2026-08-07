import type {RaceEvent} from "../../lib/race"

/**
 * THE ROW THAT SHOWS WHY `outcome` IS TOLD RATHER THAN LOOKED UP. The 42 km road ride was
 * not completed: the rider was past the cut-off and marshalled onto the shortcut. The
 * OFFICIAL RESULT DISAGREES — checkpointspot prints `Status: Finished` against bib 2192,
 * because a timing sheet records the mat you crossed, not the course you rode, and a
 * diverted rider crosses the same finish mat. So the results page is not a second opinion
 * this row could be checked against; it is a third device that cannot see the fact either,
 * alongside Strava and the calendar. Do not "correct" this to `finished` on the strength of
 * that page. The recording is the rider's own 78.59 km of the day, which is why the bib's
 * RECORDED row reads further than the race advertised while the hero still says DNF — that
 * row names an account, not a result.
 *
 * THE SHEET IS CITED HERE ANYWAY, AND THAT IS THE LEDGER EARNING ITS KEEP RATHER THAN
 * CONTRADICTING THE PARAGRAPH ABOVE. Printing `OFFICIAL 42.00 2:19:11` beside
 * `RECORDED 78.59 7:40:25` under a hero reading DNF says exactly what happened: the
 * organiser recorded a finish over the advertised course, the rider rode nearly twice that
 * and did not complete it. A design that had to pick ONE of those figures would have to
 * suppress the other; this one does not, which is why `outcome` stays hand-entered and the
 * sheet stays quotable. What is NOT taken from the page is its `Status` field — the bib
 * already answers that question and the sheet answers it wrongly.
 *
 * A GUN TIME, NOT A NET ONE. checkpointspot prints one time and a `Start 00:01:18` split,
 * so the mat crossing is 1:18 into the clock it publishes. Deriving a net time by
 * subtraction would print a figure as though the organiser had stated it, so `net_time`
 * stays absent and the ledger prints the gun time it actually has.
 */
export default {date: "2025-12-14", name: "OCBC Cycle Johor Bahru", sport: "cycling", country: "Malaysia", outcome: "dnf", elapsed_time: "7:40:25",
                advertised_km: 42.00,
                official: {gun_time: "2:19:11",
                           url: "https://results.checkpointspot.asia/myresults.aspx?CId=17036&RId=10723&EId=1&AId=2308571"},
                recordings: [{id: "16736512210", metres: 78595.0, elapsed_time: "7:40:25"}]} satisfies RaceEvent
