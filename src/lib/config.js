import convict from "convict";

// define a schema

let conf = convict({
    "env": {
        "doc": "The applicaton environment.",
        "format": ["production", "development", "test"],
        "default": "development",
        "env": "NODE_ENV"
    },
    "port": {
        "doc": "The port to bind.",
        "format": "port",
        "default": 0,
        "env": "DEMO_PORT"
    },
    "log": {
        "doc": "How much logging should take place",
        "format": ["none", "default", "verbose"],
        "default": "default",
        "env": "DEMO_LOG"
    },
    "token_hash": {
        "doc": "Token for JSON Web Token",
        "format": String,
        "default": "UNSECURE_SECRET_TOKEN",
        "env": "DEMO_TOKEN_HASH"
    },
    "speed": {
        "doc": "Average KM per Hour for flight time",
        "format": "nat",
        "default": 800,
        "env": "DEMO_SPEED"
    },
    "cost": {
        "doc": "Distance cost multiplier",
        "format": Number,
        "default": 0.1,
        "env": "DEMO_COST"
    },
    "check_interval": {
        "doc": "Check interval for setting up db",
        "format": "nat",
        "default": 3000,
        "env": "DEMO_CHECK_INTERVAL"
    },
    "wait": {
        "doc": "How long to wait for DB indexes to be ready",
        "format": "nat",
        "default": 5000,
        "env": "DEMO_WAIT"
    },
    "cb": {
        "ip": {
            "doc": "The couchbase ip address",
            "format": "ipaddress",
            "default": "127.0.0.1",
            "env": "CB_IP"
        },
        "port": {
            "doc": "The couchbase port",
            "format": "port",
            "default": 8091,
            "env": "CB_PORT"
        },
        "n1qlport": {
            "doc": "The couchbase N1QL port",
            "format": "port",
            "default": 8093,
            "env": "CB_N1QLPORT"
        },
        "bucket": {
            "doc": "The couchbase bucket",
            "format": String,
            "default": "travel-sample",
            "env": "CB_BUCKET"
        },
        "username": {
            "doc": "The couchbase username",
            "format": String,
            "default": "Administrator",
            "env": "CB_USERNAME"
        },
        "password": {
            "doc": "The couchbase password",
            "format": String,
            "default": "password",
            "env": "CB_PASSWORD"
        },
        "index": {
            "doc": "The couchbase index type",
            "format": [ "gsi", "view" ],
            "default": "gsi",
            "env": "CB_INDEX_TYPE"
        },
        "log": {
            "doc": "How much couchbase logging should take place",
            "format": ["none", "default", "verbose"],
            "default": "default",
            "env": "CB_LOG"
        },
        "item_threshold": {
            "doc": "How much many items should be in the bucket",
            "format": "nat",
            "default": 31565,
            "env": "CB_ITEM_THRESHOLD"
        }
    }
});

conf.loadFile([`./config/${conf.get("env")}.json`]);

conf.validate();

export default conf;
