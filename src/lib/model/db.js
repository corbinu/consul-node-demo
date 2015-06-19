import { Cluster } from "couchbase";
import http from "http";
import request from "request";
import ottoman from "ottoman";

import config from "./../config";

let status = "offline";

export let endPoint;

if (process.env.CB_ENDPOINT) {
	endPoint = process.env.CB_ENDPOINT;
} else if (process.env.CB_IP) {
	endPoint = process.env.CB_IP + ":8091";
} else {
	endPoint = config.couchbase.endPoint;
}

let n1qlService;

if (process.env.CB_N1QL) {
	n1qlService = process.env.CB_N1QL;
} else if (process.env.CB_IP) {
	n1qlService = process.env.CB_IP + ":8093";
} else {
	n1qlService = config.couchbase.n1qlService;
}

let myCluster = new Cluster(endPoint);
let db;

export let myBucket;
export let bucket = config.couchbase.bucket;
export let ODMBucket;

export function init(done) {
	console.log({"init": "check"});

	if (config.application.verbose) console.log("VERBOSE:TRYING QUERY:", "http://" + n1qlService + "/query?statement=SELECT+name+FROM+system%3Akeyspaces");

	request.get({
		"url": "http://" + n1qlService + "/query?statement=SELECT+name+FROM+system%3Akeyspaces",
		"auth": {
			"user": config.couchbase.user,
			"pass": config.couchbase.password,
			"sendImmediately": true
		}
	}, (err, response) => {
		if (err) {
			console.log({"init": "not ready"});

			if (config.application.verbose) console.log("↳ VERBOSE:ERR:", err);

			return done(false);
		}
		if (response.statusCode === 200) {
			if (config.application.verbose) {
				console.log("↳ VERBOSE:QUERY SERVICE:UP");
				console.log("--VERBOSE:TRYING:ITEM COUNT", "http://" + endPoint + "/pools/default/buckets/" + bucket);
			}

			request.get({
				"url": "http://" + endPoint + "/pools/default/buckets/" + bucket,
				"auth": {
					"user": config.couchbase.user,
					"pass": config.couchbase.password,
					"sendImmediately": true
				}
			}, (err, responseB, bodyB) => {
				if (err) {
					console.log({"init": "not ready"});
					if (config.application.verbose) console.log("--↳ VERBOSE:ERR", err);

					return done(false);
				}

				if (parseInt(JSON.parse(bodyB).basicStats.itemCount, 10) > config.couchbase.thresholdItemCount) {
					db = myCluster.openBucket(bucket);
					ODMBucket = myCluster.openBucket(bucket);
					ottoman.store.bucket = ODMBucket;

					query("CREATE INDEX temp ON `" + config.couchbase.bucket + "`(non) USING " + config.couchbase.indexType, (err, res) => {
						if (err) {
							console.log({"init": "not ready"});
							return done(false);
						}

						if (res) {
							query("SELECT COUNT(*) FROM system:indexes WHERE state='online'", (err, onlineCount) => {
								if (err) {
									console.log({"init": "not ready"});

									return done(false);
								}

								if (onlineCount) {
									console.log("INDEXES ONLINE:", onlineCount);
									if (typeof onlineCount[0] !== "undefined") {

										if (onlineCount[0].$1 === 1) {
											query("DROP INDEX `" + config.couchbase.bucket + "`.temp USING " + config.couchbase.indexType, (err, dropped) => {
												if (err) {
													console.log({"init": "not ready"});

													return done(false);
												}
												if (dropped && status !== "online") {
													status = "online";
													console.log({"init": "ready"});

													return done(true);
												}
											});
										}
									}
								}
							});
						}
					});
				} else {
					console.log({"init": "not ready"});

					if (config.application.verbose) console.log("--↳ VERBOSE:ERR:ITEM COUNT", JSON.parse(bodyB).basicStats.itemCount);

					return done(false);
				}
			});
		}
	});
}

init(() => {});

export function reset(done) {
	let mgr = myBucket.manager(config.couchbase.user, config.couchbase.password);

	mgr.flush((err) => {
		if (err) return done(err, null);

		done(null, {"db": "flushed"});

	});
}

export function upsert(key, val, done) {
	db.upsert(key, val, (err, res) => {
		if (err) {
			console.log("DB.UPSERT:", key, ":", err);

			return done(err, null);
		}

		done(null, res);
	});
}

export function read(key, done) {
	db.get(key, (err, result) => {
		if (err) {
			console.log("DB.READ:", err);
			return done(err, null);
		}

		done(null, result);
	});
}

export function docDelete(key, done) {
	db.delete(key, (err) => {
		if (err) {
			console.log("DB.DELETE:", err);
			return done(err, null);
		}

		done(null, true);
	});
}

export function query(sql, done) {
	let N1qlQuery = couchbase.N1qlQuery;

	if (config.couchbase.showQuery) console.log("QUERY:", sql);

	let query = N1qlQuery.fromString(sql);

	db.query(query, (err, result) => {
		if (err) {
			console.log("ERR:", err);
			return done(err, null);
		}

		return done(null, result);
	});
}

export function ops(done) {
	http.get("http://" + endPoint + "/pools/default/buckets/" + bucket, (result) => {
		let data = "";

		result.setEncoding("utf8");
		result.on("data", (chunk) => { data += chunk; });

		result.on("end", () => {
			let parsed = JSON.parse(data);

			return done(null, Math.round(parsed.basicStats.opsPerSec));
		});
	});
}
