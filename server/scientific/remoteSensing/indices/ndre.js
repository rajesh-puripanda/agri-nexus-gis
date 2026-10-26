"use strict";

const ndreDefinition = Object.freeze({
  code: "NDRE",
  category: "spectral",
  name: "Normalized Difference Red Edge Index",
  description:
    "A Sentinel-2 red-edge index using B8A and B05, useful for assessing relative vegetation canopy and chlorophyll-related variation.",
  formula: "(RedEdge4 - RedEdge1) / (RedEdge4 + RedEdge1)",
  requiredBands: Object.freeze(["RedEdge4", "RedEdge1"]),
  sensorCompatibility: Object.freeze(["Sentinel-2"]),
  validRange: Object.freeze({ min: -1, max: 1 }),
  interpretation:
    "Relative NDRE variation can indicate differences in vegetation canopy and chlorophyll-related conditions. NDRE is not a direct LAI or chlorophyll measurement; interpretation requires appropriate local validation.",
  classificationRules: Object.freeze({
    method: "baseline_qualitative",
    note:
      "Classification thresholds are not calibrated. Establish local thresholds against field or other independent observations.",
    classes: Object.freeze([]),
  }),
  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "sequential",
    clampToValidRange: false,
    nodataHandling: "exclude",
  }),
});

module.exports = ndreDefinition;
