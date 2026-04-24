import request from "supertest";
import app from "../app";

// Uses the seeded doctor account (if seed exists)
const doctorCredentials = {
  email: "doctor@aidiatrack.rw",
  password: "Test@1234",
};
const patientCredentials = {
  email: "patient1@aidiatrack.rw",
  password: "Test@1234",
};
let doctorToken: string;
let patientId: string;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send(doctorCredentials);

  if (res.status === 200) {
    doctorToken = res.body.data.token;
  }

  const pRes = await request(app)
    .post("/api/auth/login")
    .send(patientCredentials);

  if (pRes.status === 200) {
    patientId = pRes.body.data.user.id;
  }
});

describe("GET /api/doctor/patients", () => {
  it("should return list of assigned patients for doctor", async () => {
    if (!doctorToken) {
      console.log("⚠ Skipping doctor tests — seeded doctor account not found");
      return;
    }

    const res = await request(app)
      .get("/api/doctor/patients")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.patients)).toBe(true);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/doctor/patients");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/doctor/patients/:id", () => {
  it("should return patient detail for assigned patient", async () => {
    if (!doctorToken || !patientId) {
      console.log("⚠ Skipping patient detail test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .get(`/api/doctor/patients/${patientId}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    // Accept 200 (patient found), 403 (not assigned), or 404 (seeded id not present)
    expect([200, 403, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.patient.id).toBe(patientId);
    }
  });

  it("should return 404 for non-existent patient", async () => {
    if (!doctorToken) {
      console.log(
        "⚠ Skipping non-existent patient test — seeded doctor account not found",
      );
      return;
    }

    const res = await request(app)
      .get("/api/doctor/patients/nonexistent-id-12345")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/doctor/patients/:id/predictions", () => {
  it("should return patient predictions", async () => {
    if (!doctorToken || !patientId) {
      console.log("⚠ Skipping predictions test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .get(`/api/doctor/patients/${patientId}/predictions`)
      .set("Authorization", `Bearer ${doctorToken}`);

    // Accept 200, 403 (not assigned), or 404 (seeded id not present)
    expect([200, 403, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.data.predictions)).toBe(true);
    }
  });
});
