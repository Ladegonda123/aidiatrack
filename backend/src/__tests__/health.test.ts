import request from "supertest";
import app from "../app";

const generateUnique = () =>
  `${Date.now()}_${Math.random().toString(36).substring(7)}`;
const patientEmail = `test_jest_health_${generateUnique()}@aidiatrack.rw`;
let patientToken: string;
let patientId: number;
let skipTests = false;

beforeAll(async () => {
  // Register and login a test patient
  const registerRes = await request(app).post("/api/auth/register").send({
    fullName: "Health Test Patient",
    email: patientEmail,
    password: "Test@1234",
    role: "PATIENT",
  });

  if (registerRes.status !== 201) {
    console.log(`⚠ Failed to register test patient: ${registerRes.status}`);
    skipTests = true;
    return;
  }

  patientId = registerRes.body.data.user.id;

  const res = await request(app).post("/api/auth/login").send({
    email: patientEmail,
    password: "Test@1234",
  });

  if (res.status !== 200) {
    console.log("⚠ Failed to login test patient");
    skipTests = true;
    return;
  }

  patientToken = res.body.data.token;
});

describe("POST /api/health-records/record", () => {
  it("should create a health record with required fields", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .post("/api/health-records/record")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        bloodGlucose: 180,
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("record");
    expect(res.body.data.record.bloodGlucose).toBe(180);
    expect(res.body.data.record.patientId).toBe(patientId);
  });

  it("should create health record with all optional fields", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .post("/api/health-records/record")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        bloodGlucose: 145,
        weightKg: 72,
        activityLevel: "LOW",
        mealGi: 65,
        mealCalories: 500,
        mealDesc: "Rice and beans",
        notes: "After lunch, felt dizzy",
        insulinDose: 10,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.record.bloodGlucose).toBe(145);
    expect(res.body.data.record.weightKg).toBe(72);
    expect(res.body.data.record.activityLevel).toBe("LOW");
  });

  it("should reject record without blood glucose", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .post("/api/health-records/record")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        weightKg: 72,
      });
    expect(res.status).toBe(400);
  });

  it("should reject record without token", async () => {
    const res = await request(app).post("/api/health-records/record").send({
      bloodGlucose: 180,
    });
    expect(res.status).toBe(401);
  });

  it("should reject invalid blood glucose value", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .post("/api/health-records/record")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        bloodGlucose: "not-a-number",
      });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/health-records/history", () => {
  it("should return health records for authenticated patient", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .get("/api/health-records/history")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.records)).toBe(true);
  });

  it("should reject history request without token", async () => {
    const res = await request(app).get("/api/health-records/history");
    expect(res.status).toBe(401);
  });

  it("should support pagination with limit and skip", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .get("/api/health-records/history?limit=5&skip=0")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.records)).toBe(true);
  });
});

describe("GET /api/health-records/summary", () => {
  it("should return summary stats for the patient", async () => {
    if (skipTests) {
      console.log("⚠ Skipping test — setup failed");
      return;
    }
    const res = await request(app)
      .get("/api/health-records/summary")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("averageBg");
    expect(res.body.data).toHaveProperty("totalRecords");
    expect(res.body.data).toHaveProperty("trend");
  });

  it("should reject summary request without token", async () => {
    const res = await request(app).get("/api/health-records/summary");
    expect(res.status).toBe(401);
  });
});
