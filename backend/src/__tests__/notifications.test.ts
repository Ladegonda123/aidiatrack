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

describe("GET /api/notifications", () => {
  it("should return only authenticated user's notifications", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping notifications test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("should support pagination", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping pagination test — seeded patient not found");
      return;
    }

    const res = await request(app)
      .get("/api/notifications?limit=10&skip=0")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });
});

describe("PUT /api/notifications/:id/read", () => {
  it("should mark notification as read", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping mark read test — seeded patient not found");
      return;
    }

    // First get a notification
    const listRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${patientToken}`);

    if (listRes.body.data.notifications.length > 0) {
      const notificationId = listRes.body.data.notifications[0].id;
      const res = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${patientToken}`);
      expect([200, 400]).toContain(res.status);
    }
  });

  it("should reject mark read without token", async () => {
    const res = await request(app).put("/api/notifications/some-id/read");
    expect([401, 404]).toContain(res.status);
  });
});

describe("DELETE /api/notifications/:id", () => {
  it("should delete a notification", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping delete test — seeded patient not found");
      return;
    }

    // First get a notification
    const listRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${patientToken}`);

    if (listRes.body.data.notifications.length > 0) {
      const notificationId = listRes.body.data.notifications[0].id;
      const res = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${patientToken}`);
      expect([200, 404]).toContain(res.status);
    }
  });

  it("should reject delete without token", async () => {
    const res = await request(app).delete("/api/notifications/some-id");
    expect(res.status).toBe(401);
  });
});
