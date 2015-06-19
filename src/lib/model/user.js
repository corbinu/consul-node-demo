let ottoman = require("ottoman");

import { ODMBucket } from "./db";

ottoman.bucket = ODMBucket;

let Flight = require("./flight");

let UserMdl = ottoman.model("User", {
	"name": "string",
	"password": "string",
	"token": "string",
	"flights": "Mixed"
}, {
	"index": {
		"findByName": {
			"type": "refdoc",
			"by": "name"
		}
	}
});

UserMdl.prototype.addflights = function (newFlights, done) {
	if (typeof this.flights.length === "undefined") this.flights = [];

	let curCount = 0;

	for (let i = 0; i < newFlights.length; i++, curCount++) {
		let curFlight = new Flight({
			"name": newFlights[i]._data.name,
			"flight": newFlights[i]._data.flight,
			"date": newFlights[i]._data.date,
			"sourceairport": newFlights[i]._data.sourceairport,
			"destinationairport": newFlights[i]._data.destinationairport,
			"bookedon": new Date().getTime().toString()
		});

		this.flights.push(curFlight);
	}

	if (curCount === newFlights.length) return done(null, curCount);

	done("error", null);
};

export default UserMdl;
