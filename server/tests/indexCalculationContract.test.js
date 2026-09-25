"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateCalculationRequest,
  validateCalculationRequestAgainstRegistry,
} = require("../scientific/remoteSensing/indices/indexCalculationContract");

test("unknown index code is rejected by registry validation", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "UNKNOWN",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
      },
    });

  assert.equal(result.valid, false);

  assert.ok(
    result.errors.includes(
      "Unknown remote sensing index: UNKNOWN"
    )
  );
});

test("NDVI request is accepted when all registered bands are supplied", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "NDVI",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
      },
    });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.indexCode, "NDVI");
  assert.equal(result.definition.code, "NDVI");
});

test("NDVI request is rejected when Red band is missing", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "NDVI",
      inputs: {
        NIR: "band-nir",
      },
    });

  assert.equal(result.valid, false);

  assert.ok(
    result.errors.includes(
      "NDVI: missing required input band: Red"
    )
  );
});

test("NDVI request is rejected when NIR band is missing", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "NDVI",
      inputs: {
        Red: "band-red",
      },
    });

  assert.equal(result.valid, false);

  assert.ok(
    result.errors.includes(
      "NDVI: missing required input band: NIR"
    )
  );
});

test("EVI request requires NIR, Red, and Blue", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "EVI",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
      },
    });

  assert.equal(result.valid, false);

  assert.ok(
    result.errors.includes(
      "EVI: missing required input band: Blue"
    )
  );
});

test("EVI request is accepted with all registered bands", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "EVI",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
        Blue: "band-blue",
      },
    });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.definition.code, "EVI");
});

test("NDMI requires NIR and SWIR", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "NDMI",
      inputs: {
        NIR: "band-nir",
      },
    });

  assert.equal(result.valid, false);

  assert.ok(
    result.errors.includes(
      "NDMI: missing required input band: SWIR"
    )
  );
});

test("NDMI request is accepted with all registered bands", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "NDMI",
      inputs: {
        NIR: "band-nir",
        SWIR: "band-swir",
      },
    });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("SAVI request uses the registered NIR and Red inputs", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "SAVI",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
      },
  });

  assert.equal(result.valid, true);
  assert.equal(result.definition.code, "SAVI");
});

test("ARVI requires NIR, Red, and Blue", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "ARVI",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
      },
    });

  assert.equal(result.valid, false);

  assert.ok(
    result.errors.includes(
      "ARVI: missing required input band: Blue"
    )
  );
});

test("case and whitespace normalization works through the registry", () => {
  const result =
    validateCalculationRequestAgainstRegistry({
      indexCode: "  ndvi  ",
      inputs: {
        NIR: "band-nir",
        Red: "band-red",
      },
    });

  assert.equal(result.valid, true);
  assert.equal(result.indexCode, "NDVI");
});

test("structural validation remains available independently", () => {
  const result = validateCalculationRequest({
    indexCode: "NDVI",
    inputs: {
      NIR: "band-nir",
      Red: "band-red",
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
