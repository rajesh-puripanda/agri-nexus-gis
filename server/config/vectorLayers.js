"use strict";

// ============================================================
// AgriNexus GIS
// Vector Layer Source Configuration
// ============================================================

const VECTOR_LAYERS = Object.freeze({

    administrativeBoundaries: Object.freeze({
        id: "administrativeBoundaries",
        name: "Administrative Boundaries",
        provider: "Esri",
        enabled: true,
        type: "featureService",
        url: "",
        attribution: "Esri"
    }),

    roads: Object.freeze({
        id: "roads",
        name: "Roads",
        provider: "Esri",
        enabled: true,
        type: "featureService",
        url: "",
        attribution: "Esri"
    }),

    waterBodies: Object.freeze({
        id: "waterBodies",
        name: "Water Bodies",
        provider: "Esri",
        enabled: true,
        type: "featureService",
        url: "",
        attribution: "Esri"
    })

});

module.exports = {
    VECTOR_LAYERS
};
