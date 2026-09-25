"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/evi.js
// ============================================================
//
// Phase 13.2  Remote Sensing Index Definitions
//
// Enhanced Vegetation Index (EVI)
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const eviDefinition = Object.freeze({
  code: "EVI",

  name: "Enhanced Vegetation Index",

  description:
    "A vegetation index designed to improve sensitivity in high-biomass vegetation and reduce selected atmospheric and soil-background influences using near-infrared, red, and blue reflectance.",

  formula:
    "G * (NIR - Red) / (NIR + C1 * Red - C2 * Blue + L)",

  requiredBands: Object.freeze([
    "NIR",
    "Red",
    "Blue",
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
    "Higher EVI values generally indicate greater vegetation vigor and canopy density. EVI is particularly useful where dense vegetation can reduce the sensitivity of NDVI.",

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
    G: 2.5,
    C1: 6.0,
    C2: 7.5,
    L: 1.0,
  }),
});

module.exports = eviDefinition;
