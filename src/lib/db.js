import { Cluster, N1qlQuery } from "couchbase";
import http from "http";
import ottoman from "ottoman";
import request from "request";

import config from "./config";

let status = "offline";

export let endPoint = config.get("cb.ip") + ":" + config.get("cb.port");
let n1qlService = config.get("cb.ip") + ":" + config.get("cb.n1qlport");

export let myCluster = new Cluster(endPoint);
let db;

export let myBucket;
export let bucket = config.get("cb.bucket");
export let ODMBucket;

export function init(done) {
	console.log({"init": "check"});

	if (config.get("log") === "verbose") console.log("VERBOSE:TRYING QUERY:", "http://" + n1qlService + "/query?statement=SELECT+name+FROM+system%3Akeyspaces");

	request.get({
		"url": "http://" + n1qlService + "/query?statement=SELECT+name+FROM+system%3Akeyspaces",
		"auth": {
			"user": config.get("cb.username"),
			"pass": config.get("cb.password"),
			"sendImmediately": true
		}
	}, (err, response) => {
		if (err) {
			console.log({"init": "not ready"});

			if (config.get("log") === "verbose") console.log("↳ VERBOSE:ERR:", err);

			return done(false);
		}
		if (response.statusCode === 200) {
			if (config.get("log") === "verbose") {
				console.log("↳ VERBOSE:QUERY SERVICE:UP");
				console.log("--VERBOSE:TRYING:ITEM COUNT", "http://" + endPoint + "/pools/default/buckets/" + bucket);
			}

			request.get({
				"url": "http://" + endPoint + "/pools/default/buckets/" + bucket,
				"auth": {
					"user": config.get("cb.username"),
					"pass": config.get("cb.password"),
					"sendImmediately": true
				}
			}, (err, responseB, bodyB) => {
				if (err) {
					console.log({"init": "not ready"});
					if (config.get("log") === "verbose") console.log("--↳ VERBOSE:ERR", err);

					return done(false);
				}

				if (parseInt(JSON.parse(bodyB).basicStats.itemCount, 10) > config.get("cb.item_threshold")) {
					db = myCluster.openBucket(bucket);
					ODMBucket = myCluster.openBucket(bucket);

					query("CREATE INDEX temp ON `" + config.get("cb.bucket") + "`(non) USING " + config.get("cb.index"), (err, res) => {
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
											query("DROP INDEX `" + config.get("cb.bucket") + "`.temp USING " + config.get("cb.index"), (err, dropped) => {
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

					if (config.get("log") === "verbose") console.log("--↳ VERBOSE:ERR:ITEM COUNT", JSON.parse(bodyB).basicStats.itemCount);

					return done(false);
				}
			});
		}
	});
}

function initOther(done) {
	console.log({"init": "check"});

	if (config.get("log") === "verbose") console.log("VERBOSE:TRYING QUERY:", "http://" + n1qlService + "/query?statement=SELECT+name+FROM+system%3Akeyspaces");

	request.get({
		"url": "http://" + n1qlService + "/query?statement=SELECT+name+FROM+system%3Akeyspaces",
		"auth": {
			"user": config.get("cb.username"),
			"pass": config.get("cb.password"),
			"sendImmediately": true
		}
	}, (err, response) => {
		if (err) {
			console.log({"init": "not ready"});

			if (config.get("log") === "verbose") console.log("↳ VERBOSE:ERR:", err);

			return done(false);
		}
		if (response.statusCode === 200) {
			if (config.get("log") === "verbose") {
				console.log("↳ VERBOSE:QUERY SERVICE:UP");
				console.log("--VERBOSE:TRYING:ITEM COUNT", "http://" + endPoint + "/pools/default/buckets/" + bucket);
			}

			request.get({
				"url": "http://" + endPoint + "/pools/default/buckets/" + bucket,
				"auth": {
					"user": config.get("cb.username"),
					"pass": config.get("cb.password"),
					"sendImmediately": true
				}
			}, (err, responseB, bodyB) => {
				if (err) {
					console.log({"init": "not ready"});
					if (config.get("log") === "verbose") console.log("--↳ VERBOSE:ERR", err);

					return done(false);
				}

				if (parseInt(JSON.parse(bodyB).basicStats.itemCount, 10) > config.get("cb.item_threshold")) {
					db = myCluster.openBucket(bucket);
					ODMBucket = myCluster.openBucket(bucket);
					ottoman.store.bucket = ODMBucket;

					query("CREATE INDEX temp ON `" + config.get("cb.bucket") + "`(non) USING " + config.get("cb.index"), (err, res) => {
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
											query("DROP INDEX `" + config.get("cb.bucket") + "`.temp USING " + config.get("cb.index"), (err, dropped) => {
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

					if (config.get("log") === "verbose") console.log("--↳ VERBOSE:ERR:ITEM COUNT", JSON.parse(bodyB).basicStats.itemCount);

					return done(false);
				}
			});
		}
	});
}

initOther(() => {});

export function reset(done) {
	let mgr = myBucket.manager(config.get("cb.username"), config.get("cb.password"));

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
	if (config.get("cb.log") === "default") console.log("QUERY:", sql);

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
