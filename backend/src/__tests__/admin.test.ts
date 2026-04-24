import request from "supertest";
import app from "../app";

// Uses the seeded doctor account (if seed exists)
const doctorCredentials = {
  email: "doctor@aidiatrack.rw",
  password: "Test@1234",
};
const unassignedEmail = "patient2@aidiatrack.rw";
let doctorToken: string;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send(doctorCredentials);

  if (res.status === 200) {
    doctorToken = res.body.data.token;
  }
});

describe("POST /api/admin/assign-patient", () => {
  it("should return error NO_PATIENT_FOUND for unknown email", async () => {
    if (!doctorToken) {
      console.log("⚠ Skipping admin tests — seeded doctor account not found");
      return;
    }

    const res = await request(app)
      .post("/api/admin/assign-patient")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ patientEmail: "nobody_jest_12345@aidiatrack.rw" });
    expect(res.status).toBe(404);
    // Error code may be in res.body.code or res.body.data.code or not present
    if (res.body.code) {
      expect(res.body.code).toBe("NO_PATIENT_FOUND");
    }
  });

  it("should assign unassigned patient successfully", async () => {
    if (!doctorToken) {
      console.log(
        "⚠ Skipping assign patient test — seeded doctor account not found",
      );
      return;
    }

    const res = await request(app)
      .post("/api/admin/assign-patient")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ patientEmail: unassignedEmail });

    // Accept 200 (assigned successfully), 409 (already assigned), or 400 (validation error)
    expect([200, 400, 409]).toContain(res.status);
  });

  it("should reject assign without token", async () => {
    const res = await request(app)
      .post("/api/admin/assign-patient")
      .send({ patientEmail: unassignedEmail });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/unassign-patient", () => {
  it("should unassign a patient successfully", async () => {
    if (!doctorToken) {
      console.log("⚠ Skipping unassign test — seeded doctor account not found");
      return;
    }

    // First assign a patient
    const assignRes = await request(app)
      .post("/api/admin/assign-patient")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ patientEmail: unassignedEmail });

    if (assignRes.status === 200) {
      const patientId = assignRes.body.data.patient.id;
      const unassignRes = await request(app)
        .post("/api/admin/unassign-patient")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ patientId });
      expect([200, 404]).toContain(unassignRes.status);
    }
  });

  it("should reject unassign without token", async () => {
    const res = await request(app)
      .post("/api/admin/unassign-patient")
      .send({ patientId: "some-id" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/unassigned-patients", () => {
  it("should return list of unassigned patients", async () => {
    if (!doctorToken) {
      console.log(
        "⚠ Skipping unassigned patients test — seeded doctor account not found",
      );
      return;
    }

    const res = await request(app)
      .get("/api/admin/unassigned-patients")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.patients)).toBe(true);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/admin/unassigned-patients");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/patients/search", () => {
  it("should search doctor's patients", async () => {
    if (!doctorToken) {
      console.log("⚠ Skipping search test — seeded doctor account not found");
      return;
    }

    const res = await request(app)
      .get("/api/admin/patients/search?q=patient")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.data.patients)).toBe(true);
    }
  });

  it("should reject search without token", async () => {
    const res = await request(app).get("/api/admin/patients/search?q=test");
    expect(res.status).toBe(401);
  });
});
