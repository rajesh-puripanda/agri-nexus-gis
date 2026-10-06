"use strict";

/*
============================================================
 AGRINEXUS GIS  REMOTE SENSING INTELLIGENCE RAIL
 Phase 11.9
 Presentation only.
 Scientific definitions remain authoritative in backend.
============================================================
*/

(function () {
  const CATALOG_URL =
    "/api/remote-sensing/indices";

  const RASTER_OUTPUT_BASE =
    "/api/remote-sensing/raster/output";

  const MAX_RENDER_SIZE = 1200;

  let catalog = [];
  let selectedIndex = null;
  let remoteSensingLayer = null;
  let renderSequence = 0;
  let remoteSensingBusy = false;
  const SENTINEL2_OBSERVATION_DISCOVERY_URL =
    "/api/remote-sensing/sentinel2-observations";

  const SENTINEL2_INDEX_PRODUCTION_URL =
    "/api/remote-sensing/sentinel2-index-production";

  const SENTINEL2_INDEX_AVAILABILITY_URL =
    "/api/remote-sensing/availability";

  let sentinel2IndexAvailability = {
    observationDate: null,
    results: [],
    loading: false,
  };
  let sentinel2AcquisitionContext = {
    startDate: null,
    endDate: null,
    maxCloudCover: 20,
  };

  let sentinel2ObservationContext = {
    observations: [],
    selectedSceneId: null,
    selectedSpatialCoverage: null,
  };

  function getSentinel2SpatialContext() {
    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map) {
      throw new Error(
        "Map is not available for Sentinel-2 acquisition.",
      );
    }

    const bounds = map.getBounds();

    return {
      bbox: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    };
  }

  function getSelectedSentinel2SpatialContext() {
    const coverage =
      sentinel2ObservationContext.selectedSpatialCoverage;

    if (!Array.isArray(coverage) || coverage.length !== 4) {
      throw new Error(
        "Selected Sentinel-2 scene does not contain a valid spatial coverage.",
      );
    }

    const [west, south, east, north] =
      coverage.map(Number);

    if (
      !Number.isFinite(west) ||
      !Number.isFinite(south) ||
      !Number.isFinite(east) ||
      !Number.isFinite(north) ||
      west >= east ||
      south >= north
    ) {
      throw new Error(
        "Selected Sentinel-2 scene spatial coverage is invalid.",
      );
    }

    return {
      bbox: {
        west,
        south,
        east,
        north,
      },
    };
  }

  let remoteSensingLayerVisible = true;
  let remoteSensingOpacity = 0.72;

  function getElements() {
    return {
      rail:
        document.getElementById(
          "remoteSensingRail"
        ),

      spectralGrid:
        document.getElementById(
          "remoteSensingSpectralGrid"
        ),

      soilGrid:
        document.getElementById(
          "remoteSensingSoilGrid"
        ),

      soilEmpty:
        document.getElementById(
          "remoteSensingSoilEmpty"
        ),
      indexAvailability:
        document.getElementById(
          "remoteSensingIndexAvailability"
        ),

      availabilityDate:
        document.getElementById(
          "remoteSensingAvailabilityDate"
        ),

      availableProducts:
        document.getElementById(
          "remoteSensingAvailableProducts"
        ),

      processingProducts:
        document.getElementById(
          "remoteSensingProcessingProducts"
        ),

      availabilityNotice:
        document.getElementById(
          "remoteSensingAvailabilityNotice"
        ),

      status:
        document.getElementById(
          "remoteSensingRailStatus"
        ),

      close:
        document.getElementById(
          "remoteSensingRailClose"
        ),

      layerToggle:
        document.getElementById(
          "remoteSensingLayerToggle"
        ),

      opacity:
        document.getElementById(
          "remoteSensingOpacity"
        ),

      opacityValue:
        document.getElementById(
          "remoteSensingOpacityValue"
        ),

      startDate:
        document.getElementById(
          "remoteSensingStartDate"
        ),

      endDate:
        document.getElementById(
          "remoteSensingEndDate"
        ),

      maxCloudCover:
        document.getElementById(
          "remoteSensingMaxCloudCover"
        ),

      findObservations:
        document.getElementById(
          "remoteSensingFindObservations"
        ),

      observationResults:
        document.getElementById(
          "remoteSensingObservationResults"
        ),

      observationRail:
        document.getElementById(
          "remoteSensingObservationRail"
        ),

      observationCount:
        document.getElementById(
          "remoteSensingObservationCount"
        ),

      selectedObservation:
        document.getElementById(
          "remoteSensingSelectedObservation"
        ),

      progress:
        document.getElementById(
          "remoteSensingProgress"
        ),

      progressText:
        document.getElementById(
          "remoteSensingProgressText"
        ),

      progressValue:
        document.getElementById(
          "remoteSensingProgressValue"
        ),

      progressBar:
        document.getElementById(
          "remoteSensingProgressBar"
        ),
    };
  }

  function updateSentinel2AcquisitionContext() {
    const {
      startDate,
      endDate,
      maxCloudCover,
    } = getElements();

    sentinel2AcquisitionContext.startDate =
      startDate && startDate.value
        ? startDate.value
        : null;

    sentinel2AcquisitionContext.endDate =
      endDate && endDate.value
        ? endDate.value
        : null;

    const cloudValue =
      maxCloudCover && maxCloudCover.value !== ""
        ? Number(maxCloudCover.value)
        : 20;

    sentinel2AcquisitionContext.maxCloudCover =
      Number.isFinite(cloudValue)
        ? Math.max(0, Math.min(100, cloudValue))
        : 20;
  }

  function bindSentinel2AcquisitionControls() {
    const {
      startDate,
      endDate,
      maxCloudCover,
      findObservations,
    } = getElements();

    [
      startDate,
      endDate,
      maxCloudCover,
    ].forEach((element) => {
      if (element) {
        element.addEventListener(
          "change",
          updateSentinel2AcquisitionContext,
        );
      }
    });

    if (findObservations) {
      findObservations.addEventListener(
        "click",
        () => {
          discoverSentinel2Observations().catch(
            (error) => {
              updateStatus(
                error && error.message
                  ? error.message
                  : "Unable to discover Sentinel-2 observations.",
              );
            },
          );
        },
      );
    }

    updateSentinel2AcquisitionContext();
  }

  function clearSentinel2ObservationSelection() {
    sentinel2ObservationContext.selectedSceneId =
      null;

    sentinel2ObservationContext.selectedSpatialCoverage =
      null;

    const {
      selectedObservation,
    } = getElements();

    if (selectedObservation) {
      selectedObservation.textContent = "";
      selectedObservation.classList.add(
        "is-hidden",
      );
    }
  }
  function renderSentinel2Observations() {
    const {
      observationRail,
      observationCount,
      selectedObservation,
    } = getElements();

    if (!observationRail) {
      return;
    }

    observationRail.innerHTML = "";

    const observations =
      sentinel2ObservationContext.observations;

    if (observationCount) {
      observationCount.textContent =
        String(observations.length);
    }

    if (selectedObservation) {
      selectedObservation.classList.add(
        "is-hidden",
      );
      selectedObservation.textContent = "";
    }

    if (!observations.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "remote-sensing-observation-empty";

      empty.textContent =
        "No Sentinel-2 scenes match the selected observation criteria.";

      observationRail.appendChild(empty);

      return;
    }

    observations.forEach((observation) => {
      const card =
        document.createElement("button");

      card.type = "button";
      card.className =
        "remote-sensing-observation-card";

      if (
        observation.sceneId ===
        sentinel2ObservationContext.selectedSceneId
      ) {
        card.classList.add("is-selected");
      }

      const date =
        document.createElement("span");

      date.className =
        "remote-sensing-observation-date";

      date.textContent =
        observation.acquisitionDate
          ? String(
              observation.acquisitionDate,
            ).slice(0, 10)
          : "Unknown date";

      const satellite =
        document.createElement("span");

      satellite.className =
        "remote-sensing-observation-satellite";

      satellite.textContent =
        observation.satellite ||
        "Sentinel-2";

      const cloud =
        document.createElement("span");

      cloud.className =
        "remote-sensing-observation-cloud";

      cloud.textContent =
        observation.cloudCover === null ||
        observation.cloudCover === undefined
          ? "Cloud: unavailable"
          : `Cloud: ${Number(
              observation.cloudCover,
            ).toFixed(1)}%`;

      const scene =
        document.createElement("span");

      scene.className =
        "remote-sensing-observation-scene";

      scene.textContent =
        observation.sceneId ||
        "Unknown scene";

      card.append(
        date,
        satellite,
        cloud,
        scene,
      );

      card.addEventListener(
        "click",
        () => {
          selectSentinel2Observation(
            observation,
          );
        },
      );

      observationRail.appendChild(card);
    });
  }

  function selectSentinel2Observation(
    observation,
  ) {
    if (
      !observation ||
      !observation.sceneId
    ) {
      return;
    }

    sentinel2ObservationContext.selectedSceneId =
      observation.sceneId;

    sentinel2ObservationContext.selectedSpatialCoverage =
      Array.isArray(
        observation.spatialCoverage,
      ) &&
      observation.spatialCoverage.length === 4
        ? observation.spatialCoverage.slice()
        : null;

    renderSentinel2Observations();

    const {
      selectedObservation,
    } = getElements();

    if (selectedObservation) {
      selectedObservation.textContent =
        `Selected scene: ${observation.sceneId}  ${
          observation.acquisitionDate
            ? String(
                observation.acquisitionDate,
              ).slice(0, 10)
            : "date unavailable"
        }`;

      selectedObservation.classList.remove(
        "is-hidden",
      );
    }

    updateStatus(
      `Selected Sentinel-2 scene: ${observation.sceneId}`,
    );

    loadSentinel2IndexAvailability(
      observation.acquisitionDate,
    ).catch((error) => {
      console.error(
        "Unable to load Sentinel-2 index availability:",
        error,
      );
    });
  }
  async function discoverSentinel2Observations() {
    updateSentinel2AcquisitionContext();

    if (
      !sentinel2AcquisitionContext.startDate ||
      !sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Observation start and end dates are required.",
      );
    }

    if (
      sentinel2AcquisitionContext.startDate >
      sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Observation start date must not be later than end date.",
      );
    }

    const {
      findObservations,
    } = getElements();

    if (findObservations) {
      findObservations.disabled = true;
    }

    updateStatus(
      "Searching Sentinel-2 observations...",
    );

    try {
      const response = await fetch(
        SENTINEL2_OBSERVATION_DISCOVERY_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            contractVersion: "1.0",
            sourceId:
              "COPERNICUS_DATA_SPACE",
            temporalContext: {
              startDate:
                sentinel2AcquisitionContext.startDate,
              endDate:
                sentinel2AcquisitionContext.endDate,
            },
            spatialContext:
              getSentinel2SpatialContext(),
            acquisitionParameters: {
              maxCloudCover:
                sentinel2AcquisitionContext.maxCloudCover,
            },
          }),
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload && payload.error
            ? payload.error
            : "Unable to discover Sentinel-2 observations.",
        );
      }

      sentinel2ObservationContext.observations =
        Array.isArray(payload.observations)
          ? payload.observations
          : [];

      clearSentinel2ObservationSelection();

      renderSentinel2Observations();

      const {
        observationResults,
      } = getElements();

      if (observationResults) {
        observationResults.classList.remove(
          "is-hidden",
        );
      }

      updateStatus(
        `${sentinel2ObservationContext.observations.length} Sentinel-2 observation(s) found.`,
      );

      return sentinel2ObservationContext.observations;
    } finally {
      if (findObservations) {
        findObservations.disabled = false;
      }
    }
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

  function formatObservationDate(dateValue) {
    if (!dateValue) {
      return "Unknown observation date";
    }

    const value = String(dateValue).slice(0, 10);
    const parts = value.split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  function getAvailabilityResult(indexCode) {
    return (
      sentinel2IndexAvailability.results.find(
        (result) =>
          result.indexCode === indexCode
      ) || null
    );
  }

  function renderIndexAvailability() {
    const {
      indexAvailability,
      availabilityDate,
      availableProducts,
      processingProducts,
      availabilityNotice,
    } = getElements();

    if (!indexAvailability) {
      return;
    }

    if (
      !sentinel2IndexAvailability.observationDate
    ) {
      indexAvailability.classList.add(
        "is-hidden"
      );

      return;
    }

    indexAvailability.classList.remove(
      "is-hidden"
    );

    const date =
      sentinel2IndexAvailability.observationDate;

    if (availabilityDate) {
      availabilityDate.textContent =
        `Observation Date: ${formatObservationDate(date)}`;
    }

    const available = [];
    const processing = [];

    catalog.forEach((index) => {
      const result =
        getAvailabilityResult(index.code);

      if (
        result &&
        result.status === "AVAILABLE"
      ) {
        available.push(index);
      } else {
        processing.push(index);
      }
    });

    if (availableProducts) {
      availableProducts.innerHTML =
        available.length > 0
          ? `
            <strong>Available locally</strong>
            <div class="remote-sensing-availability-list">
              ${available
                .map(
                  (index) =>
                    `<span> ${index.code}</span>`
                )
                .join("")}
            </div>
          `
          : `
            <strong>No products available locally</strong>
          `;
    }

    if (processingProducts) {
      processingProducts.innerHTML =
        processing.length > 0
          ? `
            <strong>Requires processing</strong>
            <div class="remote-sensing-availability-list">
              ${processing
                .map(
                  (index) =>
                    `<span> ${index.code}</span>`
                )
                .join("")}
            </div>
          `
          : "";
    }

    if (availabilityNotice) {
      availabilityNotice.classList.remove(
        "is-hidden"
      );
    }
  }

  async function loadSentinel2IndexAvailability(
    observationDate
  ) {
    if (!observationDate) {
      sentinel2IndexAvailability = {
        observationDate: null,
        results: [],
        loading: false,
      };

      renderIndexAvailability();
      renderCatalog();

      return;
    }

    sentinel2IndexAvailability.loading =
      true;

    sentinel2IndexAvailability.observationDate =
      String(observationDate).slice(0, 10);

    renderIndexAvailability();

    try {
      const url =
        `${SENTINEL2_INDEX_AVAILABILITY_URL}` +
        `?observationDate=${encodeURIComponent(
          sentinel2IndexAvailability.observationDate
        )}`;

      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

      if (!response.ok) {
        throw new Error(
          `Availability request failed: ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        payload.success !== true ||
        !Array.isArray(payload.results)
      ) {
        throw new Error(
          "Invalid index availability response."
        );
      }

      sentinel2IndexAvailability.results =
        payload.results;
    } catch (error) {
      console.error(
        "Sentinel-2 index availability failed:",
        error
      );

      sentinel2IndexAvailability.results =
        catalog.map((index) => ({
          indexCode: index.code,
          status: "MISSING",
        }));
    } finally {
      sentinel2IndexAvailability.loading =
        false;

      renderIndexAvailability();
      renderCatalog();
    }
  }
  function renderCatalog() {
    const {
      spectralGrid,
      soilGrid,
      soilEmpty,
    } = getElements();

    if (!spectralGrid || !soilGrid) {
      return;
    }

    spectralGrid.innerHTML = "";
    soilGrid.innerHTML = "";

    const spectralIndexes =
      catalog.filter(
        (index) =>
          index.category === "spectral"
      );

    const soilFocusedIndexes =
      catalog.filter(
        (index) =>
          index.category === "soil-focused"
      );

    function createIndexCard(index) {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "remote-sensing-index-card";

      /*
      ----------------------------------------------------------
      Index selection is locked while an index workflow
      is running.
      ----------------------------------------------------------
      */

      button.disabled =
        remoteSensingBusy;

      if (
        selectedIndex &&
        selectedIndex.code === index.code
      ) {
        button.classList.add(
          "is-active"
        );
      }

      button.dataset.indexCode =
        index.code;

      const availabilityResult =
        getAvailabilityResult(index.code);

      const isAvailable =
        availabilityResult &&
        availabilityResult.status === "AVAILABLE";

      button.classList.toggle(
        "is-available",
        Boolean(isAvailable)
      );

      button.classList.toggle(
        "requires-processing",
        !isAvailable
      );

      const availabilityLabel =
        isAvailable
          ? "Available"
          : "Process";

      button.title =
        index.description ||
        index.name;

      button.setAttribute(
        "aria-label",
        `${index.code} — ${index.name}`
      );

      button.innerHTML = `
        <span
          class="remote-sensing-index-icon"
          aria-hidden="true"
        >
          ${indexIcon(index.code)}
        </span>

        <span class="remote-sensing-index-code">
          ${index.code}
        </span>

        <span class="remote-sensing-index-name">
          ${index.name}
        </span>

        <span
          class="remote-sensing-index-availability"
          aria-label="${isAvailable ? "Available locally" : "Requires processing"}"
        >
          ${availabilityLabel}
        </span>
      `;

      button.addEventListener(
        "click",
        () =>
          selectRemoteSensingIndex(
            index
          )
      );

      return button;
    }

    spectralIndexes.forEach(
      (index) => {
        spectralGrid.appendChild(
          createIndexCard(index)
        );
      }
    );

    soilFocusedIndexes.forEach(
      (index) => {
        soilGrid.appendChild(
          createIndexCard(index)
        );
      }
    );

    if (soilEmpty) {
      soilEmpty.classList.toggle(
        "is-hidden",
        soilFocusedIndexes.length > 0
      );
    }
  }

  function updateStatus(message) {
    const { status } =
      getElements();

    if (status) {
      status.textContent =
        message;
    }
  }

  function setRemoteSensingBusy(
    isBusy
  ) {
    remoteSensingBusy =
      Boolean(isBusy);

    renderCatalog();
  }

  function updateRemoteSensingLayerControls(
    enabled
  ) {
    const {
      layerToggle,
      opacity
    } = getElements();

    if (layerToggle) {
      layerToggle.disabled =
        !enabled;

      layerToggle.checked =
        remoteSensingLayerVisible;
    }

    if (opacity) {
      opacity.disabled =
        !enabled;

      opacity.value =
        Math.round(
          remoteSensingOpacity *
            100
        );
    }

    updateRemoteSensingOpacityLabel();
  }

  function updateRemoteSensingOpacityLabel() {
    const { opacityValue } =
      getElements();

    if (opacityValue) {
      opacityValue.textContent =
        `${Math.round(
          remoteSensingOpacity *
            100
        )}%`;
    }
  }

  function setRemoteSensingLayerVisibility(
    visible
  ) {
    remoteSensingLayerVisible =
      Boolean(visible);

    const map =
      typeof window.getMap ===
      "function"
        ? window.getMap()
        : null;

    if (
      !map ||
      !remoteSensingLayer
    ) {
      return;
    }

    if (
      remoteSensingLayerVisible &&
      !map.hasLayer(
        remoteSensingLayer
      )
    ) {
      remoteSensingLayer.addTo(
        map
      );
    }

    if (
      !remoteSensingLayerVisible &&
      map.hasLayer(
        remoteSensingLayer
      )
    ) {
      map.removeLayer(
        remoteSensingLayer
      );
    }
  }

  function setRemoteSensingOpacity(
    value
  ) {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      return;
    }

    remoteSensingOpacity =
      Math.max(
        0,
        Math.min(
          1,
          numericValue
        )
      );

    if (
      remoteSensingLayer
    ) {
      remoteSensingLayer.setOpacity(
        remoteSensingOpacity
      );
    }

    updateRemoteSensingOpacityLabel();
  }

  function updateRemoteSensingProgress(
    percent,
    message
  ) {
    const {
      progress,
      progressText,
      progressValue,
      progressBar
    } = getElements();

    const safePercent =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(percent)
        )
      );

    if (progress) {
      progress.classList.remove(
        "is-hidden"
      );

      progress.setAttribute(
        "aria-valuenow",
        String(safePercent)
      );
    }

    if (
      progressText &&
      message
    ) {
      progressText.textContent =
        message;
    }

    if (progressValue) {
      progressValue.textContent =
        `${safePercent}%`;
    }

    if (progressBar) {
      progressBar.style.width =
        `${safePercent}%`;
    }
  }

  function resetRemoteSensingProgress(
    message = "Loading raster..."
  ) {
    updateRemoteSensingProgress(
      0,
      message
    );
  }

  function completeRemoteSensingProgress(
    message = "Raster loaded."
  ) {
    updateRemoteSensingProgress(
      100,
      message
    );
  }

  function hideRemoteSensingProgress() {
    const { progress } =
      getElements();

    if (progress) {
      progress.classList.add(
        "is-hidden"
      );
    }
  }

  function clearRemoteSensingLayer() {
    if (
      !remoteSensingLayer
    ) {
      return;
    }

    const map =
      typeof window.getMap ===
      "function"
        ? window.getMap()
        : null;

    if (
      map &&
      map.hasLayer(
        remoteSensingLayer
      )
    ) {
      map.removeLayer(
        remoteSensingLayer
      );
    }

    remoteSensingLayer = null;

    updateRemoteSensingLayerControls(
      false
    );
  }

  function selectRemoteSensingIndex(
    index
  ) {
    /*
    ----------------------------------------------------------
     Hard guard against a second spectral-index request.
    ----------------------------------------------------------
    */

    if (remoteSensingBusy) {
      return;
    }

    selectedIndex =
      index;

    renderCatalog();

    updateStatus(
      `${index.code}  ${index.name} selected.`
    );

    loadRemoteSensingMap(
      index
    );
  }

  function getRasterUrl(
    indexCode,
    type
  ) {
    return (
      `${RASTER_OUTPUT_BASE}/` +
      `${encodeURIComponent(
        indexCode
      )}/` +
      `${encodeURIComponent(
        type
      )}`
    );
  }

  function getUtmZoneFromEpsg(
    epsgCode
  ) {
    if (
      !Number.isInteger(
        epsgCode
      ) ||
      epsgCode < 32601 ||
      epsgCode > 32660
    ) {
      return null;
    }

    return epsgCode - 32600;
  }

  function utmToLatLng(
    easting,
    northing,
    zone
  ) {
    const a = 6378137.0;

    const eccSquared =
      0.00669438;

    const eccPrimeSquared =
      eccSquared /
      (1 - eccSquared);

    const k0 =
      0.9996;

    const x =
      easting -
      500000.0;

    const y =
      northing;

    const m =
      y / k0;

    const mu =
      m /
      (
        a *
        (
          1 -
          eccSquared / 4 -
          3 *
            eccSquared *
            eccSquared /
            64 -
          5 *
            Math.pow(
              eccSquared,
              3
            ) /
            256
        )
      );

    const e1 =
      (
        1 -
        Math.sqrt(
          1 -
          eccSquared
        )
      ) /
      (
        1 +
        Math.sqrt(
          1 -
          eccSquared
        )
      );

    const j1 =
      3 * e1 / 2 -
      27 *
        Math.pow(
          e1,
          3
        ) /
        32;

    const j2 =
      21 *
        e1 *
        e1 /
        16 -
      55 *
        Math.pow(
          e1,
          4
        ) /
        32;

    const j3 =
      151 *
        Math.pow(
          e1,
          3
        ) /
        96;

    const j4 =
      1097 *
        Math.pow(
          e1,
          4
        ) /
        512;

    const fp =
      mu +
      j1 *
        Math.sin(
          2 * mu
        ) +
      j2 *
        Math.sin(
          4 * mu
        ) +
      j3 *
        Math.sin(
          6 * mu
        ) +
      j4 *
        Math.sin(
          8 * mu
        );

    const sinFp =
      Math.sin(fp);

    const cosFp =
      Math.cos(fp);

    const tanFp =
      Math.tan(fp);

    const c1 =
      eccPrimeSquared *
      cosFp *
      cosFp;

    const t1 =
      tanFp * tanFp;

    const r1 =
      a *
      (
        1 -
        eccSquared
      ) /
      Math.pow(
        1 -
          eccSquared *
          sinFp *
          sinFp,
        1.5
      );

    const n1 =
      a /
      Math.sqrt(
        1 -
          eccSquared *
          sinFp *
          sinFp
      );

    const d =
      x /
      (n1 * k0);

    const latitude =
      fp -
      (
        n1 *
        tanFp /
        r1
      ) *
      (
        Math.pow(
          d,
          2
        ) /
          2 -
        (
          5 +
          3 * t1 +
          10 * c1 -
          4 * c1 * c1 -
          9 *
            eccPrimeSquared
        ) *
          Math.pow(
            d,
            4
          ) /
          24 +
        (
          61 +
          90 * t1 +
          298 * c1 +
          45 * t1 * t1 -
          252 *
            eccPrimeSquared -
          3 * c1 * c1
        ) *
          Math.pow(
            d,
            6
          ) /
          720
      );

    const longitude =
      (
        (zone - 1) * 6 -
        180 +
        3
      ) *
        (Math.PI / 180) +
      (
        d -
        (
          1 +
          2 * t1 +
          c1
        ) *
          Math.pow(
            d,
            3
          ) /
          6 +
        (
          5 -
          2 * c1 +
          28 * t1 -
          3 * c1 * c1 +
          8 *
            eccPrimeSquared +
          24 * t1 * t1
        ) *
          Math.pow(
            d,
            5
          ) /
          120
      ) /
        cosFp;

    return {
      lat:
        latitude *
        180 /
        Math.PI,

      lng:
        longitude *
        180 /
        Math.PI
    };
  }

  function getLatLngBoundsFromGeoTIFF(
    image
  ) {
    const boundingBox =
      image.getBoundingBox();

    if (
      !Array.isArray(
        boundingBox
      ) ||
      boundingBox.length < 4
    ) {
      throw new Error(
        "GeoTIFF spatial bounding box is unavailable."
      );
    }

    const geoKeys =
      typeof image.getGeoKeys ===
      "function"
        ? image.getGeoKeys()
        : {};

    const epsgCode =
      Number(
        geoKeys.ProjectedCSTypeGeoKey
      );

    const zone =
      getUtmZoneFromEpsg(
        epsgCode
      );

    if (!zone) {
      throw new Error(
        `Unsupported raster CRS: EPSG:${epsgCode}`
      );
    }

    const min =
      utmToLatLng(
        boundingBox[0],
        boundingBox[1],
        zone
      );

    const max =
      utmToLatLng(
        boundingBox[2],
        boundingBox[3],
        zone
      );

    return L.latLngBounds(
      [min.lat, min.lng],
      [max.lat, max.lng]
    );
  }

  function createRasterCanvas(
    values,
    width,
    height,
    isClassification
  ) {
    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      throw new Error(
        "Unable to create raster canvas."
      );
    }

    const imageData =
      context.createImageData(
        width,
        height
      );

    let min = Infinity;
    let max = -Infinity;

    if (!isClassification) {
      for (
        let i = 0;
        i < values.length;
        i++
      ) {
        const value =
          Number(values[i]);

        if (
          Number.isFinite(
            value
          ) &&
          value !== -9999
        ) {
          min =
            Math.min(
              min,
              value
            );

          max =
            Math.max(
              max,
              value
            );
        }
      }

      if (
        !Number.isFinite(
          min
        ) ||
        !Number.isFinite(
          max
        ) ||
        min === max
      ) {
        min = -1;
        max = 1;
      }
    }

    for (
      let i = 0;
      i < values.length;
      i++
    ) {
      const value =
        Number(values[i]);

      const offset =
        i * 4;

      if (
        !Number.isFinite(
          value
        ) ||
        value === -9999
      ) {
        imageData.data[
          offset + 3
        ] = 0;

        continue;
      }

      let normalized;

      if (isClassification) {
        normalized =
          Math.max(
            0,
            Math.min(
              1,
              value / 5
            )
          );
      } else {
        normalized =
          (
            value - min
          ) /
          (
            max - min
          );

        normalized =
          Math.max(
            0,
            Math.min(
              1,
              normalized
            )
          );
      }

      const red =
        Math.round(
          255 *
          normalized
        );

      const green =
        Math.round(
          255 *
          (
            1 -
            Math.abs(
              normalized -
              0.5
            ) *
            2
          )
        );

      const blue =
        Math.round(
          255 *
          (
            1 -
            normalized
          )
        );

      imageData.data[
        offset
      ] = red;

      imageData.data[
        offset + 1
      ] = green;

      imageData.data[
        offset + 2
      ] = blue;

      imageData.data[
        offset + 3
      ] = 190;
    }

    context.putImageData(
      imageData,
      0,
      0
    );

    return canvas;
  }

  async function renderRasterOutput(
    index,
    type,
    sequence
  ) {
    if (
      typeof GeoTIFF ===
      "undefined"
    ) {
      throw new Error(
        "GeoTIFF library is unavailable."
      );
    }

    const map =
      typeof window.getMap ===
      "function"
        ? window.getMap()
        : null;

    if (!map) {
      throw new Error(
        "Map is not initialized."
      );
    }

    const url =
      getRasterUrl(
        index.code,
        type
      );

    resetRemoteSensingProgress(
        `${index.code}: Loading raster...`
    );

    updateStatus(
        `${index.code} ${index.name}: Loading raster...`
    );

    const response =
      await fetch(
        url,
        {
          headers: {
            Accept:
              "image/tiff",
          },
        }
      );

    if (!response.ok) {
      throw new Error(
        `Raster request failed: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error(
        "Raster response streaming is unavailable."
      );
    }

    const contentLength =
      Number(
        response.headers.get(
          "content-length"
        )
      );

    const reader =
      response.body.getReader();

    let arrayBuffer;

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength > 0
    ) {
      const buffer =
        new Uint8Array(
          contentLength
        );

      let offset = 0;

      while (true) {
        const {
          done,
          value
        } =
          await reader.read();

        if (done) {
          break;
        }

        if (
          sequence !==
          renderSequence
        ) {
          reader.cancel();
          return;
        }

        buffer.set(
          value,
          offset
        );

        offset +=
          value.length;

        updateRemoteSensingProgress(
          (
            offset /
            contentLength
          ) *
            100,
          `${index.code}: Loading raster...`
        );
      }

      arrayBuffer =
        buffer.buffer;
    } else {
      const chunks = [];
      let received = 0;

      while (true) {
        const {
          done,
          value
        } =
          await reader.read();

        if (done) {
          break;
        }

        if (
          sequence !==
          renderSequence
        ) {
          reader.cancel();
          return;
        }

        chunks.push(
          value
        );

        received +=
          value.length;
      }

      const buffer =
        new Uint8Array(
          received
        );

      let offset = 0;

      for (
        const chunk of chunks
      ) {
        buffer.set(
          chunk,
          offset
        );

        offset +=
          chunk.length;
      }

      arrayBuffer =
        buffer.buffer;
    }

    if (
      sequence !==
      renderSequence
    ) {
      return;
    }

    const tiff =
      await GeoTIFF.fromArrayBuffer(
        arrayBuffer
      );

    const image =
      await tiff.getImage();

    const imageWidth =
      image.getWidth();

    const imageHeight =
      image.getHeight();

    const scale =
      Math.min(
        1,
        MAX_RENDER_SIZE /
          Math.max(
            imageWidth,
            imageHeight
          )
      );

    const renderWidth =
      Math.max(
        1,
        Math.round(
          imageWidth *
          scale
        )
      );

    const renderHeight =
      Math.max(
        1,
        Math.round(
          imageHeight *
          scale
        )
      );

    const raster =
      await image.readRasters(
        {
          samples: [0],

          width:
            renderWidth,

          height:
            renderHeight,

          resampleMethod:
            "nearest",

          interleave:
            true,
        }
      );

    if (
      sequence !==
      renderSequence
    ) {
      return;
    }

    const canvas =
      createRasterCanvas(
        raster,
        renderWidth,
        renderHeight,
        type ===
          "classification"
      );

    const imageUrl =
      canvas.toDataURL(
        "image/png"
      );

    const bounds =
      getLatLngBoundsFromGeoTIFF(
        image
      );

    clearRemoteSensingLayer();

    remoteSensingLayer =
      L.imageOverlay(
        imageUrl,
        bounds,
        {
          opacity:
            remoteSensingOpacity,

          interactive:
            false,

          crossOrigin:
            false,

          className:
            "remote-sensing-raster-layer",
        }
      );

    if (
      remoteSensingLayerVisible
    ) {
      remoteSensingLayer.addTo(
        map
      );
    }

    updateRemoteSensingLayerControls(
      true
    );

    completeRemoteSensingProgress(
       `${index.code}: Raster loaded.`
    );

    map.fitBounds(
      bounds,
      {
        padding: [
          20,
          20
        ],

        maxZoom: 13,
      }
    );

    updateStatus(
      `${index.code} ${index.name} ${type} layer loaded.`
    );
  }

  async function loadRemoteSensingMap(
    index
  ) {
    /*
    ----------------------------------------------------------
     Single-flight protection.

     Once the workflow starts, all spectral-index buttons
     remain disabled until the workflow reaches completion
     or fails.
    ----------------------------------------------------------
    */

    if (remoteSensingBusy) {
      return;
    }

    const sequence =
      ++renderSequence;

    setRemoteSensingBusy(
      true
    );

    clearRemoteSensingLayer();

    if (
      !index ||
      !index.code
    ) {
      setRemoteSensingBusy(
        false
      );

      return;
    }

    updateRemoteSensingLayerControls(
      false
    );

    try {
      await ensureRasterIndex(
        index,
        sequence
      );

      if (
        sequence !==
        renderSequence
      ) {
        return;
      }

      await renderRasterOutput(
        index,
        "index",
        sequence
      );
    } catch (error) {
      console.error(
        "Remote Sensing raster loading failed:",
        error
      );

      if (
        sequence ===
        renderSequence
      ) {
        updateStatus(
          `${index.code}: raster unavailable.`
        );

        hideRemoteSensingProgress();
      }
    } finally {
      /*
      --------------------------------------------------------
       The workflow lock is released only after the complete
       workflow has finished or failed.

       Successful workflow reaches 100% before this executes.
      --------------------------------------------------------
      */

      setRemoteSensingBusy(
        false
      );
    }
  }

  async function loadRemoteSensingCatalog() {
    updateStatus(
      "Loading remote sensing indices..."
    );

    try {
      const response =
        await fetch(
          CATALOG_URL,
          {
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `Catalog request failed: ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        payload.success !==
          true ||
        !Array.isArray(
          payload.indices
        )
      ) {
        throw new Error(
          "Invalid remote sensing catalog response."
        );
      }

      catalog =
        payload.indices;

      renderCatalog();

      updateStatus(
        `${catalog.length} remote sensing indices available.`
      );

      return catalog;
    } catch (error) {
      console.error(
        "Remote Sensing catalog loading failed:",
        error
      );

      updateStatus(
        "Unable to load remote sensing indices."
      );

      return [];
    }
  }

  async function consumeSentinel2ProductionStream(
    response,
    onProgress,
  ) {
    if (!response.body) {
      throw new Error(
        "Sentinel-2 production stream is not available.",
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";
    let resultPayload = null;

    const processEvent = (
      eventText,
    ) => {
      let eventName = "message";
      let data = "";

      for (
        const line of eventText.split(
          /\r?\n/,
        )
      ) {
        if (
          line.startsWith(
            "event: ",
          )
        ) {
          eventName =
            line.slice(7);
        } else if (
          line.startsWith(
            "data: ",
          )
        ) {
          data += line.slice(6);
        }
      }

      if (!data) {
        return;
      }

      const payload =
        JSON.parse(data);

      if (
        eventName ===
        "progress"
      ) {
        if (
          typeof onProgress ===
          "function"
        ) {
          onProgress(payload);
        }

        return;
      }

      if (
        eventName ===
        "result"
      ) {
        resultPayload =
          payload;

        return;
      }

      if (
        eventName ===
        "error"
      ) {
        throw new Error(
          payload.error ||
            "Sentinel-2 index production failed.",
        );
      }
    };

    while (true) {
      const {
        done,
        value,
      } =
        await reader.read();

      buffer +=
        decoder.decode(
          value ||
            new Uint8Array(),
          {
            stream: !done,
          },
        );

      const events =
        buffer.split(
          /\r?\n\r?\n/,
        );

      buffer =
        events.pop() || "";

      for (
        const eventText of events
      ) {
        processEvent(
          eventText,
        );
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim()) {
      processEvent(buffer);
    }

    if (!resultPayload) {
      throw new Error(
        "Sentinel-2 production stream ended without a result.",
      );
    }

    return resultPayload;
  }
  async function ensureRasterIndex(
    index,
    sequence,
  ) {
    if (!index || !index.code) {
      return;
    }

    const indexCode =
      String(index.code)
        .trim()
        .toUpperCase();

    if (
      !sentinel2AcquisitionContext.startDate ||
      !sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Sentinel-2 acquisition start and end dates are required.",
      );
    }

    if (
      !sentinel2ObservationContext.selectedSceneId
    ) {
      throw new Error(
        "Select a Sentinel-2 observation before producing an index.",
      );
    }

    updateStatus(
      `${indexCode}: checking analytical output...`,
    );

    resetRemoteSensingProgress(
      `Building ${indexCode}...`,
    );

    updateRemoteSensingProgress(
      null,
      `${indexCode}: Preparing Sentinel-2 imagery...`,
    );

    const response = await fetch(
      SENTINEL2_INDEX_PRODUCTION_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "text/event-stream",
        },
        body: JSON.stringify({
          contractVersion: "1.0",
          sourceId: "sentinel2",
          temporalContext: {
            startDate:
              sentinel2AcquisitionContext.startDate,
            endDate:
              sentinel2AcquisitionContext.endDate,
          },
          spatialContext:
            getSelectedSentinel2SpatialContext(),
          acquisitionParameters: {
            maxCloudCover:
              sentinel2AcquisitionContext.maxCloudCover,
            sceneId:
              sentinel2ObservationContext.selectedSceneId,
          },
          outputDirectory:
            "./data/remote-sensing/acquisitions",
          analyticalOutputDirectory:
            "./data/remote-sensing/outputs",
          indexCode,
          targetResolution: 10,
          outputNoData: -9999,
          parameters: {},
        }),
      },
    );

    if (sequence !== renderSequence) {
      return;
    }

    if (!response.ok) {
      let message =
        `${indexCode} build request failed: ${response.status}`;

      try {
        const payload =
          await response.json();

        if (
          payload &&
          typeof payload.message ===
            "string"
        ) {
          message =
            payload.message;
        }

        if (
          payload &&
          typeof payload.error ===
            "string"
        ) {
          message =
            payload.error;
        }
      } catch {
        // Preserve HTTP status message.
      }

      throw new Error(message);
    }

    const streamPayload =
      await consumeSentinel2ProductionStream(
        response,
        (progress) => {
          if (
            sequence !== renderSequence
          ) {
            return;
          }

          const message =
            progress &&
            typeof progress.message ===
              "string"
              ? progress.message
              : `Processing ${indexCode}...`;

          updateRemoteSensingProgress(
            null,
            `${indexCode}: ${message}`,
          );

          updateStatus(
            `${indexCode}: ${message}`,
          );
        },
      );

    if (sequence !== renderSequence) {
      return;
    }

    const payload =
      streamPayload;

    if (
      !payload ||
      payload.success !== true ||
      !payload.result
    ) {
      throw new Error(
        `${indexCode} build did not return a valid production result.`,
      );
    }

    updateRemoteSensingProgress(
      null,
      `${indexCode} built. Loading ${indexCode}...`,
    );
  }

  function openRemoteSensingTool() {
    const {
      rail,
      observationResults,
    } = getElements();

    if (!rail) {
      return false;
    }

    rail.classList.remove(
      "is-hidden"
    );

    if (observationResults) {
      observationResults.classList.remove(
        "is-hidden"
      );
    }

    loadRemoteSensingCatalog();

    return true;
  }

  function closeRemoteSensingTool() {
    const {
      rail,
      observationResults,
    } = getElements();

    if (!rail) {
      return false;
    }

    rail.classList.add(
      "is-hidden"
    );

    if (observationResults) {
      observationResults.classList.add(
        "is-hidden"
      );
    }

    clearRemoteSensingLayer();

    hideRemoteSensingProgress();

    return true;
  }

  function initializeRemoteSensingTool() {
    const {
      close,
      layerToggle,
      opacity
    } = getElements();

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

    if (layerToggle) {
      layerToggle.addEventListener(
        "change",
        () => {
          setRemoteSensingLayerVisibility(
            layerToggle.checked
          );
        }
      );
    }

    if (opacity) {
      opacity.addEventListener(
        "input",
        () => {
          setRemoteSensingOpacity(
            Number(
              opacity.value
            ) / 100
          );
        }
      );
    }

    updateRemoteSensingLayerControls(
      false
    );

    hideRemoteSensingProgress();

    bindSentinel2AcquisitionControls();
  }

  window.openRemoteSensingTool =
    openRemoteSensingTool;

  window.closeRemoteSensingTool =
    closeRemoteSensingTool;

  window.loadRemoteSensingCatalog =
    loadRemoteSensingCatalog;

  window.selectRemoteSensingIndex =
    selectRemoteSensingIndex;

  window.loadRemoteSensingMap =
    loadRemoteSensingMap;

  window.initializeRemoteSensingTool =
    initializeRemoteSensingTool;
})();
