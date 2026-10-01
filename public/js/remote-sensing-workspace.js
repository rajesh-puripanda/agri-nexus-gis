"use strict";

/*
============================================================
 AGRINEXUS GIS  REMOTE SENSING INTELLIGENCE RAIL
 Phase 11.8
 Presentation only.
 Scientific definitions remain authoritative in backend.
============================================================
*/

(function () {
  const CATALOG_URL = "/api/remote-sensing/indices";

  let catalog = [];
  let selectedIndex = null;

  function getElements() {
    return {
      rail: document.getElementById("remoteSensingRail"),
      grid: document.getElementById("remoteSensingIndexGrid"),
      status: document.getElementById("remoteSensingRailStatus"),
      close: document.getElementById("remoteSensingRailClose"),
    };
  }

  function indexIcon(code) {
    const icons = {
      NDVI: "",
      EVI: "",
      SAVI: "",
      GNDVI: "",
      ARVI: "",
      NDWI: "",
      NDMI: "",
    };

    return icons[code] || "";
  }

  function renderCatalog() {
    const { grid } = getElements();

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    catalog.forEach((index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "remote-sensing-index-card";

      if (
        selectedIndex &&
        selectedIndex.code === index.code
      ) {
        button.classList.add("is-active");
      }

      button.dataset.indexCode = index.code;
      button.title = index.description || index.name;
      button.setAttribute(
        "aria-label",
        `${index.code}  ${index.name}`
      );

      button.innerHTML = `
        <span class="remote-sensing-index-icon"
              aria-hidden="true">
          ${indexIcon(index.code)}
        </span>

        <span class="remote-sensing-index-code">
          ${index.code}
        </span>

        <span class="remote-sensing-index-name">
          ${index.name}
        </span>
      `;

      button.addEventListener(
        "click",
        () => selectRemoteSensingIndex(index)
      );

      grid.appendChild(button);
    });
  }

  function updateStatus(message) {
    const { status } = getElements();

    if (status) {
      status.textContent = message;
    }
  }

  function selectRemoteSensingIndex(index) {
    selectedIndex = index;

    renderCatalog();

    updateStatus(
      `${index.code}  ${index.name} selected.`
    );

    if (
      typeof window.loadRemoteSensingMap ===
      "function"
    ) {
      window.loadRemoteSensingMap(index);
    }
  }

  async function loadRemoteSensingCatalog() {
    updateStatus(
      "Loading spectral indices..."
    );

    try {
      const response =
        await fetch(CATALOG_URL, {
          headers: {
            Accept: "application/json",
          },
        });

      if (!response.ok) {
        throw new Error(
          `Catalog request failed: ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        payload.success !== true ||
        !Array.isArray(payload.indices)
      ) {
        throw new Error(
          "Invalid remote sensing catalog response."
        );
      }

      catalog = payload.indices;

      renderCatalog();

      updateStatus(
        `${catalog.length} spectral indices available.`
      );

      return catalog;
    } catch (error) {
      console.error(
        "Remote Sensing catalog loading failed:",
        error
      );

      updateStatus(
        "Unable to load spectral indices."
      );

      return [];
    }
  }

  function openRemoteSensingTool() {
    const { rail } = getElements();

    if (!rail) {
      return false;
    }

    rail.classList.remove("is-hidden");

    loadRemoteSensingCatalog();

    return true;
  }

  function closeRemoteSensingTool() {
    const { rail } = getElements();

    if (!rail) {
      return false;
    }

    rail.classList.add("is-hidden");

    return true;
  }

  function initializeRemoteSensingTool() {
    const { close } = getElements();

    if (!close) {
      console.warn(
        "Remote Sensing right-rail controls not found."
      );

      return;
    }

    close.addEventListener(
      "click",
      closeRemoteSensingTool
    );
  }

  window.openRemoteSensingTool =
    openRemoteSensingTool;

  window.closeRemoteSensingTool =
    closeRemoteSensingTool;

  window.loadRemoteSensingCatalog =
    loadRemoteSensingCatalog;

  window.selectRemoteSensingIndex =
    selectRemoteSensingIndex;

  window.initializeRemoteSensingTool =
    initializeRemoteSensingTool;
})();
