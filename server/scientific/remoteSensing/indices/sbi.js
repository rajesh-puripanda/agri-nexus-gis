"use strict";

const sbiDefinition = Object.freeze({
  code: "SBI",
  category: "soil-focused",
  name: "Soil Brightness Index",

  description:
    "A spectral brightness indicator that summarizes the combined " +
    "reflectance magnitude of green, red, and near-infrared bands " +
    "for relative surface brightness characterization.",

  formula:
    "sqrt(Green^2 + Red^2 + NIR^2)",

  requiredBands: Object.freeze([
    "Green",
    "Red",
    "NIR",
  ]),

  sensorCompatibility: Object.freeze([
    "Sentinel-2",
    "Generic multispectral",
  ]),

  validRange: Object.freeze({
    min: 0,
    max: Math.sqrt(3),
  }),

  interpretation:
    "Higher SBI values indicate a stronger combined spectral " +
    "reflectance response and therefore a relatively brighter " +
    "surface. SBI may support discrimination of bright exposed " +
    "soil and other high-reflectance surfaces, but it is not a " +
    "direct measurement of soil fertility, nutrient content, " +
    "organic carbon, moisture, texture, or other laboratory soil " +
    "properties.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",

    note:
      "Baseline classes are interpretive guidance only. " +
      "Brightness thresholds should be calibrated for sensor, " +
      "season, soil condition, vegetation cover, atmospheric " +
      "conditions, and study area.",

    classes: Object.freeze([
      {
        code: "very_low",
        min: 0,
        max: 0.4,
        label: "Very Low Surface Brightness",
      },
      {
        code: "low",
        min: 0.4,
        max: 0.7,
        label: "Low Surface Brightness",
      },
      {
        code: "moderate",
        min: 0.7,
        max: 1.0,
        label: "Moderate Surface Brightness",
      },
      {
        code: "high",
        min: 1.0,
        max: 1.3,
        label: "High Surface Brightness",
      },
      {
        code: "very_high",
        min: 1.3,
        max: Math.sqrt(3),
        label: "Very High Surface Brightness",
      },
    ]),
  }),

  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "sequential",
    clampToValidRange: true,
    nodataHandling: "exclude",
  }),
});

module.exports = sbiDefinition;
