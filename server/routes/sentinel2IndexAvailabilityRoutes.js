"use strict";

const express = require("express");

const {
    getSentinel2IndexAvailability
} = require(
    "../controllers/" +
    "sentinel2IndexAvailabilityController"
);

const router = express.Router();

router.get(
    "/availability",
    getSentinel2IndexAvailability
);

module.exports = router;
