"use strict";

// ============================================================
// server/services/remoteSensing/raster/multiSourceRasterNormalizationService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.3.2
// Multi-Source Raster Normalization Service
//
// Responsibility:
//   Combine independently read single-band/multi-source rasters
//   into the canonical Normalized Raster Contract.
//
// This service:
//   - validates source raster structure
//   - validates spatial compatibility
//   - maps source rasters to canonical spectral roles
//   - preserves source pixel arrays
//   - preserves common spatial metadata
//   - creates the normalized raster contract
//
// This service does NOT:
//   - calculate remote-sensing indices
//   - alter pixel values
//   - resample pixels
//   - reproject rasters
//   - interpolate pixels
//   - classify pixels
//
// ============================================================

const {
    CANONICAL_BAND_NAMES,
    createNormalizedRasterContract
} = require(
    "../../../scientific/remoteSensing/raster/normalizedRasterContract"
);

const {
    validateMultiSourceRasterCompatibility
} = require(
    "../../../scientific/remoteSensing/raster/multiSourceRasterContract"
);

function assertSources(sources) {
    if (!Array.isArray(sources)) {
        throw new TypeError(
            "Multi-source raster input must be an array."
        );
    }

    if (sources.length === 0) {
        throw new Error(
            "At least one raster source is required."
        );
    }
}

function assertSource(source, index) {
    if (
        source === null ||
        typeof source !== "object" ||
        Array.isArray(source)
    ) {
        throw new TypeError(
            `Raster source at index ${index} must be an object.`
        );
    }

    if (
        typeof source.band !== "string" ||
        source.band.trim() === ""
    ) {
        throw new Error(
            `Raster source at index ${index} must define a canonical band.`
        );
    }

    if (
        !source.raster ||
        typeof source.raster !== "object" ||
        Array.isArray(source.raster)
    ) {
        throw new Error(
            `Raster source at index ${index} must contain a raster object.`
        );
    }
}

function normalizeBandName(
    band
) {
    const normalized =
        band.trim();

    const match =
        CANONICAL_BAND_NAMES.find(
            canonicalName =>
                canonicalName.toLowerCase() ===
                normalized.toLowerCase()
        );

    if (!match) {
        throw new Error(
            `Unsupported canonical band: ${band}`
        );
    }

    return match;
}

function assertUniqueBands(
    normalizedSources
) {
    const seen =
        new Set();

    normalizedSources.forEach(
        source => {
            if (seen.has(source.band)) {
                throw new Error(
                    `Duplicate canonical band: ${source.band}`
                );
            }

            seen.add(source.band);
        }
    );
}

function assertRasterData(
    raster,
    index
) {
    if (
        !Array.isArray(raster.data) &&
        !ArrayBuffer.isView(raster.data)
    ) {
        throw new Error(
            `Raster source at index ${index} must contain raster data.`
        );
    }

    const expectedPixelCount =
        raster.width *
        raster.height;

    /*
     * The GeoTIFF reader currently returns an
     * array of band arrays. A multi-source input
     * represents one relevant source band per raster.
     */
    if (
        raster.data.length === 0
    ) {
        throw new Error(
            `Raster source at index ${index} contains no band data.`
        );
    }

    /*
     * Accept either:
     *   1. a direct single-band pixel array
     *   2. a one-band array returned by the reader
     */
    const first =
        raster.data[0];

    const isNested =
        Array.isArray(first) ||
        ArrayBuffer.isView(first);

    if (isNested) {
        if (
            raster.data.length !== 1
        ) {
            throw new Error(
                `Raster source at index ${index} must contain exactly one source band.`
            );
        }

        if (
            raster.data[0].length !==
            expectedPixelCount
        ) {
            throw new Error(
                `Raster source at index ${index} has invalid pixel data length.`
            );
        }

        return raster.data[0];
    }

    if (
        raster.data.length !==
        expectedPixelCount
    ) {
        throw new Error(
            `Raster source at index ${index} has invalid pixel data length.`
        );
    }

    return raster.data;
}

function normalizeNoData(
    sources
) {
    const reference =
        sources[0].raster;

    return reference.noData;
}

function normalizeSpatialReference(
    raster
) {
    return {
        origin:
            raster.origin,
        resolution:
            raster.resolution,
        boundingBox:
            raster.boundingBox,
        geoKeys:
            raster.geoKeys
    };
}

function normalizeMetadata(
    sources
) {
    return {
        sourceType:
            "Multi-Source GeoTIFF",

        sourceCount:
            sources.length,

        sourceBands:
            sources.map(
                source => source.band
            ),

        sourceMetadata:
            sources.map(
                source => ({
                    band: source.band,
                    metadata:
                        source.raster.metadata ||
                        {}
                })
            )
    };
}

function createBandMap(
    sources
) {
    const bands = {};

    sources.forEach(
        source => {
            const data =
                assertRasterData(
                    source.raster,
                    source.index
                );

            bands[source.band] = {
                data,
                sourceBand:
                    source.raster.sourceBand ||
                    1
            };
        }
    );

    return bands;
}

function normalizeMultiSourceRaster(
    sources
) {
    assertSources(
        sources
    );

    sources.forEach(
        assertSource
    );

    const normalizedSources =
        sources.map(
            (source, index) => ({
                ...source,
                index,
                band:
                    normalizeBandName(
                        source.band
                    )
            })
        );

    assertUniqueBands(
        normalizedSources
    );

    const rasters =
        normalizedSources.map(
            source =>
                source.raster
        );

    const compatibility =
        validateMultiSourceRasterCompatibility(
            rasters
        );

    if (!compatibility.valid) {
        const details =
            compatibility.mismatches
                .map(
                    mismatch =>
                        `source ${mismatch.candidateIndex}: ${mismatch.fields.join(", ")}`
                )
                .join("; ");

        throw new Error(
            `Multi-source raster compatibility validation failed: ${details}`
        );
    }

    const reference =
        rasters[0];

    const bands =
        createBandMap(
            normalizedSources
        );

    return createNormalizedRasterContract({
        width:
            reference.width,

        height:
            reference.height,

        pixelCount:
            reference.width *
            reference.height,

        bands,

        noData:
            normalizeNoData(
                normalizedSources
            ),

        spatialReference:
            normalizeSpatialReference(
                reference
            ),

        metadata:
            normalizeMetadata(
                normalizedSources
            )
    });
}

module.exports = {
    normalizeMultiSourceRaster
};
