"use strict";

const ssmiDefinition = Object.freeze({
  code: "SSMI",
  category: "soil-focused",
  name: "Surface Soil Moisture Indicator",

  description:
    "A normalized spectral indicator using Sentinel-2 SWIR1 and SWIR2 " +
    "reflectance to characterize relative surface soil moisture conditions.",

  formula:
    "(SWIR1 - SWIR2) / (SWIR1 + SWIR2)",

  requiredBands: Object.freeze([
    "SWIR1",
    "SWIR2",
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
    "Higher or lower SSMI values indicate relative differences in " +
    "surface spectral moisture response. Interpretation depends on " +
    "soil type, surface condition, vegetation cover, atmospheric " +
    "conditions, illumination, sensor characteristics, and study area. " +
    "SSMI is a relative surface-moisture indicator and is not a direct " +
    "measurement of volumetric soil water content.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",

    note:
      "Baseline classes are interpretive visualization guidance only. " +
      "Thresholds should be calibrated for sensor, soil type, season, " +
      "surface condition, atmospheric conditions, and study area.",

    classes: Object.freeze([
      {
        code: "very_low",
        min: -1.0,
        max: -0.6,
        label: "Very Low Surface Moisture Response",
      },
      {
        code: "low",
        min: -0.6,
        max: -0.2,
        label: "Low Surface Moisture Response",
      },
      {
        code: "moderate",
        min: -0.2,
        max: 0.2,
        label: "Moderate Surface Moisture Response",
      },
      {
        code: "high",
        min: 0.2,
        max: 0.6,
        label: "High Surface Moisture Response",
      },
      {
        code: "very_high",
        min: 0.6,
        max: 1.0,
        label: "Very High Surface Moisture Response",
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

module.exports = ssmiDefinition;
