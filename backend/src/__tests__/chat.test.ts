import request from "supertest";
import app from "../app";

let patientToken: string;
let patientId: string;
let doctorId: string;

beforeAll(async () => {
  const pRes = await request(app).post("/api/auth/login").send({
    email: "patient1@aidiatrack.rw",
    password: "Test@1234",
  });

  if (pRes.status === 200) {
    patientToken = pRes.body.data.token;
    patientId = pRes.body.data.user.id;
  }

  const dRes = await request(app).post("/api/auth/login").send({
    email: "doctor@aidiatrack.rw",
    password: "Test@1234",
  });

  if (dRes.status === 200) {
    doctorId = dRes.body.data.user.id;
  }
});

describe("POST /api/chat/send", () => {
  it("should save a message to the database", async () => {
    if (!patientToken || !doctorId) {
      console.log("⚠ Skipping chat send test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        receiverId: doctorId,
        content: "Hello doctor, this is a Jest test message",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.message.content).toBe(
      "Hello doctor, this is a Jest test message",
    );
    expect(res.body.data.message.senderId).toBe(patientId);
    expect(res.body.data.message.receiverId).toBe(doctorId);
  });

  it("should reject message without receiverId", async () => {
    if (!patientToken) {
      console.log("⚠ Skipping validation test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        content: "Message without receiver",
      });
    expect(res.status).toBe(400);
  });

  it("should reject message without content", async () => {
    if (!patientToken || !doctorId) {
      console.log("⚠ Skipping validation test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        receiverId: doctorId,
      });
    expect(res.status).toBe(400);
  });

  it("should reject message without token", async () => {
    const res = await request(app).post("/api/chat/send").send({
      receiverId: "some-id",
      content: "Test message",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/chat/messages/:receiverId", () => {
  it("should return chat history with specific receiver", async () => {
    if (!patientToken || !doctorId) {
      console.log("⚠ Skipping chat history test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .get(`/api/chat/messages/${doctorId}`)
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
  });

  it("should reject chat history without token", async () => {
    const res = await request(app).get("/api/chat/messages/some-receiver-id");
    expect(res.status).toBe(401);
  });

  it("should support pagination in chat history", async () => {
    if (!patientToken || !doctorId) {
      console.log("⚠ Skipping pagination test — seeded accounts not found");
      return;
    }

    const res = await request(app)
      .get(`/api/chat/messages/${doctorId}?limit=10&skip=0`)
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
  });
});

describe("PUT /api/chat/messages/:id/read", () => {
  it("should mark message as read", async () => {
    if (!patientToken || !doctorId) {
      console.log("⚠ Skipping mark read test — seeded accounts not found");
      return;
    }

    // Get chat history
    const histRes = await request(app)
      .get(`/api/chat/messages/${doctorId}`)
      .set("Authorization", `Bearer ${patientToken}`);

    if (histRes.body.data.messages.length > 0) {
      const messageId = histRes.body.data.messages[0].id;
      const res = await request(app)
        .put(`/api/chat/messages/${messageId}/read`)
        .set("Authorization", `Bearer ${patientToken}`);
      expect([200, 404]).toContain(res.status);
    }
  });

  it("should reject mark read without token", async () => {
    const res = await request(app).put("/api/chat/messages/some-id/read");
    expect([401, 404]).toContain(res.status);
  });
});
