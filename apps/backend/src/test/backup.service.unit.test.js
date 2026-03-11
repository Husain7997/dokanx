jest.mock("../modules/backup/models/backupJob.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../modules/backup/models/restoreRequest.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));

const BackupJob = require("../modules/backup/models/backupJob.model");
const RestoreRequest = require("../modules/backup/models/restoreRequest.model");
const service = require("../modules/backup/backup.service");

describe("backup.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should expose default strategy", () => {
    const rows = service.getBackupStrategy();
    expect(rows).toHaveLength(4);
    expect(rows[0].backupType).toBe("INCREMENTAL");
  });

  it("should create backup job with computed expiry", async () => {
    BackupJob.create.mockImplementation(async payload => payload);

    const row = await service.createBackupJob({
      actorId: "admin-1",
      payload: {
        backupType: "full",
        scheduledFor: "2026-03-11T00:00:00.000Z",
      },
    });

    expect(row.backupType).toBe("FULL");
    expect(row.retentionDays).toBe(30);
    expect(row.expiresAt).toBeInstanceOf(Date);
  });

  it("should mark restore request approved", async () => {
    const save = jest.fn().mockResolvedValue(true);
    RestoreRequest.findById.mockResolvedValue({
      _id: "rr-1",
      status: "REQUESTED",
      reason: "",
      save,
    });

    const row = await service.updateRestoreRequestStatus({
      requestId: "rr-1",
      actorId: "admin-1",
      status: "APPROVED",
      note: "reviewed",
    });

    expect(row.status).toBe("APPROVED");
    expect(row.approvedBy).toBe("admin-1");
    expect(save).toHaveBeenCalled();
  });
});
