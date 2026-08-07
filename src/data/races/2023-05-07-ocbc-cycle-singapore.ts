import type {RaceEvent} from "../../lib/race"

/**
 * 22.11 km IS NOT A TYPO FOR A 40 km SPORTIVE. The activity's own description reads
 * "Rainy rainy morning! Our 40km sportive ride turns out to be a 20km scenic ride!" —
 * so this row is `raceKm` doing exactly what it says: the bib prints the ride that was
 * ridden, not the route that was entered. Do not "correct" it to the event's advertised
 * distance, and note there is nothing here to correct — the 22115.1 m is what the API
 * said, and 22.11 is what the conversion makes of it.
 */
export default {date: "2023-05-07", name: "OCBC Cycle Singapore", sport: "cycling", country: "Singapore", elapsed_time: "1:53:15",
                recordings: [{id: "9024119101", metres: 22115.1, elapsed_time: "1:53:15"}]} satisfies RaceEvent
