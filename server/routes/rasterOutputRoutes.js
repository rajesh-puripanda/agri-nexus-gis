"use strict";

const express = require("express");

const router = express.Router();

const {
    serveRasterOutput,
    serveRasterRender,
    serveSoilVegetationClassification,
    serveBareSoilFrequency
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

router.get(
    "/analysis/soil-vegetation/:sceneId",
    serveSoilVegetationClassification
);

router.get(
    "/analysis/bare-soil-frequency",
    serveBareSoilFrequency
);

module.exports = router;
