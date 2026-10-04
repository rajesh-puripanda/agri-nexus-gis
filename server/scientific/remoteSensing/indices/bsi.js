"use strict";

const bsiDefinition = Object.freeze({
  code: "BSI",
  category: "soil-focused",
  name: "Bare Soil Index",

  description:
    "A normalized spectral index used to characterize the relative spectral response of exposed or soil-dominated surfaces using visible, near-infrared, and shortwave-infrared reflectance.",

  formula:
    "((SWIR1 + Red) - (NIR + Blue)) / " +
    "((SWIR1 + Red) + (NIR + Blue))",

  requiredBands: Object.freeze([
    "Blue",
    "Red",
    "NIR",
    "SWIR1",
  ]),

  sensorCompatibility: Object.freeze([
    "Landsat",
    "Sentinel-2",
    "Generic multispectral",
  ]),

  validRange: Object.freeze({
    min: -1,
    max: 1,
  }),

  interpretation:
    "Higher BSI values generally indicate a stronger spectral response associated with exposed or soil-dominated surfaces. BSI is a spectral surface indicator and should not be interpreted as a direct measurement of soil fertility, nutrient content, organic carbon, moisture, texture, or other laboratory soil properties.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",

    note:
      "Baseline classes are interpretive guidance only; " +
      "soil-surface thresholds should be calibrated for sensor, " +
      "season, soil condition, vegetation cover, atmospheric " +
      "conditions, and study area.",

    classes: Object.freeze([
      {
        code: "very_low",
        min: -1,
        max: -0.2,
        label: "Very Low Bare-Soil Signal",
      },
      {
        code: "low",
        min: -0.2,
        max: 0.0,
        label: "Low Bare-Soil Signal",
      },
      {
        code: "moderate",
        min: 0.0,
        max: 0.2,
        label: "Moderate Bare-Soil Signal",
      },
      {
        code: "high",
        min: 0.2,
        max: 0.4,
        label: "High Bare-Soil Signal",
      },
      {
        code: "very_high",
        min: 0.4,
        max: 1.0,
        label: "Very High Bare-Soil Signal",
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

module.exports = bsiDefinition;