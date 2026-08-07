import type {RaceEvent} from "../../lib/race"

/**
 * THE SPLIT RACE. The bike broke down at Lim Chu Kang, was repaired at a shop, and the
 * ride finished — two recordings with 2:43:19 of workshop between them. The race's
 * distance is the summed metres converted once (17908.4 + 117411.0 = 135319.4, so
 * 135.31), and `elapsed_time` is first start to last stop, NOT the sum of the two elapsed
 * times (7:22:15): elapsed already contains stops, so it must not depend on where the
 * rider pressed the button. This row carried only the post-repair recording until the
 * wall could draw a split, and under-reported the race by 17.90 km and four hours.
 */
export default {date: "2024-08-04", name: "Pesta Sukan Round Island Bike Adventure", sport: "cycling", country: "Singapore", elapsed_time: "10:05:34",
                recordings: [{id: "12058884605", metres: 17908.4, elapsed_time: "1:28:41"},
                             {id: "12058885236", metres: 117411.0, elapsed_time: "5:53:34"}]} satisfies RaceEvent
