"use strict";

const express = require("express");

const router = express.Router();

const {
    serveRasterOutput,
    serveRasterRender
} = require(
    "../controllers/rasterOutputController"
);

router.get(
    "/output/:indexCode/:type",
    serveRasterOutput
);

router.get(
    "/render/:indexCode/:type",
    serveRasterRender
);

module.exports = router;
