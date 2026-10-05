"use strict";

const express = require("express");

const {
    discoverSentinel2ObservationsRequest
} = require(
    "../controllers/sentinel2ObservationDiscoveryController"
);

const router = express.Router();

router.post(
    "/sentinel2-observations",
    discoverSentinel2ObservationsRequest
);

module.exports = router;
