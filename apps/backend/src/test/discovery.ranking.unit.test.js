const discoveryService = require("../modules/discovery/discovery.service");

describe("Discovery Ranking", () => {
  it("should rank higher score for nearer and better stocked product", () => {
    const near = discoveryService._internals.buildProductScore({
      distanceKm: 1,
      ratingAverage: 4.5,
      stock: 20,
      price: 100,
    });

    const far = discoveryService._internals.buildProductScore({
      distanceKm: 10,
      ratingAverage: 3,
      stock: 2,
      price: 100,
    });

    expect(near).toBeGreaterThan(far);
  });

  it("should sort rows by price when sortBy is price_asc", () => {
    const rows = [
      { _id: "p1", price: 80, score: 60, distanceKm: 2 },
      { _id: "p2", price: 30, score: 30, distanceKm: 1 },
      { _id: "p3", price: 50, score: 50, distanceKm: 3 },
    ];

    const sorted = discoveryService._internals.sortProductRows(rows, "price_asc");
    expect(sorted.map(r => r._id)).toEqual(["p2", "p3", "p1"]);
  });
});
