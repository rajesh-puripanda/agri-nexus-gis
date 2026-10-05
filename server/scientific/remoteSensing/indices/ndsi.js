"use strict";

const ndsiDefinition = Object.freeze({
  code: "NDSI",
  category: "soil-focused",
  name: "Normalized Difference Soil Index",

  description:
    "A normalized spectral index using near-infrared and shortwave " +
    "infrared reflectance to support relative discrimination of " +
    "exposed or dry soil and non-soil background.",

  formula:
    "(SWIR1 - NIR) / (SWIR1 + NIR)",

  requiredBands: Object.freeze([
    "NIR",
    "SWIR1",
  ]),

  sensorCompatibility: Object.freeze([
    "Sentinel-2",
    "Generic multispectral",
  ]),

  validRange: Object.freeze({
    min: -1,
    max: 1,
  }),

  interpretation:
    "Higher NDSI values indicate a stronger SWIR1 response relative " +
    "to NIR and therefore a greater likelihood of exposed or drier " +
    "soil and soil-background surfaces. Lower values indicate a " +
    "stronger NIR response relative to SWIR1 and are more consistent " +
    "with vegetation or other non-soil background. NDSI is a relative " +
    "spectral discrimination indicator and is not a direct measurement " +
    "of soil moisture, fertility, nutrient content, organic carbon, " +
    "texture, salinity, or other laboratory soil properties.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",

    note:
      "Baseline classes are interpretive visualization guidance only. " +
      "Thresholds should be calibrated for sensor, season, soil " +
      "condition, vegetation cover, atmospheric conditions, and " +
      "study area.",

    classes: Object.freeze([
      {
        code: "very_low",
        min: -1.0,
        max: -0.6,
        label: "Very Low Soil-Background Response",
      },
      {
        code: "low",
        min: -0.6,
        max: -0.2,
        label: "Low Soil-Background Response",
      },
      {
        code: "moderate",
        min: -0.2,
        max: 0.2,
        label: "Moderate Soil-Background Response",
      },
      {
        code: "high",
        min: 0.2,
        max: 0.6,
        label: "High Soil-Background Response",
      },
      {
        code: "very_high",
        min: 0.6,
        max: 1.0,
        label: "Very High Soil-Background Response",
      },
    ]),
  }),

  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "diverging",
    clampToValidRange: true,
    nodataHandling: "exclude",
  }),
});

module.exports = ndsiDefinition;
