"use strict";

const express = require("express");

const {
    discoverLocalSentinel2ObservationsRequest
} = require(
    "../controllers/sentinel2LocalObservationController"
);

const router = express.Router();

router.get(
    "/sentinel2-local-observations",
    discoverLocalSentinel2ObservationsRequest
);

module.exports = router;