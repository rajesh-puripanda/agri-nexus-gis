"use strict";

const express = require("express");

const {
    getSentinel2IndexAvailability,
    getSentinel2AvailableProductDates
} = require(
    "../controllers/" +
    "sentinel2IndexAvailabilityController"
);

const router = express.Router();

router.get(
    "/availability/dates",
    getSentinel2AvailableProductDates
);
router.get(
    "/availability",
    getSentinel2IndexAvailability
);

module.exports = router;
