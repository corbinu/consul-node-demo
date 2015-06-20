import { install as installSourceMaps } from "source-map-support";
installSourceMaps();

import request from "request";

import { query, init } from "./lib/db";
import config from "./lib/config";

let available = false;
let online = false;
let timerAvailable;
let timerOnline;
let tryCount = 0;

let endPoint = config.get("cb.ip") + ":8091";

function isAvailable(done) {
	tryCount = 0;
	timerAvailable = setInterval(() => {
		console.log("CHECKING IF INDEX SERVICE READY:ATTEMPT ", ++tryCount);
		init((initialized) => {
			if (initialized && !available) {
				available = true;
				clearInterval(timerAvailable);
				return done(true);
			}
		});
	}, config.get("check_interval"));
}

function isOnline(done) {
	tryCount = 0;
	timerOnline = setInterval(() => {
		console.log("CHECKING IF 8 INDEXES ARE ONLINE:ATTEMPT ", ++tryCount);
		query("SELECT COUNT(*) FROM system:indexes WHERE state=\"online\"", (err, onlineCount) => {
			if (err) console.log(err);

			if (onlineCount) {
				console.log("INDEXES ONLINE:", onlineCount);

				if (typeof onlineCount[0] !== "undefined") {
					if (onlineCount[0].$1 === 8 && !online) {
						online = true;
						clearInterval(timerOnline);
						return done(true);
					}
				}
			}
		});
	}, config.get("check_interval"));
}

function buidIndexes(done) {
	if (config.get("cb.index") === "view") {
		let indexesCB = ["faa", "icao", "city", "airportname", "type", "sourceairport"];

		query("CREATE PRIMARY INDEX on `" + config.get("cb.bucket") + "` USING " + config.get("cb.index"), () => {});
		query("CREATE INDEX def_name_type on `" + config.get("cb.bucket") + "`(name) WHERE _type='User' USING " + config.get("cb.index"));

		let cbCount = indexesCB.length - 1;

		function createIndex(index) {
			return (err, res) => {
				if (err) return done({"err": "can't create index " + index + err}, null);

				if (res) {
					cbCount--;
					if (cbCount === 0) {
						console.log({"indexes": "built"});
						return done(null, {"indexes": "built"});
					}
				}
			};
		}

		for (let i = 0; i < indexesCB.length; i++) {
			let sql = ("CREATE INDEX def_" + indexesCB[i] + " ON `" + config.get("cb.bucket") + "`(" + indexesCB[i] + ") USING " + config.get("cb.index"));

			query(sql, createIndex(indexesCB[i]));
		}
	}
	if (config.get("cb.index") === "gsi") {
		let buildStr = "BUILD INDEX ON `" + config.get("cb.bucket") + "`(def_primary,def_name_type";
		let indexesCB = ["faa", "icao", "city", "airportname", "type", "sourceairport"];

		query("CREATE PRIMARY INDEX def_primary on `" + config.get("cb.bucket") + "` USING " + config.get("cb.index") + " WITH {\"defer_build\": true}", () => {});
		query("CREATE INDEX def_name_type on `" + config.get("cb.bucket") + "`(name) WHERE _type='User' USING " + config.get("cb.index") + " WITH {\"defer_build\": true}", () => {});

		let cbCount = indexesCB.length - 1;

		function createIndex(index) {
			return (err, res) => {
				if (err) return done({"err": "can't create index " + index + err}, null);

				if (res) {
					cbCount--;

					if (cbCount === 0) {
						buildStr += ") USING GSI";
						setTimeout(() => {
							query(buildStr, (err, indexBuilt) => {
								if (err) return done({"err": "can't build indexes " + err}, null);

								if (indexBuilt) {
									isOnline((online) => {
										if (online) {
											console.log({"indexes": "built"});
											return done(null, {"indexes": "built"});
										}

									});
								}
							});
						}, config.get("wait"));
					}
				}
			};
		}

		for (let i = 0; i < indexesCB.length; i++) {
			let sql = "CREATE INDEX def_" + indexesCB[i] + " ON `" + config.get("cb.bucket") + "`(" + indexesCB[i] + ") USING " +
				config.get("cb.index") + " WITH {\"defer_build\": true}";

			buildStr += (",def_" + indexesCB[i]);

			query(sql, createIndex(indexesCB[i]));
		}
	}
}

function provisionBucket(done) {
	console.log("provisioning bucket");
	request.post({
		"url": "http://" + endPoint + "/sampleBuckets/install",
		"headers": {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		"form": JSON.stringify([config.get("cb.bucket")]),
		"auth": {
			"user": config.get("cb.username"),
			"pass": config.get("cb.password"),
			"sendImmediately": true
		}
	}, (err, httpResponse) => {
		if (err) return done(err, null);

		console.log({"provisionBucket": httpResponse.statusCode});

		available = false;
		isAvailable((ready) => {

			if (ready) {
				console.log({"bucket": "built"});

				buidIndexes((err, indexed) => {
					if (err) return done(err, null);

					if (indexed) return done(null, {"environment": "built"});
				});
			}
		});
	});
}

console.log("AUTOPROVISION_BU:INITIATED");
provisionBucket((err, done) => {
	if (err) return console.log("AUTOPROVISION_BU:ERR:FATAL:", err);

	console.log("AUTOPROVISION_BU:DONE:", done);
});

/*
function provisionInit(done) {
	let dataPath;
	let indexPath;

	if (config.couchbase.dataPath === "") {
		if (process.platform === "darwin") {
			dataPath = "/Users/" + process.env.USER + "/Library/Application Support/Couchbase/var/lib/couchbase/data";
		} else {
			dataPath = "/opt/couchbase/var/lib/couchbase/data";
		}
	}

	if (config.couchbase.indexPath !== "") {
		if (process.platform === "darwin") {
			indexPath = "/Users/" + process.env.USER + "/Library/Application Support/Couchbase/var/lib/couchbase/data";
		} else {
			indexPath = "/opt/couchbase/var/lib/couchbase/data";
		}
	}
	request.post({
		"url": "http://" + endPoint + "/nodes/self/controller/settings",
		"form": {
			"path": dataPath,
			"index_path": indexPath
		}
	}, (err, httpResponse) => {

		if (err) return done(err, null);

		console.log({"provisionInit": httpResponse.statusCode});

		done(null, httpResponse);
	});
}

function provisionRename(done) {
	request.post({
		"url": "http://" + endPoint + "/node/controller/rename",
		"form": {
			"hostname": config.get("cb.address")
		}
	}, (err, httpResponse) => {
		if (err) return done(err, null);

		console.log({"provisionRename": httpResponse.statusCode});

		done(null, httpResponse.statusCode);
	});
}

function provisionServices(done) {
	request.post({
		"url": "http://" + endPoint + "/node/controller/setupServices",
		"form": {
			"services": "kv,n1ql,index"
		}
	}, (err, httpResponse) => {
		if (err) return done(err, null);

		console.log({"provisionServices": httpResponse.statusCode});

		done(null, httpResponse.statusCode);
	});
}

function provisionMemory(done) {
	request.post({
		"url": "http://" + endPoint + "/pools/default",
		"form": {
			"indexMemoryQuota": config.couchbase.indexMemQuota,
			"memoryQuota": config.couchbase.dataMemQuota
		}
	}, (err, httpResponse) => {
		if (err) return done(err, null);

		console.log({"provisionServices": httpResponse.statusCode});

		done(null, httpResponse.statusCode);

	});
}

function provisionAdmin(done) {
	request.post({
		"url": "http://" + endPoint + "/settings/web",
		"form": {
			"password": config.couchbase.password,
			"username": config.couchbase.username,
			"port": "SAME"
		}
	}, (err, httpResponse) => {
		if (err) return done(err, null);

		console.log({"provisionAdmin": httpResponse.statusCode});

		done(null, httpResponse.statusCode);
	});
}

export function provision(done) {
	provisionInit((err, init) => {
		if (err) return done(err, null);

		if (init) {
			provisionRename((err, rename) => {
				if (err) return done(err, null);

				if (rename) {
					provisionServices((err, services) => {
						if (err) return done(err, null);

						if (services) {
							provisionMemory((err, mem) => {
								if (err) return done(err, null);

								if (mem) {
									provisionAdmin((err, admin) => {
										if (err) return done(err, null);

										if (admin) {
											provisionBucket((err, bucket) => {
												if (err) return done(err, null);

												if (bucket) {
													available = false;
													isAvailable((ready) => {
														if (ready) {
															console.log({"bucket": "built"});
															return done(null, {"bucket": "built"});
														}
													});
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
}
*/
