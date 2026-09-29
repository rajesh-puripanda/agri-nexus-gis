/* ============================================================
   AGRINEXUS GIS  WORKSPACE NAVIGATION
   Phase 11.4
   Controls workspace-level navigation only.
   Does not own scientific analysis or panel behavior.
   ============================================================ */

(function () {
  "use strict";

  const WORKSPACES = {
    map: {
      label: "Map",
      available: true,
    },

    analyze: {
      label: "Analyze",
      available: true,
    },

    report: {
      label: "Report",
      available: true,
    },

    remote: {
      label: "Remote",
      available: false,
    },

    crop: {
      label: "Crop",
      available: false,
    },

    trends: {
      label: "Trends",
      available: false,
    },

    risk: {
      label: "Risk",
      available: false,
    },
  };

  let activeWorkspace = "map";

  function getWorkspaceElements() {
    return {
      shell: document.querySelector(".agri-workspace"),
      map: document.querySelector(".agri-map-workspace"),
      context: document.querySelector(".agri-context-workspace"),
      analysis: document.querySelector(".analysis-workspace"),
      navigation: document.querySelector(".agri-workspace-nav"),
    };
  }

  function setActiveNavigationItem(workspace) {
    const navigation = document.querySelector(".agri-workspace-nav");

    if (!navigation) {
      return;
    }

    navigation.querySelectorAll(".agri-workspace-nav-item").forEach((item) => {
      const isActive = item.dataset.workspace === workspace;

      item.classList.toggle("active", isActive);
      item.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  function showWorkspace(workspace) {
    const definition = WORKSPACES[workspace];

    if (!definition || !definition.available) {
      console.warn(
        `Workspace "${workspace}" is not available in the current AgriNexus build.`
      );
      return false;
    }

    const elements = getWorkspaceElements();

    if (!elements.map || !elements.analysis || !elements.context) {
      console.error("Required AgriNexus workspace elements are missing.");
      return false;
    }

    /*
     * Map workspace:
     * Keep the GIS map and selected-element context visible.
     */
    const isMap = workspace === "map";

    /*
     * Analyze workspace:
     * Show the existing analytical workspace while retaining the
     * GIS map as the persistent spatial context.
     */
    const isAnalyze = workspace === "analyze";

    /*
     * Report workspace:
     * Use the existing integrated report panel.
     */
    const isReport = workspace === "report";

    elements.map.classList.toggle("workspace-hidden", !isMap && !isAnalyze && !isReport);
    elements.context.classList.toggle("workspace-hidden", !isMap && !isAnalyze && !isReport);
    elements.analysis.classList.toggle("workspace-hidden", isMap);

    if (isReport) {
      elements.analysis.classList.add("workspace-report-focus");
    } else {
      elements.analysis.classList.remove("workspace-report-focus");
    }

    activeWorkspace = workspace;
    setActiveNavigationItem(workspace);

    document.body.dataset.activeWorkspace = workspace;

    return true;
  }

  function handleNavigationClick(event) {
    const button = event.target.closest(".agri-workspace-nav-item");

    if (!button) {
      return;
    }

    const workspace = button.dataset.workspace;

    if (!workspace || !WORKSPACES[workspace]) {
      return;
    }

    showWorkspace(workspace);
  }

  function initializeWorkspaceNavigation() {
    const navigation = document.querySelector(".agri-workspace-nav");

    if (!navigation) {
      console.error("AgriNexus workspace navigation was not found.");
      return false;
    }

    navigation.addEventListener("click", handleNavigationClick);

    navigation.querySelectorAll(".agri-workspace-nav-item").forEach((button) => {
      const workspace = button.dataset.workspace;
      const definition = WORKSPACES[workspace];

      if (!definition || !definition.available) {
        button.classList.add("is-reserved");
        button.setAttribute("aria-disabled", "true");
        button.title = `${definition?.label || workspace} workspace reserved for a later phase`;
      }
    });

    showWorkspace("map");

    console.log(
      "Workspace navigation initialized.",
      Object.keys(WORKSPACES)
    );

    return true;
  }

  function getActiveWorkspace() {
    return activeWorkspace;
  }

  window.initializeWorkspaceNavigation = initializeWorkspaceNavigation;
  window.getActiveWorkspace = getActiveWorkspace;
})();
