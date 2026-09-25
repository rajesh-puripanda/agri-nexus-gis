"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/savi.js
// ============================================================
//
// Phase 13.2  Remote Sensing Index Definitions
//
// Soil-Adjusted Vegetation Index (SAVI)
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const saviDefinition = Object.freeze({
  code: "SAVI",

  name: "Soil-Adjusted Vegetation Index",

  description:
    "A vegetation index that incorporates a soil-adjustment factor to reduce the influence of exposed soil on vegetation measurements.",

  formula:
    "((NIR - Red) / (NIR + Red + L)) * (1 + L)",

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
    "Higher SAVI values generally indicate greater vegetation presence and vigor. The soil-adjustment factor makes SAVI particularly useful where vegetation cover is sparse and exposed soil contributes significantly to the spectral response.",

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

  parameters: Object.freeze({
    L: 0.5,
  }),
});

module.exports = saviDefinition;
