"use strict";

const {
    discoverSentinel2Observations
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2ObservationDiscoveryService"
);

async function discoverSentinel2ObservationsRequest(
    req,
    res,
    next,
    discoveryImpl =
        discoverSentinel2Observations
) {
    try {
        const request = req.body;

        if (
            !request ||
            typeof request !== "object" ||
            Array.isArray(request)
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid Sentinel-2 observation discovery request."
            });
        }

        const result =
            await discoveryImpl({
                request
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
    discoverSentinel2ObservationsRequest
};
