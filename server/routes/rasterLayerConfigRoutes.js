"use strict";

const express = require("express");

const router = express.Router();

const {
    getRasterLayerConfiguration
} = require(
    "../controllers/rasterLayerConfigController"
);

router.get(
    "/config",
    getRasterLayerConfiguration
);

module.exports = router;
