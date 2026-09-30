/* ============================================================
   AGRINEXUS GIS  BASE MAP CONTROL
   Phase 11.3.1
   Handles background/base-map selection only.
   Scientific analysis layers remain independent.
   ============================================================ */

(function () {
  "use strict";

  let baseMaps = {};
  let activeBaseMap = null;
  let control = null;

  async function initializeBaseMapControl() {
    if (typeof L === "undefined") {
      console.error("Leaflet is not available for base-map control.");
      return false;
    }

    if (typeof window.getMap !== "function") {
      console.error("getMap() is not available for base-map control.");
      return false;
    }

    const map = window.getMap();

    if (!map) {
      console.error("Leaflet map is not initialized.");
      return false;
    }

    if (control) {
      return true;
    }

    let rasterConfiguration;

    try {
      const response = await fetch(
        "/api/raster-layers/config"
      );

      if (!response.ok) {
        throw new Error(
          `Raster configuration request failed: ${response.status}`
        );
      }

      rasterConfiguration = await response.json();
    } catch (error) {
      console.error(
        "Failed to load raster layer configuration:",
        error
      );

      return false;
    }

    if (
      !rasterConfiguration ||
      rasterConfiguration.success !== true ||
      !rasterConfiguration.layers
    ) {
      console.error(
        "Invalid raster layer configuration response."
      );

      return false;
    }

    const layers = rasterConfiguration.layers;

    const openStreetMap = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    );

    const satelliteConfig = layers.satellite;

    const satellite = L.tileLayer(
      satelliteConfig.url,
      {
        maxZoom: satelliteConfig.maxZoom,
        attribution: satelliteConfig.attribution
      }
    );

    const satelliteLabelsConfig =
      layers.satelliteLabels;

    const satelliteLabels = L.layerGroup([
      L.tileLayer(
        satelliteConfig.url,
        {
          maxZoom: satelliteConfig.maxZoom,
          attribution:
            satelliteConfig.attribution
        }
      ),

      L.tileLayer(
        satelliteLabelsConfig.labelUrl,
        {
          maxZoom:
            satelliteLabelsConfig.maxZoom,
          attribution:
            satelliteLabelsConfig.attribution
        }
      )
    ]);

    const terrainConfig = layers.terrain;

    const terrain = L.tileLayer(
      terrainConfig.url,
      {
        maxZoom: terrainConfig.maxZoom,
        attribution: terrainConfig.attribution
      }
    );

    baseMaps = {
      "Street": openStreetMap,
      [satelliteConfig.name]: satellite,
      [satelliteLabelsConfig.name]:
        satelliteLabels,
      [terrainConfig.name]: terrain
    };

    activeBaseMap = openStreetMap;
    activeBaseMap.addTo(map);

    control = L.control.layers(
      baseMaps,
      null,
      {
        collapsed: true,
        position: "topright"
      }
    ).addTo(map);

    map.on("baselayerchange", function (event) {
      activeBaseMap = event.layer;

      console.log(
        `Base map changed to: ${event.name}`
      );
    });

    console.log(
      "Base map control initialized. Options:",
      Object.keys(baseMaps)
    );

    return true;
  }

  function getActiveBaseMap() {
    return activeBaseMap;
  }

  function getBaseMaps() {
    return { ...baseMaps };
  }

  window.initializeBaseMapControl =
    initializeBaseMapControl;

  window.getActiveBaseMap =
    getActiveBaseMap;

  window.getBaseMaps =
    getBaseMaps;
})();
