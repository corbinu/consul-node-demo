import request from "request";
import fs from "fs";

import { query } from "./db";
import config from "./../config";


let available = false;
let online = false;
let timerAvailable;
let timerOnline;
let tryCount = 0;
let checkInterval = config.application.checkInterval;
let hostname = process.env.CB_HOSTNAME || process.env.CB_IP || config.couchbase.hostname;
let autoprovisionBucket = process.env.TRAVEL_AUTO;
let autoprovisionCB = process.env.CB_AUTO || config.couchbase.autoprovision;

let endPoint;

if (process.env.CB_ENDPOINT) {
	endPoint = process.env.CB_ENDPOINT;
} else if (process.env.CB_IP) {
	endPoint = process.env.CB_IP + ":8091";
} else {
	endPoint = config.couchbase.endPoint;
}

if (autoprovisionCB) {
	console.log("AUTOPROVISION_CB:INITIATED");

	provisionCB((err, done) => {
		if (err) return console.log("AUTOPROVISION_CB:ERR:FATAL:", err);

		config.application.autoprovision = false;
		fs.writeFile("config.json", JSON.stringify(config, null, 4), (err) => {
			if (err) console.log("AUTOPROVISION_CB:ERR:FILESAVE:", err);
		});
		console.log("AUTOPROVISION_CB:DONE:", done);
	});
} else if (autoprovisionBucket) {
	console.log("AUTOPROVISION_BU:INITIATED");
	provisionBu((err, done) => {
		if (err) return console.log("AUTOPROVISION_BU:ERR:FATAL:", err);

		console.log("AUTOPROVISION_BU:DONE:", done);
	});
}

export function buidIndexes(done) {
	if (config.couchbase.indexType === "view") {
		let indexesCB = ["faa", "icao", "city", "airportname", "type", "sourceairport"];

		query("CREATE PRIMARY INDEX on `" + config.couchbase.bucket + "` USING " + config.couchbase.indexType, () => {});
		query("CREATE INDEX def_name_type on `" + config.couchbase.bucket + "`(name) WHERE _type='User' USING " + config.couchbase.indexType);

		let cbCount = indexesCB.length - 1;

		for (let i = 0; i < indexesCB.length; i++) {
			let sql = ("CREATE INDEX def_" + indexesCB[i] + " ON `" + config.couchbase.bucket + "`(" + indexesCB[i] + ") USING " + config.couchbase.indexType);

			query(sql, (err, res) => {
				if (err) return done({"err": "can't create index " + indexesCB[i] + err}, null);

				if (res) {
					cbCount--;
					if (cbCount === 0) {
						console.log({"indexes": "built"});
						return done(null, {"indexes": "built"});
					}
				}
			});
		}
	}
	if (config.couchbase.indexType === "gsi") {
		let buildStr = "BUILD INDEX ON `" + config.couchbase.bucket + "`(def_primary,def_name_type";
		let indexesCB = ["faa", "icao", "city", "airportname", "type", "sourceairport"];

		query("CREATE PRIMARY INDEX def_primary on `" + config.couchbase.bucket + "` USING " + config.couchbase.indexType + " WITH {\"defer_build\": true}", () => {});
		query("CREATE INDEX def_name_type on `" + config.couchbase.bucket + "`(name) WHERE _type='User' USING " + config.couchbase.indexType + " WITH {\"defer_build\": true}", () => {});

		let cbCount = indexesCB.length - 1;

		for (let i = 0; i < indexesCB.length; i++) {
			let sql = "CREATE INDEX def_" + indexesCB[i] + " ON `" + config.couchbase.bucket + "`(" + indexesCB[i] + ") USING " +
				config.couchbase.indexType + " WITH {\"defer_build\": true}";

			buildStr += (",def_" + indexesCB[i]);

			query(sql, (err, res) => {
				if (err) return done({"err": "can't create index " + indexesCB[i] + err}, null);
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
						}, config.application.wait);
					}
				}
			});
		}
	}
}

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
	}, checkInterval);
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
	}, checkInterval);
}

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
			"hostname": hostname
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
			"username": config.couchbase.user,
			"port": "SAME"
		}
	}, (err, httpResponse) => {
		if (err) return done(err, null);

		console.log({"provisionAdmin": httpResponse.statusCode});

		done(null, httpResponse.statusCode);
	});
}

export function provisionBucket(done) {
	if (config.application.dataSource === "embedded") {
		console.log("provisioning bucket");
		request.post({
			"url": "http://" + endPoint + "/sampleBuckets/install",
			"headers": {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			"form": JSON.stringify([config.couchbase.bucket]),
			"auth": {
				"user": config.couchbase.user,
				"pass": config.couchbase.password,
				"sendImmediately": true
			}
		}, (err, httpResponse) => {
			if (err) return done(err, null);

			console.log({"provisionBucket": httpResponse.statusCode});

			done(null, httpResponse.statusCode);
		});
	}
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

function provisionBu(done) {

	provisionBucket((err, bucket) => {
		if (err) return done(err, null);

		if (bucket) {
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
		}
	});

}

export function provisionCB(done) {
	provision((err, cluster) => {
		if (err) return done(err, null);

		if (cluster) {
			if (config.application.dataSource === "embedded") {
				buidIndexes((err, indexed) => {
					if (err) return done(err, null);

					if (indexed) return done(null, {"environment": "built"});
				});
			}
		}
	});
}
