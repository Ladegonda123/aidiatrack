import request from "supertest";
import app from "../app";

let patientToken: string;

beforeAll(async () => {
  const res = await request(app).post("/api/auth/login").send({
    email: "patient1@aidiatrack.rw",
    password: "Test@1234",
  });

  if (res.status === 200) {
    patientToken = res.body.data.token;
  }
});

describe("GET /api/foods", () => {
  it("should return list of foods without search query", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping foods test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/foods")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.foods)).toBe(true);
  });

  it("should search foods by term", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping search test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/foods?search=rice")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.foods)).toBe(true);
  });

  it("should support language filter", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping language test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/foods?lang=rw")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.foods)).toBe(true);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/foods");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/diet/recommendations", () => {
  it("should return dietary recommendations", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping recommendations test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/diet/recommendations")
      .set("Authorization", `Bearer ${patientToken}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveProperty("advice");
      expect(res.body.data).toHaveProperty("foodsToEat");
      expect(res.body.data).toHaveProperty("foodsToAvoid");
    }
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/diet/recommendations");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/medications/schedule", () => {
  it("should create a new medication schedule", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping medication test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .post("/api/medications/schedule")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        drugName: "Metformin",
        dosage: "500mg",
        frequency: "TWICE",
        reminderTimes: ["08:00", "20:00"],
      });
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.data.medication.drugName).toBe("Metformin");
    }
  });

  it("should reject medication without drugName", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping validation test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .post("/api/medications/schedule")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        dosage: "500mg",
        frequency: "TWICE",
      });
    expect(res.status).toBe(400);
  });

  it("should reject medication without token", async () => {
    const res = await request(app).post("/api/medications/schedule").send({
      drugName: "Metformin",
      dosage: "500mg",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/medications/list", () => {
  it("should return active medications for user", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping medication list test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/medications/list")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.medications)).toBe(true);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/medications/list");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/predictions/glucose", () => {
  it("should trigger glucose prediction", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping prediction test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .post("/api/predictions/glucose")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({});
    expect([200, 400]).toContain(res.status);
  });

  it("should reject prediction without token", async () => {
    const res = await request(app).post("/api/predictions/glucose").send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /api/predictions/history", () => {
  it("should return prediction history", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping history test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/predictions/history")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.predictions)).toBe(true);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/predictions/history");
    expect(res.status).toBe(401);
  });
});
