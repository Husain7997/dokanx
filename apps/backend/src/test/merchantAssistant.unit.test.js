const assistantService = require("../modules/merchant-assistant/merchantAssistant.service");

describe("Merchant Assistant Helpers", () => {
  it("should normalize Bengali digits", () => {
    const normalized = assistantService._internals.normalizeBanglaDigits("আজ ১২৩ টাকা");
    expect(normalized).toBe("আজ 123 টাকা");
  });

  it("should detect SALES_TODAY intent", () => {
    const intent = assistantService._internals.detectIntent("আজকের sales বলুন");
    expect(intent).toBe("SALES_TODAY");
  });

  it("should detect LOW_STOCK intent", () => {
    const intent = assistantService._internals.detectIntent("low stock দেখাও");
    expect(intent).toBe("LOW_STOCK");
  });

  it("should return HELP for unknown text", () => {
    const intent = assistantService._internals.detectIntent("hello");
    expect(intent).toBe("HELP");
  });

  it("should detect CONTACT_SUPPORT intent", () => {
    const intent = assistantService._internals.detectIntent("Please contact admin");
    expect(intent).toBe("CONTACT_SUPPORT");
  });

  it("should build queued draft action proposal", () => {
    const proposal = assistantService._internals.buildContactActionProposal({
      rawMessage: "Need urgent callback from staff",
      channel: "VOICE",
    });

    expect(proposal.mode).toBe("QUEUED_DRAFT");
    expect(proposal.targetRole).toBe("STAFF");
    expect(proposal.channel).toBe("VOICE");
  });
});
