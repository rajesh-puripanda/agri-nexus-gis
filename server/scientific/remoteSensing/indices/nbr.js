"use strict";

const nbrDefinition = Object.freeze({
  code: "NBR",
  category: "spectral",
  name: "Normalized Burn Ratio",
  description:
    "A spectral index using near-infrared and shortwave-infrared reflectance to highlight burned areas and vegetation recovery.",
  formula: "(NIR - SWIR2) / (NIR + SWIR2)",
  requiredBands: Object.freeze(["NIR", "SWIR2"]),
  sensorCompatibility: Object.freeze([
    "Landsat",
    "Sentinel-2",
    "Generic multispectral",
  ]),
  validRange: Object.freeze({ min: -1, max: 1 }),
  interpretation:
    "Lower NBR values can indicate burned or sparsely vegetated surfaces; changes between pre-fire and post-fire observations are commonly used to assess burn severity. Interpretation depends on sensor, acquisition conditions, and ecosystem.",
  classificationRules: Object.freeze({
    method: "baseline_qualitative",
    note:
      "Do not treat thresholds as calibrated. Use locally validated thresholds and, for burn severity, compare appropriate pre-fire and post-fire observations.",
    classes: Object.freeze([]),
  }),
  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "diverging",
    clampToValidRange: false,
    nodataHandling: "exclude",
  }),
});

module.exports = nbrDefinition;
