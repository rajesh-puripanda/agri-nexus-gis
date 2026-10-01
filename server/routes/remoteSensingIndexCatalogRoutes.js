"use strict";

const express = require("express");

const router = express.Router();

const {
    getRemoteSensingIndexCatalog
} = require(
    "../controllers/remoteSensingIndexCatalogController"
);

router.get(
    "/",
    getRemoteSensingIndexCatalog
);

module.exports = router;
