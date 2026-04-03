import { Request, Response } from "express";
import prisma from "../../src/config/database";
import {
  assignPatient,
  getMyPatientByEmail,
  getUnassignedPatients,
  unassignPatient,
} from "../../src/controllers/admin.controller";

jest.mock("../../src/config/database", () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignPatient", () => {
    it("assigns a patient to the current doctor", async () => {
      const req = {
        body: { patientEmail: "patient@test.com" },
        user: { userId: 7, role: "DOCTOR" },
      } as Request;
      const res = mockResponse();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 21,
        doctorId: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 21,
        fullName: "Patient One",
        email: "patient@test.com",
        phone: "250700000000",
        role: "PATIENT",
        dateOfBirth: null,
        gender: null,
        doctorId: 7,
        fcmToken: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await assignPatient(req, res);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: "patient@test.com",
          role: "PATIENT",
        },
        select: {
          id: true,
          doctorId: true,
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 21 },
        data: { doctorId: 7 },
        select: expect.objectContaining({
          doctorId: true,
          email: true,
        }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 409 when patient belongs to another doctor", async () => {
      const req = {
        body: { patientEmail: "patient@test.com" },
        user: { userId: 7, role: "DOCTOR" },
      } as Request;
      const res = mockResponse();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 21,
        doctorId: 9,
      });

      await assignPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "This patient is already assigned to another doctor",
        }),
      );
    });
  });

  describe("unassignPatient", () => {
    it("unassigns a patient from the current doctor", async () => {
      const req = {
        body: { patientId: 21 },
        user: { userId: 7, role: "DOCTOR" },
      } as Request;
      const res = mockResponse();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 21,
        doctorId: 7,
        role: "PATIENT",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 21 });

      await unassignPatient(req, res);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 21 },
        data: { doctorId: null },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Patient unassigned successfully",
        }),
      );
    });

    it("returns 403 when the patient belongs to another doctor", async () => {
      const req = {
        body: { patientId: 21 },
        user: { userId: 7, role: "DOCTOR" },
      } as Request;
      const res = mockResponse();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 21,
        doctorId: 9,
        role: "PATIENT",
      });

      await unassignPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("getUnassignedPatients", () => {
    it("returns patients without doctors ordered by newest first", async () => {
      const req = {} as Request;
      const res = mockResponse();

      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          fullName: "Patient One",
          email: "one@test.com",
          phone: null,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ]);

      await getUnassignedPatients(req, res);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: "PATIENT",
          doctorId: null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getMyPatientByEmail", () => {
    it("searches assigned patients by email or name", async () => {
      const req = {
        query: { email: "marie" },
        user: { userId: 7, role: "DOCTOR" },
      } as unknown as Request;
      const res = mockResponse();

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await getMyPatientByEmail(req, res);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: "PATIENT",
          doctorId: 7,
          OR: [
            {
              email: {
                contains: "marie",
                mode: "insensitive",
              },
            },
            {
              fullName: {
                contains: "marie",
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when the search query is missing", async () => {
      const req = {
        query: {},
        user: { userId: 7, role: "DOCTOR" },
      } as Request;
      const res = mockResponse();

      await getMyPatientByEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Email query parameter is required",
        }),
      );
    });
  });
});
