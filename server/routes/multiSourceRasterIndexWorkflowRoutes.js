"use strict";

const express = require("express");

const {
    processMultiSourceRasterIndexWorkflowRequest
} = require(
    "../controllers/multiSourceRasterIndexWorkflowController"
);

const router =
    express.Router();

router.post(
    "/multi-source-index-workflow",
    processMultiSourceRasterIndexWorkflowRequest
);

module.exports = router;
