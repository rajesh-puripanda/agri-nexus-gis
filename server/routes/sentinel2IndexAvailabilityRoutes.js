"use strict";

const express = require("express");

const {
    getSentinel2IndexAvailability,
    getSentinel2AvailableProductDates,
    getSentinel2TemporalProductEligibility
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

router.get(
    "/availability/temporal-products",
    getSentinel2TemporalProductEligibility
);

module.exports = router;
