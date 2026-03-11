jest.mock("../models/TaxRule", () => ({
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../modules/billing/vatReport.service", () => ({
  getVatSummary: jest.fn(),
  buildVatExportRows: jest.fn(),
  getMushakInvoiceData: jest.fn(),
}));

const ctrl = require("../controllers/admin/tax.controller");
const vatReportService = require("../modules/billing/vatReport.service");

function createRes() {
  return {
    headers: {},
    body: null,
    statusCode: 200,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("admin tax controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return VAT summary", async () => {
    vatReportService.getVatSummary.mockResolvedValue({ vatAmount: 150 });
    const res = createRes();
    await ctrl.vatSummary({ query: {} }, res);
    expect(res.body.data.vatAmount).toBe(150);
  });

  it("should export VAT CSV", async () => {
    vatReportService.buildVatExportRows.mockResolvedValue([{ amount: 100, vatAmount: 15 }]);
    const res = createRes();
    await ctrl.exportVatCSV({ query: {} }, res);
    expect(res.headers["Content-Type"]).toBe("text/csv");
  });

  it("should return Mushak invoice", async () => {
    vatReportService.getMushakInvoiceData.mockResolvedValue({ invoiceNo: "MSK-1" });
    const res = createRes();
    await ctrl.getMushakInvoice({ params: { orderId: "order-1" } }, res);
    expect(res.body.data.invoiceNo).toBe("MSK-1");
  });
});
