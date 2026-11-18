import type {RaceEvent} from "../../lib/race"

/**
 * Nine recordings, one per day of the tour ("Day n/9 Taiwan RTI", Strava, read 2026-11-18). The three
 * short rides beside them (two to the Giant shop, one from the station to the hotel) are not part of the
 * tour's days and are left out. `elapsed_time` is first start (7 Nov 08:15:09) to last stop (15 Nov 15:42:55
 * local), 199:27:46, as for any split race.
 *
 * Two days are shorter than the 1,022 km booked, and the module says so rather than the bib: Day 2's
 * recording stops at his crash (119.91 km of a 162 km board; he rested in the van and rode on from Day 3),
 * and Day 7's 61.13 km leaves out about 88 km that went by train, as planned. The recorded 937.31 km is therefore below
 * `advertised_km`, and the two figures are kept apart on purpose.
 */
export default {date: "2026-11-07", end_date: "2026-11-15", name: "Formosa – The Extended Cycling de Taiwan", advertised_km: 1022.00, sport: "cycling", country: "Taiwan", elapsed_time: "199:27:46",
                recordings: [{id: "20904155597", metres: 99504, elapsed_time: "7:22:44"},
                             {id: "20904280068", metres: 119912, elapsed_time: "8:38:26"},
                             {id: "20918176529", metres: 148959, elapsed_time: "10:29:31"},
                             {id: "20930812098", metres: 129720, elapsed_time: "9:58:41"},
                             {id: "20943612544", metres: 96934, elapsed_time: "9:15:48"},
                             {id: "20960083322", metres: 116981, elapsed_time: "8:55:16"},
                             {id: "20968099691", metres: 61129.4, elapsed_time: "4:47:30"},
                             {id: "20980524418", metres: 94713.4, elapsed_time: "7:52:37"},
                             {id: "20994275887", metres: 69458.8, elapsed_time: "7:27:04"}]} satisfies RaceEvent
