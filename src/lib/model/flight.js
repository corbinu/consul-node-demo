import ottoman from "ottoman";

import { ODMBucket } from "./db";

ottoman.bucket = ODMBucket;

export default ottoman.model("Flight", {
    "name": "string",
	"flight": "string",
	"date": "string",
	"sourceairport": "string",
	"destinationairport": "string",
	"bookedon": "string"
});
