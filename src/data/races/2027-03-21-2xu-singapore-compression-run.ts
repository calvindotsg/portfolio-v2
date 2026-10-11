import type {RaceEvent} from "../../lib/race"

/**
 * BOOKED ON 10 OCT 2026, FOR NEXT YEAR, so it is a bib on the wall and nothing on a goal card.
 * `eventsInYear` hands the cards only `GOAL_YEAR`'s races, and this one starts in 2027: it
 * moves no 2026 required rate and is not the 2026 running card's next race. It joins the
 * cards at the year rollover, not before.
 *
 * 21.10 IS THE DIVISION ENTERED, the 21.1 km individual category on his confirmation, and the
 * date and name are the organiser's (2xurun.com). The registration's own details stay out.
 */
export default {date: "2027-03-21", name: "2XU Singapore Compression Run 2027", advertised_km: 21.10, sport: "running", country: "Singapore"} satisfies RaceEvent
