jest.mock("../models/TaxRule", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/payment.model", () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  findById: jest.fn(),
}));

const TaxRule = require("../models/TaxRule");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");
const service = require("../modules/billing/vatReport.service");

describe("vatReport.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should calculate vat summary", async () => {
    TaxRule.findOne.mockReturnValue({
      lean: async () => ({ rate: 15, name: "Standard VAT" }),
    });
    Payment.aggregate.mockResolvedValue([{ taxableSales: 1000, paymentCount: 2 }]);

    const result = await service.getVatSummary({});
    expect(result.vatAmount).toBe(150);
    expect(result.paymentCount).toBe(2);
  });

  it("should build export rows", async () => {
    TaxRule.findOne.mockReturnValue({
      lean: async () => ({ rate: 15, name: "Standard VAT" }),
    });
    Payment.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            {
              createdAt: "2026-03-11",
              shopId: "shop-1",
              order: "order-1",
              providerPaymentId: "pay-1",
              amount: 200,
              currency: "BDT",
            },
          ],
        }),
      }),
    });

    const rows = await service.buildVatExportRows({});
    expect(rows[0].vatAmount).toBe(30);
  });

  it("should build Mushak invoice data", async () => {
    TaxRule.findOne.mockReturnValue({
      lean: async () => ({ rate: 15, name: "Standard VAT" }),
    });
    Order.findById.mockReturnValue({
      lean: async () => ({
        _id: "order-1",
        shopId: "shop-1",
        totalAmount: 100,
        createdAt: "2026-03-11",
        contact: { phone: "01700000000" },
        items: [{ product: "prod-1", quantity: 2, price: 50 }],
      }),
    });

    const row = await service.getMushakInvoiceData({ orderId: "order-1" });
    expect(row.summary.vatAmount).toBe(15);
    expect(row.formNo).toBe("Musak-6.3");
  });
});
