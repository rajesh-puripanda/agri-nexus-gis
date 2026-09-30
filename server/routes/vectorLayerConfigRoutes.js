"use strict";

const express = require("express");

const router = express.Router();

const {
    getVectorLayerConfiguration
} = require(
    "../controllers/vectorLayerConfigController"
);

router.get(
    "/config",
    getVectorLayerConfiguration
);

module.exports = router;
