import { install as installSourceMaps } from "source-map-support";
installSourceMaps();

module.exports = require("./lib");
