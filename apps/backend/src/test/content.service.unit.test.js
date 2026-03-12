jest.mock("../modules/content/models/cmsPage.model", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => ({ _id: "page-1", ...update.$set })),
  find: jest.fn(() => ({
    sort: jest.fn(async () => [{ slug: "about-us" }]),
  })),
}));

jest.mock("../modules/content/models/seoRule.model", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => ({ _id: "seo-1", ...update.$set })),
  find: jest.fn(() => ({
    sort: jest.fn(async () => [{ entityType: "PAGE" }]),
  })),
}));

jest.mock("../modules/content/models/abExperiment.model", () => ({
  create: jest.fn(async payload => ({ _id: "exp-1", ...payload })),
  find: jest.fn(() => ({
    sort: jest.fn(async () => [{ name: "Hero test" }]),
  })),
}));

const service = require("../modules/content/content.service");

describe("content service", () => {
  it("upserts CMS pages and SEO rules", async () => {
    const page = await service.upsertPage({
      shopId: "shop-1",
      payload: { slug: "about", title: "About" },
    });
    const seo = await service.upsertSeoRule({
      shopId: "shop-1",
      payload: { entityType: "PAGE", entityRef: "about" },
    });

    expect(page.title).toBe("About");
    expect(seo.schemaType).toBe("WebPage");
  });

  it("creates A/B experiments", async () => {
    const row = await service.createExperiment({
      shopId: "shop-1",
      payload: { name: "Checkout CTA", targetType: "CHECKOUT", variants: [{ key: "A" }, { key: "B" }] },
    });
    expect(row.name).toBe("Checkout CTA");
  });
});
