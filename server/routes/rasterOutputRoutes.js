"use strict";

const express = require("express");

const router = express.Router();

const {
    serveRasterOutput
} = require(
    "../controllers/rasterOutputController"
);

router.get(
    "/output/:indexCode/:type",
    serveRasterOutput
);

module.exports = router;