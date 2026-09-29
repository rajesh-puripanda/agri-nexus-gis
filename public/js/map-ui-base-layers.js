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

  function initializeBaseMapControl() {
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

    const openStreetMap = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }
    );

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          "Tiles &copy; Esri"
      }
    );

    const satelliteLabels = L.layerGroup([
      satellite,
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution:
            "Labels &copy; Esri"
        }
      )
    ]);

    const terrain = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          "Tiles &copy; Esri"
      }
    );

    baseMaps = {
      "Street": openStreetMap,
      "Satellite": satellite,
      "Satellite + Labels": satelliteLabels,
      "Terrain": terrain
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

  window.initializeBaseMapControl = initializeBaseMapControl;
  window.getActiveBaseMap = getActiveBaseMap;
  window.getBaseMaps = getBaseMaps;
})();