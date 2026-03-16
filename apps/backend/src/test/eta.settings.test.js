const {
  DEFAULT_ETA_SETTINGS,
  normalizeBrackets,
  normalizeEtaSettings,
  bracketMinutes,
} = require("../utils/eta.util");

describe("ETA settings normalization", () => {
  test("normalizeBrackets filters invalid rows and sorts", () => {
    const input = [
      { maxDistanceKm: 10, minutes: 12 },
      { maxDistanceKm: "2", minutes: "5" },
      { maxDistanceKm: "bad", minutes: 6 },
      { maxDistanceKm: 5, minutes: "8" },
    ];

    const result = normalizeBrackets(input);
    expect(result).toEqual([
      { maxDistanceKm: 2, minutes: 5 },
      { maxDistanceKm: 5, minutes: 8 },
      { maxDistanceKm: 10, minutes: 12 },
    ]);
  });

  test("normalizeEtaSettings falls back to defaults", () => {
    const result = normalizeEtaSettings({
      basePerKm: "15",
      minEta: null,
      trafficFactors: [],
      distanceBrackets: [{ maxDistanceKm: 3, minutes: 9 }],
    });

    expect(result.basePerKm).toBe(15);
    expect(result.minEta).toBe(DEFAULT_ETA_SETTINGS.minEta);
    expect(result.trafficFactors).toEqual(DEFAULT_ETA_SETTINGS.trafficFactors);
    expect(result.distanceBrackets).toEqual([{ maxDistanceKm: 3, minutes: 9 }]);
  });
});

describe("ETA bracket selection", () => {
  test("bracketMinutes picks the first matching row", () => {
    const brackets = [
      { maxDistanceKm: 2, minutes: 5 },
      { maxDistanceKm: 5, minutes: 8 },
      { maxDistanceKm: 10, minutes: 12 },
    ];

    expect(bracketMinutes(1.5, brackets)).toBe(5);
    expect(bracketMinutes(3, brackets)).toBe(8);
    expect(bracketMinutes(9.9, brackets)).toBe(12);
  });

  test("bracketMinutes falls back to last row if exceeded", () => {
    const brackets = [
      { maxDistanceKm: 2, minutes: 5 },
      { maxDistanceKm: 5, minutes: 8 },
    ];

    expect(bracketMinutes(12, brackets)).toBe(8);
  });
});
