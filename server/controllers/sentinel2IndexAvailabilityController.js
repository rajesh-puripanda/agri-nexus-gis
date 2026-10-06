"use strict";

const {
    getIndexAvailability
} = require(
    "../services/remoteSensing/catalog/" +
    "sentinel2IndexAvailabilityService"
);

const DEFAULT_PRODUCTION_ROOT =
    "./data/remote-sensing/production";

async function getSentinel2IndexAvailability(
    req,
    res
) {
    try {
        const acquisitionDate =
            req.query?.observationDate ||
            req.query?.acquisitionDate;

        const indexCode =
            req.query?.indexCode || null;

        if (
            typeof acquisitionDate !== "string" ||
            acquisitionDate.trim().length === 0
        ) {
            return res.status(400).json({
                success: false,
                code:
                    "INVALID_OBSERVATION_DATE",
                message:
                    "observationDate is required."
            });
        }

        const result =
            await getIndexAvailability({
                productionRoot:
                    DEFAULT_PRODUCTION_ROOT,

                acquisitionDate,

                indexCode
            });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error(
            "Sentinel-2 index availability error:",
            error
        );

        const statusCode =
            Number.isInteger(
                error.statusCode
            )
                ? error.statusCode
                : 500;

        return res
            .status(statusCode)
            .json({
                success: false,
                code:
                    error.code ||
                    "SENTINEL2_INDEX_AVAILABILITY_ERROR",
                message:
                    error.message ||
                    "Failed to determine Sentinel-2 index availability."
            });
    }
}

module.exports = {
    getSentinel2IndexAvailability
};
