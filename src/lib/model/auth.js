import jwt from "jsonwebtoken";

import config from "./../config";
import User from "./user.js";

let sec = config.get("token_hash");

export function createLogin(newUser, newPass, done) {
	newUser = newUser.toLowerCase();

	function filterScan(term, done) {

		let filter = [];

		for (let i = 0; i < filter.length; i++) {
			if (term.toLowerCase().indexOf(filter[i]) !== -1) return done(false);
		}

		return done(true);
	}

	filterScan(newUser, (filtcb) => {
		if (filtcb) {
			User.findByName(newUser, (err, user) => {
				if (err) return done(err, null);

				if (user.length === 0) {
					// Create user
					let userNew = new User({
						"name": newUser,
						"password": newPass,
						"token": jwt.sign({"user": newUser}, sec),
						"flights": []
					});

					// Save User
					userNew.save((err) => {
						if (err) return done(err, null);

						return done(null, {"success": userNew.token});
					});
				}

				if (user.length > 0) return done(null, {"failure": "User exists, please choose a different username"});
			});
		} else {
			// Word Violation
			return done(null, {"failure": "Prohibited term, please choose a different username"});
		}
	});
}

export function login(user, pass, done) {

	User.findByName(user, (err, found) => {
		if (err) return done(err, null);

		if (found.length < 1) return done(null, { "failure": "Bad Username or Password"});

		if (pass !== found[0].password) {
			return done(null, {"failure": "Bad Username or Password"});
		}

		return done(null, {"success": found[0].token});
	});
}

export function book(token, flights, done) {

	User.findByName(jwt.decode(token).user, (err, found) => {
		if (err) return done(err, null);

		if (found) {
			found[0].addflights(flights, (err, count) => {
				if (err) return done("error adding flights", null);

				if (count) {
					found[0].save((err) => {
						if (err) return done(err, null);

						return done(null, count);
					});
				}
			});
		}
	});

}

export function booked(token, done) {

	User.findByName(jwt.decode(token).user, (err, found) => {
		if (err) return done(err, null);

		if (found) return done(null, found[0].flights);

		return done(null, "{}");
	});

}

export function isLoggedIn(token, done) {
	jwt.verify(token, sec, {"ignoreExpiration": true}, (err, verified) => {
		if (err) return done(false);

		if (verified) return done(true);

		done(false);
	});
}
