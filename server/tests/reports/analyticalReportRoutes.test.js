"use strict";

// ============================================================
// server/tests/reports/analyticalReportRoutes.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6.5 - Integrated Analytical GIS Reporting API
//
// Route-level contract tests.
//
// Verifies:
//   1. POST route exists
//   2. Route path is correct
//   3. Controller handler is connected
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const express = require("express");

const routerPath =
  "../../routes/analyticalReportRoutes";

const controllerPath =
  "../../controllers/analyticalReportController";

test(
  "integrated analytical GIS reporting route is registered correctly",
  () => {
    const router =
      require(routerPath);

    assert.ok(router);
    assert.ok(Array.isArray(router.stack));

    const matchingLayer =
      router.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path ===
            "/integrated-analytical-gis" &&
          layer.route.methods.post === true,
      );

    assert.ok(
      matchingLayer,
      "Expected POST /integrated-analytical-gis route.",
    );

    assert.strictEqual(
      matchingLayer.route.stack.length,
      1,
    );

    assert.strictEqual(
      typeof matchingLayer.route.stack[0].handle,
      "function",
    );
  },
);

test(
  "route module exports an Express router",
  () => {
    const router =
      require(routerPath);

    assert.ok(router);
    assert.ok(Array.isArray(router.stack));

    const app =
      express();

    app.use(
      "/api/reports",
      router,
    );

    assert.ok(
      app._router ||
        app.router,
      "Expected Express application router.",
    );
  },
);

test(
  "analytical report controller exports the expected handler",
  () => {
    const controller =
      require(controllerPath);

    assert.strictEqual(
      typeof
        controller
          .generateIntegratedAnalyticalGISReport,
      "function",
    );
  },
);
