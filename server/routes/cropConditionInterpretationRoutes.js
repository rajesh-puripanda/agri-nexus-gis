"use strict";

const express = require("express");
const {
    postCropConditionInterpretation
} = require("../controllers/cropConditionInterpretationController");
const {
    postCropConditionTemporalInterpretation
} = require("../controllers/cropConditionTemporalInterpretationController");
const {
    getCropConditionTemporalChangeRaster
} = require("../controllers/cropConditionRasterController");
const router = express.Router();

router.post(
    "/crop-interpretation",
    postCropConditionInterpretation
);

router.post(
    "/crop-interpretation/temporal",
    postCropConditionTemporalInterpretation
);
router.get(
    "/crop-condition/comparisons/:comparisonId/raster",
    getCropConditionTemporalChangeRaster
);
module.exports = router;
