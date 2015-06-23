import express from "express";
import path from "path";

import config from "./config";
import setupRoutes from "./routes";

let app = express();

app.use(express.static(path.resolve("public")));

setupRoutes(app);

app.listen(config.get("port"));
