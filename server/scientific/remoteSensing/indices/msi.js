"use strict";

const msiDefinition = Object.freeze({
  code: "MSI",
  category: "spectral",
  name: "Moisture Stress Index",
  description:
    "A shortwave-infrared to near-infrared reflectance ratio used as an indicator of vegetation moisture stress.",
  formula: "SWIR1 / NIR",
  requiredBands: Object.freeze(["SWIR1", "NIR"]),
  sensorCompatibility: Object.freeze([
    "Landsat",
    "Sentinel-2",
    "Generic multispectral",
  ]),
  validRange: Object.freeze({ min: 0, max: 1000000 }),
  interpretation:
    "Higher MSI values generally indicate greater vegetation moisture stress; interpretation depends on vegetation, sensor, processing, and study conditions. The range is a computational guard, not a universal ecological threshold.",
  classificationRules: Object.freeze({
    method: "baseline_qualitative",
    note:
      "Do not treat thresholds as calibrated. Establish local thresholds against field or other independent observations.",
    classes: Object.freeze([]),
  }),
  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "sequential",
    clampToValidRange: false,
    nodataHandling: "exclude",
  }),
});

module.exports = msiDefinition;
