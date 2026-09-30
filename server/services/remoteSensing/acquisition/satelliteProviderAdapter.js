"use strict";

// ============================================================
// AgriNexus GIS
// Satellite Provider Adapter Boundary
//
// Provider-specific implementations must expose this
// interface. Authentication, catalogue access and acquisition
// mechanics remain behind the adapter boundary.
// ============================================================

function assertProviderAdapter(adapter) {
    if (
        !adapter ||
        typeof adapter !== "object"
    ) {
        throw new TypeError(
            "Satellite provider adapter must be an object."
        );
    }

    const requiredMethods = [
        "search",
        "select",
        "acquire"
    ];

    for (const method of requiredMethods) {
        if (typeof adapter[method] !== "function") {
            throw new TypeError(
                `Satellite provider adapter must implement ${method}().`
            );
        }
    }

    return adapter;
}

function createSatelliteProviderAdapter({
    providerId,
    search,
    select,
    acquire
}) {
    if (
        typeof providerId !== "string" ||
        providerId.trim().length === 0
    ) {
        throw new TypeError(
            "providerId must be a non-empty string."
        );
    }

    return Object.freeze(
        assertProviderAdapter({
            providerId: providerId.trim(),
            search,
            select,
            acquire
        })
    );
}

module.exports = {
    assertProviderAdapter,
    createSatelliteProviderAdapter
};
