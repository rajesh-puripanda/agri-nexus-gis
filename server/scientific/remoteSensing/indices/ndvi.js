"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/ndvi.js
// ============================================================
//
// Phase 13.2  Remote Sensing Index Definitions
//
// Normalized Difference Vegetation Index (NDVI)
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const ndviDefinition = Object.freeze({
  code: "NDVI",

  name: "Normalized Difference Vegetation Index",

  description:
    "A normalized spectral index used to characterize vegetation presence and relative vegetation vigor from near-infrared and red reflectance.",

  formula: "(NIR - Red) / (NIR + Red)",

  requiredBands: Object.freeze([
    "NIR",
    "Red",
  ]),

  sensorCompatibility: Object.freeze([
    "Landsat",
    "Sentinel-2",
    "MODIS",
    "Generic multispectral",
  ]),

  validRange: Object.freeze({
    min: -1,
    max: 1,
  }),

  interpretation:
    "Higher NDVI values generally indicate greater green vegetation presence and vigor, while low or negative values may indicate sparse vegetation, bare surfaces, water, or other non-vegetated cover.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",
    note:
      "Baseline classes are interpretive guidance only; agricultural thresholds should be calibrated for crop, sensor, season, soil background, and study area.",
    classes: Object.freeze([
      Object.freeze({
        code: "very_low",
        min: -1,
        max: 0.0,
        label: "Very Low Vegetation",
      }),
      Object.freeze({
        code: "low",
        min: 0.0,
        max: 0.2,
        label: "Low Vegetation",
      }),
      Object.freeze({
        code: "moderate",
        min: 0.2,
        max: 0.5,
        label: "Moderate Vegetation",
      }),
      Object.freeze({
        code: "high",
        min: 0.5,
        max: 0.8,
        label: "High Vegetation",
      }),
      Object.freeze({
        code: "very_high",
        min: 0.8,
        max: 1.0,
        label: "Very High Vegetation",
      }),
    ]),
  }),

  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "sequential",
    clampToValidRange: true,
    nodataHandling: "exclude",
  }),
});

module.exports = ndviDefinition;
