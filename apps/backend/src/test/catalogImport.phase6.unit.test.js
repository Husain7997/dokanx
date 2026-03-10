const catalogImportService = require("../modules/catalog-import/catalogImport.service");

describe("Phase 6 Catalog Import Intelligence", () => {
  it("should auto-detect brand and category from product name", () => {
    const rows = [
      {
        "Product Name": "Lux Soap 100g",
        Price: "70",
      },
    ];

    const mapped = catalogImportService._internals.mapRows(rows);

    expect(mapped[0].brand).toBe("Unilever");
    expect(mapped[0].category).toBe("Beauty Soap");
    expect(mapped[0].errors).toEqual([]);
  });

  it("should mark duplicate rows inside same upload file", () => {
    const rows = [
      { Name: "Napa Tablet", Price: "12" },
      { Name: "Napa Tablet", Price: "13" },
    ];

    const mapped = catalogImportService._internals.mapRows(rows);

    expect(mapped[0].errors).toEqual([]);
    expect(mapped[1].errors).toContain("Duplicate row in file");
  });
});
