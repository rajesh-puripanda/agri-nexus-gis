"use strict";

const express = require("express");
const {
    postCropConditionInterpretation
} = require("../controllers/cropConditionInterpretationController");
const {
    postCropConditionTemporalInterpretation
} = require("../controllers/cropConditionTemporalInterpretationController");

const router = express.Router();

router.post(
    "/crop-interpretation",
    postCropConditionInterpretation
);

router.post(
    "/crop-interpretation/temporal",
    postCropConditionTemporalInterpretation
);

module.exports = router;
