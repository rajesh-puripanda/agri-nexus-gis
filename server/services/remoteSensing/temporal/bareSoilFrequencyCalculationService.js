"use strict";

const NO_DATA_VALUE = -9999;
const NDVI_BARE_SOIL_MAX_EXCLUSIVE = 0.2;
const BSI_BARE_SOIL_MINIMUM = 0.2;

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value)
                .filter(key => key !== "GTCitationGeoKey")
                .sort()
                .map(key => [key, canonicalize(value[key])])
        );
    }

    return value;
}

function getBand(raster, name) {
    const band = raster?.bands?.[name]?.data;
    const expected = raster?.width * raster?.height;

    if (
        !Number.isInteger(raster?.width) ||
        !Number.isInteger(raster?.height) ||
        raster.width <= 0 ||
        raster.height <= 0 ||
        !band ||
        band.length !== expected
    ) {
        throw new Error(`${name}: invalid raster dimensions or band data.`);
    }

    if (!raster.spatialReference) {
        throw new Error(`${name}: spatialReference is required.`);
    }

    return band;
}

function getGridSignature(raster) {
    return JSON.stringify(canonicalize({
        width: raster.width,
        height: raster.height,
        spatialReference: raster.spatialReference
    }));
}

function isValid(value, noData) {
    return Number.isFinite(value) &&
        !(noData !== undefined && noData !== null && value === noData);
}

function calculateBareSoilFrequency({ observations }) {
    if (!Array.isArray(observations) || observations.length < 2) {
        throw new Error("At least two distinct paired observation dates are required.");
    }

    const dates = observations.map(item => item?.date);

    if (
        dates.some(date =>
            typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
            new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
        ) ||
        new Set(dates).size !== dates.length
    ) {
        throw new Error("Observation dates must be valid, distinct YYYY-MM-DD dates.");
    }

    const ordered = [...observations].sort((a, b) => a.date.localeCompare(b.date));
    let referenceGrid;
    let width;
    let height;
    const prepared = [];

    for (const observation of ordered) {
        const ndvi = getBand(observation.ndviRaster, "NDVI");
        const bsi = getBand(observation.bsiRaster, "BSI");

        const ndviGrid = getGridSignature(observation.ndviRaster);
        const bsiGrid = getGridSignature(observation.bsiRaster);

        if (ndviGrid !== bsiGrid) {
            throw new Error(`${observation.date}: NDVI and BSI grids do not match.`);
        }

        if (referenceGrid === undefined) {
            referenceGrid = ndviGrid;
            width = observation.ndviRaster.width;
            height = observation.ndviRaster.height;
        } else if (ndviGrid !== referenceGrid) {
            throw new Error(`${observation.date}: observation grid does not match the reference grid.`);
        }

        prepared.push({
            date: observation.date,
            ndvi,
            bsi,
            ndviNoData: observation.ndviRaster.noData,
            bsiNoData: observation.bsiRaster.noData
        });
    }

    const pixelCount = width * height;
    const data = new Float32Array(pixelCount);
    const validObservationCounts = new Uint32Array(pixelCount);
    const bareSoilCounts = new Uint32Array(pixelCount);
    let pixelsWithObservations = 0;

    data.fill(NO_DATA_VALUE);

    for (const observation of prepared) {
        for (let i = 0; i < pixelCount; i += 1) {
            const ndvi = observation.ndvi[i];
            const bsi = observation.bsi[i];

            if (
                !isValid(ndvi, observation.ndviNoData) ||
                !isValid(bsi, observation.bsiNoData)
            ) {
                continue;
            }

            validObservationCounts[i] += 1;

            if (
                ndvi < NDVI_BARE_SOIL_MAX_EXCLUSIVE &&
                bsi >= BSI_BARE_SOIL_MINIMUM
            ) {
                bareSoilCounts[i] += 1;
            }
        }
    }

    for (let i = 0; i < pixelCount; i += 1) {
        if (validObservationCounts[i] === 0) {
            continue;
        }

        data[i] =
            (bareSoilCounts[i] / validObservationCounts[i]) * 100;

        pixelsWithObservations += 1;
    }

    return {
        width,
        height,
        pixelCount,
        data,
        noData: NO_DATA_VALUE,
        validObservationCounts,
        bareSoilCounts,
        metadata: {
            productCode: "BARE_SOIL_FREQUENCY",
            units: "percent",
            method: "provisional_ndvi_bsi_evidence_rules",
            calibrationStatus: "provisional_uncalibrated",
            thresholds: {
                ndviMaximumExclusive: NDVI_BARE_SOIL_MAX_EXCLUSIVE,
                bsiMinimum: BSI_BARE_SOIL_MINIMUM
            },
            observationDates: prepared.map(item => item.date),
            observationCount: prepared.length,
            pixelsWithObservations
        }
    };
}

module.exports = {
    NO_DATA_VALUE,
    calculateBareSoilFrequency
};
