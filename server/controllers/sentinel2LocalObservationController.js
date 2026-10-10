"use strict";

const {
    discoverLocalSentinel2Observations
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2LocalObservationService"
);

async function discoverLocalSentinel2ObservationsRequest(
    req,
    res,
    next,
    discoveryImpl =
        discoverLocalSentinel2Observations
) {
    try {
        const result =
            await discoveryImpl({
                outputDirectory:
                    "./data/remote-sensing/acquisitions"
            });

        return res.status(200).json({
            success: true,
            result
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    discoverLocalSentinel2ObservationsRequest
};