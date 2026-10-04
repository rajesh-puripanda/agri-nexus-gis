"use strict";

const express = require("express");

const {
    processSentinel2IndexProductionWorkflowRequest
} = require(
    "../controllers/" +
    "sentinel2IndexProductionWorkflowController"
);

const router = express.Router();

router.post(
    "/sentinel2-index-production",
    processSentinel2IndexProductionWorkflowRequest
);

module.exports = router;
