import { query } from "./db";
import config from "./../config";

export function findAll(queryStr, done) {
	let queryPrep;

	if (queryStr.length === 3) {
		queryPrep = "SELECT airportname FROM `" + config.couchbase.bucket + "` WHERE faa ='" + queryStr.toUpperCase() + "'";
	} else if (queryStr.length === 4 && (queryStr === queryStr.toUpperCase() || queryStr === queryStr.toLowerCase())) {
		queryPrep = "SELECT airportname FROM `" + config.couchbase.bucket + "` WHERE icao ='" + queryStr.toUpperCase() + "'";
	} else {
		queryPrep = "SELECT airportname FROM `" + config.couchbase.bucket + "` WHERE airportname LIKE '" + queryStr + "%'";
	}

	query(queryPrep, done);
}

export function findbycode(queryStr, done) {
	query("SELECT faa FROM `" + config.couchbase.bucket + "` WHERE airportname = '" + queryStr + "'", done);
}
