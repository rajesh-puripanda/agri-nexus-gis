"use strict";

const express = require("express");

const {
    processSentinel2IndexProductionWorkflowRequest,
    processSentinel2IndexProductionWorkflowStreamRequest
} = require(
    "../controllers/" +
    "sentinel2IndexProductionWorkflowController"
);

const router = express.Router();

router.post(
    "/sentinel2-index-production",
    processSentinel2IndexProductionWorkflowRequest
);

router.post(
    "/sentinel2-index-production-stream",
    processSentinel2IndexProductionWorkflowStreamRequest
);

module.exports = router;
