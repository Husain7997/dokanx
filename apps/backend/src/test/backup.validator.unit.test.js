const validator = require("../modules/backup/backup.validator");

describe("backup.validator", () => {
  it("should reject invalid backup job payload", () => {
    const result = validator.validateBackupJobBody({
      backupType: "wrong",
      retentionDays: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("backupType is invalid");
    expect(result.errors).toContain("retentionDays must be >= 1");
  });

  it("should accept valid restore request payload", () => {
    const result = validator.validateRestoreRequestBody({
      targetTimestamp: new Date().toISOString(),
      scope: "SYSTEM",
    });

    expect(result.valid).toBe(true);
  });
});
