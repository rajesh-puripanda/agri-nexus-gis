"use strict";

// ============================================================
// server/scientific/remoteSensing/bands/
// sentinel2BandCatalog.js
// ============================================================
//
// AgriNexus GIS
//
// Sentinel-2 MSI L2A Band Catalog
//
// Scientific/product-definition authority for Sentinel-2 L2A
// spectral bands used by AgriNexus GIS.
//
// This catalog defines:
//   - AgriNexus band name
//   - Sentinel-2 band identifier
//   - authoritative CDSE STAC asset key
//   - native spatial resolution
//   - spectral role
//
// This catalog does NOT:
//   - acquire assets
//   - decode JPEG2000
//   - resample bands
//   - reproject rasters
//   - perform radiometric conversion
//   - calculate indices
//
// Resolution alignment must remain an explicit downstream
// scientific processing stage.
//
// Sentinel-2 L2A:
//
// 60 m:
//   B01  Coastal Aerosol
//   B09  Water Vapour
//
// 20 m:
//   B05  Red Edge 1
//   B06  Red Edge 2
//   B07  Red Edge 3
//   B8A  Red Edge 4
//   B11  SWIR 1
//   B12  SWIR 2
//
// 10 m:
//   B02  Blue
//   B03  Green
//   B04  Red
//   B08  NIR
//
// B10 / Cirrus is intentionally excluded because Sentinel-2
// L2A surface-reflectance products do not provide B10 as a
// spectral reflectance input.
//
// ============================================================

const SENTINEL2_BAND_CATALOG_VERSION = "1.0";

const SENTINEL2_BAND_CATALOG = Object.freeze({
    CoastalAerosol: Object.freeze({
        bandId: "B01",
        assetKey: "B01_60m",
        nativeResolution: 60,
        spectralRole: "Coastal Aerosol"
    }),

    Blue: Object.freeze({
        bandId: "B02",
        assetKey: "B02_10m",
        nativeResolution: 10,
        spectralRole: "Blue"
    }),

    Green: Object.freeze({
        bandId: "B03",
        assetKey: "B03_10m",
        nativeResolution: 10,
        spectralRole: "Green"
    }),

    Red: Object.freeze({
        bandId: "B04",
        assetKey: "B04_10m",
        nativeResolution: 10,
        spectralRole: "Red"
    }),

    RedEdge1: Object.freeze({
        bandId: "B05",
        assetKey: "B05_20m",
        nativeResolution: 20,
        spectralRole: "Red Edge 1"
    }),

    RedEdge2: Object.freeze({
        bandId: "B06",
        assetKey: "B06_20m",
        nativeResolution: 20,
        spectralRole: "Red Edge 2"
    }),

    RedEdge3: Object.freeze({
        bandId: "B07",
        assetKey: "B07_20m",
        nativeResolution: 20,
        spectralRole: "Red Edge 3"
    }),

    NIR: Object.freeze({
        bandId: "B08",
        assetKey: "B08_10m",
        nativeResolution: 10,
        spectralRole: "Near Infrared"
    }),

    RedEdge4: Object.freeze({
        bandId: "B8A",
        assetKey: "B8A_20m",
        nativeResolution: 20,
        spectralRole: "Red Edge 4"
    }),

    WaterVapor: Object.freeze({
        bandId: "B09",
        assetKey: "B09_60m",
        nativeResolution: 60,
        spectralRole: "Water Vapour"
    }),

    SWIR1: Object.freeze({
        bandId: "B11",
        assetKey: "B11_20m",
        nativeResolution: 20,
        spectralRole: "Short Wave Infrared 1"
    }),

    SWIR2: Object.freeze({
        bandId: "B12",
        assetKey: "B12_20m",
        nativeResolution: 20,
        spectralRole: "Short Wave Infrared 2"
    })
});

const SENTINEL2_EXCLUDED_BANDS = Object.freeze({
    B10: Object.freeze({
        bandId: "B10",
        name: "Cirrus",
        reason:
            "Sentinel-2 L2A surface-reflectance products do not provide B10 as a spectral reflectance input."
    })
});

function getAllSentinel2Bands() {
    return Object.keys(
        SENTINEL2_BAND_CATALOG
    );
}

function hasSentinel2Band(
    bandName
) {
    return Object.prototype.hasOwnProperty.call(
        SENTINEL2_BAND_CATALOG,
        bandName
    );
}

function getSentinel2BandDefinition(
    bandName
) {
    if (!hasSentinel2Band(bandName)) {
        return null;
    }

    return SENTINEL2_BAND_CATALOG[
        bandName
    ];
}

module.exports = {
    SENTINEL2_BAND_CATALOG_VERSION,
    SENTINEL2_BAND_CATALOG,
    SENTINEL2_EXCLUDED_BANDS,
    getAllSentinel2Bands,
    hasSentinel2Band,
    getSentinel2BandDefinition
};
