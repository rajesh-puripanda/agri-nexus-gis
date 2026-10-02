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

  const ENSURE_RASTER_INDEX_URL =
    "/api/remote-sensing/raster/ensure-index";

  const MAX_RENDER_SIZE = 1200;

  let catalog = [];
  let selectedIndex = null;
  let remoteSensingLayer = null;
  let renderSequence = 0;
  let remoteSensingBusy = false;

  let remoteSensingLayerVisible = true;
  let remoteSensingOpacity = 0.72;

  function getElements() {
    return {
      rail:
        document.getElementById(
          "remoteSensingRail"
        ),

      grid:
        document.getElementById(
          "remoteSensingIndexGrid"
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
    const { grid } =
      getElements();

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    catalog.forEach((index) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "remote-sensing-index-card";

      /*
      ----------------------------------------------------------
       Spectral-index selection is locked while an index
       workflow is running.
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

      button.title =
        index.description ||
        index.name;

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
        () =>
          selectRemoteSensingIndex(
            index
          )
      );

      grid.appendChild(
        button
      );
    });
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

  async function ensureRasterIndex(
    index,
    sequence
  ) {
    if (
      !index ||
      !index.code
    ) {
      return;
    }

    /*
    ----------------------------------------------------------
     Only NDVI currently has an authoritative production
     rebuild path from the prepared Sentinel-2 scene.

     Other indices continue using their existing output path.
    ----------------------------------------------------------
    */

    if (
      String(index.code)
        .trim()
        .toUpperCase() !==
      "NDVI"
    ) {
      return;
    }

    updateStatus(
      "NDVI: checking analytical output..."
    );

    resetRemoteSensingProgress(
      "Building NDVI..."
    );

    updateRemoteSensingProgress(
      5,
      "Building NDVI..."
    );

    const response =
      await fetch(
        ENSURE_RASTER_INDEX_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            indexCode:
              "NDVI",
          }),
        }
      );

    if (
      sequence !==
      renderSequence
    ) {
      return;
    }

    if (!response.ok) {
      let message =
        `NDVI build request failed: ${response.status}`;

      try {
        const payload =
          await response.json();

        if (
          payload &&
          payload.message
        ) {
          message =
            payload.message;
        }
      } catch (_) {
        /*
        Response body is optional
        for error reporting.
        */
      }

      throw new Error(
        message
      );
    }

    const payload =
      await response.json();

    if (
      !payload ||
      payload.success !== true ||
      payload.status !== "ready"
    ) {
      throw new Error(
        "NDVI ensure request returned an invalid response."
      );
    }

    if (
      payload.built === true
    ) {
      updateRemoteSensingProgress(
        100,
        "NDVI built. Loading NDVI..."
      );

      updateStatus(
        "NDVI built. Loading NDVI..."
      );
    } else {
      updateStatus(
        "NDVI ready. Loading NDVI..."
      );

      updateRemoteSensingProgress(
        100,
        "NDVI ready. Loading NDVI..."
      );
    }
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
      "Loading spectral indices..."
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
    const { rail } =
      getElements();

    if (!rail) {
      return false;
    }

    rail.classList.remove(
      "is-hidden"
    );

    loadRemoteSensingCatalog();

    return true;
  }

  function closeRemoteSensingTool() {
    const { rail } =
      getElements();

    if (!rail) {
      return false;
    }

    rail.classList.add(
      "is-hidden"
    );

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
