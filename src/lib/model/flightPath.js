import haversine from "haversine";

import config from "./../config";
import { query } from "./../db";

function convDate(dateStr) {
	let d = new Date(Date.parse(dateStr));

	return parseInt(d.getDay(), 10) + 1;
}

export function findAll(from, to, leave, done) {
	if (config.get("log") === "verbose") console.log("↳ VERBOSE:FINDALLL:", {"from": from, "to": to, "leave": leave}, ":REQ");

	let queryPrep = "SELECT faa as fromAirport,geo FROM `" + config.get("cb.bucket") + "` WHERE airportname = '" + from +
		"' UNION SELECT faa as toAirport,geo FROM `" + config.get("cb.bucket") + "` WHERE airportname = '" + to + "'";

	query(queryPrep, (err, res) => {
		if (err) return done(err, null);

		if (res) {

			let queryTo;
			let queryFrom;
			let geoStart;
			let geoEnd;
			let flightTime;
			let price;
			let distance;

			for (let i = 0; i < res.length; i++) {
				if (res[i].toAirport) {
					queryTo = res[i].toAirport;
					geoEnd = {"longitude": res[i].geo.lon, "latitude": res[i].geo.lat};
				}
				if (res[i].fromAirport) {
					queryFrom = res[i].fromAirport;
					geoStart = {"longitude": res[i].geo.lon, "latitude": res[i].geo.lat};
				}
			}

			distance = haversine(geoStart, geoEnd);
			flightTime = Math.round(distance / config.get("speed"));
			price = Math.round(distance * config.get("cost"));

			queryPrep = "SELECT r.id, a.name, s.flight, s.utc, r.sourceairport, r.destinationairport, r.equipment " +
				"FROM `" + config.get("cb.bucket") + "` r UNNEST r.schedule s JOIN `" +
				config.get("cb.bucket") + "` a ON KEYS r.airlineid WHERE r.sourceairport='" + queryFrom +
				"' AND r.destinationairport='" + queryTo + "' AND s.day=" + convDate(leave) + " ORDER BY a.name";

			query(queryPrep, (err, flightPaths) => {
				if (err) return done(err, null);

				if (flightPaths) {
					if (config.get("log") === "verbose") console.log("--↳ VERBOSE:FINDALLL:", {"from": from, "to": to, "leave": leave}, ":RESULTS:COUNT:", flightPaths.length);

					let resCount = flightPaths.length;

					for (let r = 0; r < flightPaths.length; r++) {
						resCount--;
						flightPaths[r].flighttime = flightTime;
						flightPaths[r].price = Math.round(price * ((100 - (Math.floor(Math.random() * (20) + 1))) / 100));

						if (resCount === 0) {
							if (config.get("log") === "verbose") console.log("----↳ VERBOSE:FINDALLL:", {"from": from, "to": to, "leave": leave}, ":RESULTS:RETURNING:", flightPaths.length);

							return done(null, flightPaths);
						}
					}
					if (config.get("log") === "verbose") {
						console.log("------↳ VERBOSE:FINDALLL:", {"from": from, "to": to, "leave": leave}, ":RESULTS:NOT RETURNED:", flightPaths.length);
					}
				}
			});
		}
	});
}
