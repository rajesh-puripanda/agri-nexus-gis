"use strict";

// ============================================================
// AgriNexus GIS
// Raster Layer Source Configuration
// ============================================================

const RASTER_LAYERS = Object.freeze({

    satellite: Object.freeze({
        id: "satellite",
        name: "Satellite",
        provider: "Esri",
        enabled: true,
        type: "tile",
        url:
            "https://server.arcgisonline.com/ArcGIS/rest/services/" +
            "World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
    }),

    satelliteLabels: Object.freeze({
        id: "satelliteLabels",
        name: "Satellite + Labels",
        provider: "Esri",
        enabled: true,
        type: "tileGroup",
        baseLayer: "satellite",
        labelUrl:
            "https://services.arcgisonline.com/ArcGIS/rest/services/" +
            "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attribution: "Labels &copy; Esri"
    }),

    terrain: Object.freeze({
        id: "terrain",
        name: "Terrain",
        provider: "Esri",
        enabled: true,
        type: "tile",
        url:
            "https://server.arcgisonline.com/ArcGIS/rest/services/" +
            "World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
    })

});

module.exports = {
    RASTER_LAYERS
};
