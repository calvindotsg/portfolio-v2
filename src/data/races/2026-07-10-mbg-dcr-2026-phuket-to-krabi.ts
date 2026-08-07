import type {RaceEvent} from "../../lib/race"

/**
 * THE SECOND SPLIT RACE, and it was classified the other way first. The day holds a
 * 22.55 km escort out of Phuket and the 140.49 km ride, and this row printed only the
 * ride on the reading that the escort was a separate outing sharing the date. The rider
 * says otherwise: the escort IS part of the event. The race's distance is the summed
 * metres converted once (22558.8 + 140498.0 = 163056.8, so 163.05), and `elapsed_time` is
 * first start to last stop, 10:09:34, against 9:55:09 summed and a 14:25 gap between the
 * two. This is the row where converting once and adding the parts DISAGREE: the two bib
 * lines below read 22.55 and 140.49 and add to 163.04. That is the rule working.
 */
export default {date: "2026-07-10", name: "MBG DCR 2026 - Phuket to Krabi", sport: "cycling", country: "Thailand", elapsed_time: "10:09:34",
                recordings: [{id: "19250544118", metres: 22558.8, elapsed_time: "1:23:04"},
                             {id: "19254155835", metres: 140498.0, elapsed_time: "8:32:05"}]} satisfies RaceEvent
