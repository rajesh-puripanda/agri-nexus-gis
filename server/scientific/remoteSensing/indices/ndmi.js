"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/ndmi.js
// ============================================================
//
// Phase 13.3  Water & Moisture Spectral Index Definitions
//
// Normalized Difference Moisture Index (NDMI)
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const ndmiDefinition = Object.freeze({
  code: "NDMI",

  name: "Normalized Difference Moisture Index",

  description:
    "A normalized spectral index using near-infrared and shortwave-infrared reflectance to characterize vegetation and surface moisture conditions.",

  formula:
    "(NIR - SWIR) / (NIR + SWIR)",

  requiredBands: Object.freeze([
    "NIR",
    "SWIR",
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
    "Higher NDMI values generally indicate greater relative vegetation or surface moisture, while lower values generally indicate lower moisture conditions. Interpretation depends on vegetation type, canopy structure, soil background, atmospheric conditions, sensor characteristics, and study area.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",

    note:
      "Baseline classes are interpretive guidance only; moisture thresholds should be calibrated for crop, vegetation type, sensor, season, atmospheric conditions, soil background, and study area.",

    classes: Object.freeze([
      Object.freeze({
        code: "very_low",
        min: -1,
        max: 0.0,
        label: "Very Low Moisture",
      }),
      Object.freeze({
        code: "low",
        min: 0.0,
        max: 0.2,
        label: "Low Moisture",
      }),
      Object.freeze({
        code: "moderate",
        min: 0.2,
        max: 0.5,
        label: "Moderate Moisture",
      }),
      Object.freeze({
        code: "high",
        min: 0.5,
        max: 0.8,
        label: "High Moisture",
      }),
      Object.freeze({
        code: "very_high",
        min: 0.8,
        max: 1.0,
        label: "Very High Moisture",
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

module.exports = ndmiDefinition;
