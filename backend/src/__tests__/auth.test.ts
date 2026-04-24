import request from "supertest";
import app from "../app";

const generateUnique = () =>
  `${Date.now()}_${Math.random().toString(36).substring(7)}`;
const testEmail = `test_jest_${generateUnique()}@aidiatrack.rw`;
const testPassword = "Test@1234";
let authToken: string;
let userId: string;

describe("POST /api/auth/register", () => {
  it("should register a new patient successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Jest Test Patient",
      email: testEmail,
      password: testPassword,
      role: "PATIENT",
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe("PATIENT");
    userId = res.body.data.user.id;
  });

  it("should reject duplicate email registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Jest Test Patient Duplicate",
      email: testEmail,
      password: testPassword,
      role: "PATIENT",
    });
    expect(res.status).toBe(409);
  });

  it("should reject invalid email format", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Jest Test Invalid",
      email: "invalid-email",
      password: testPassword,
      role: "PATIENT",
    });
    expect(res.status).toBe(400);
  });

  it("should reject password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Jest Test Short Pass",
        email: `test_jest_shortpass_${Date.now()}@aidiatrack.rw`,
        password: "Short@1",
        role: "PATIENT",
        language: "en",
      });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("should login with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: testPassword,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.email).toBe(testEmail);
    authToken = res.body.data.token;
  });

  it("should reject login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "WrongPass@999",
    });
    expect(res.status).toBe(401);
  });

  it("should reject login with non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nonexistent_jest@aidiatrack.rw",
      password: testPassword,
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("should return current user with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.id).toBe(userId);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("should reject request with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid_token_12345");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/auth/profile", () => {
  it("should update user profile with valid token", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        fullName: "Updated Jest Patient",
        language: "rw",
      });
    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe("Updated Jest Patient");
    expect(res.body.data.user.language).toBe("rw");
  });

  it("should reject profile update without token", async () => {
    const res = await request(app).put("/api/auth/profile").send({
      fullName: "Unauthorized Update",
    });
    expect(res.status).toBe(401);
  });
});
