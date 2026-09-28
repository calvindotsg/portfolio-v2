import type {RaceEvent} from "../../lib/race"

/**
 * BOOKED AS A HALF AND RUN AS A 10 KM, SO `advertised_km` IS 10.00 AND NOT 21.10. The
 * organiser cut the course on race morning for haze and made the event non-competitive,
 * and the results sheet files the result under the division "10km Haze". The ledger's
 * official row prints this distance beside the sheet's clock, so it has to be the distance
 * that clock was run over: 21.10 beside 0:54:59 would be a half marathon nobody ran.
 *
 * The watch read 10.11 km against the 10.00 division, and 0:55:17 elapsed against a 0:54:59
 * chip and a 0:55:18 gun. Nothing here reconciles them — see `OfficialResult`.
 */
export default {date: "2026-09-27", name: "The Kiprun Singapore 2026", sport: "running", country: "Singapore", elapsed_time: "0:55:17",
                advertised_km: 10.00,
                official: {net_time: "0:54:59", gun_time: "0:55:18",
                           url: "https://bluechipresults.com.au/myresults.aspx?CId=11&RId=2001&EId=1&AId=8180"},
                recordings: [{id: "20343306932", metres: 10110.9, elapsed_time: "0:55:17"}]} satisfies RaceEvent
