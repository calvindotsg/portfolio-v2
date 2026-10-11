import type {RaceEvent} from "../../lib/race"

/**
 * THE RACE THE 2025-12-14 DNF ROW BELONGS TO, ENTERED AGAIN. Same name, ten months later, and
 * the wall now prints that name twice in two different states: an outline for October
 * beside December's DNF. Nothing in the data disambiguates them and nothing needs to —
 * every bib carries its own date, and the wall's tests key on POSITION rather than on
 * `name` precisely because an annual race makes the name ambiguous.
 *
 * 42.00 IS THE DIVISION ENTERED, not the whole of what the event sells. It is two laps of
 * a 21 km city circuit and both distances are on offer, so this figure is a fact about the
 * entry rather than about the event — the same name with a 21.10 beside it would be a
 * different race to ride and a correct row.
 *
 * CANCELLED BY THE ORGANISER, so the bib is an outline that says `Cancelled` rather than
 * `Booked`. The organiser's Instagram post of 9 October 2026 called the ride off for haze and
 * air quality, two days before it. Nothing was ridden, so there is no recording, no time and
 * no result: it is not a finish and not a DNF, and December's DNF row above is unchanged. The
 * 42.00 stays because it is still the division he entered; it is no longer counted as
 * distance to come (`bookedAhead` asks `patchState`).
 */
export default {date: "2026-10-11", name: "OCBC Cycle Johor Bahru", advertised_km: 42.00, sport: "cycling", country: "Malaysia", outcome: "cancelled"} satisfies RaceEvent
