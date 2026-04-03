import { PrismaClient, Role, ActivityLevel, RiskLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data (safe for development only)
  await prisma.dietRecommendation.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.healthRecord.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Test@1234", 12);

  // ── Create 1 Doctor ───────────────────────────────────────────────
  const doctor1 = await prisma.user.create({
    data: {
      fullName: "Dr. Amina Uwase",
      email: "doctor@aidiatrack.rw",
      passwordHash,
      role: Role.DOCTOR,
      phone: "+250788000001",
      gender: "Female",
    },
  });

  // ── Create 2 Patients ──────────────────────────────────────────────
  const patient1 = await prisma.user.create({
    data: {
      fullName: "Marie Mukamana",
      email: "patient1@aidiatrack.rw",
      passwordHash,
      role: Role.PATIENT,
      phone: "+250788100001",
      gender: "Female",
      dateOfBirth: new Date("1978-03-15"),
      doctorId: doctor1.id,
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      fullName: "Emmanuel Habimana",
      email: "patient2@aidiatrack.rw",
      passwordHash,
      role: Role.PATIENT,
      phone: "+250788100002",
      gender: "Male",
      dateOfBirth: new Date("1965-07-22"),
      doctorId: doctor1.id,
    },
  });

  // ── Health Records for Patient 1 ──────────────────────────────────
  const glucoseReadings = [145, 162, 138, 175, 120];
  const createdHealthRecords: Array<{ id: number }> = [];
  for (let i = 0; i < glucoseReadings.length; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (4 - i));
    const healthRecord = await prisma.healthRecord.create({
      data: {
        patientId: patient1.id,
        bloodGlucose: glucoseReadings[i],
        weightKg: 68.5,
        bmi: 25.4,
        mealDesc:
          i % 2 === 0 ? "Ugali with beans and vegetables" : "Rice with isombe",
        calories: i % 2 === 0 ? 520 : 480,
        activityLevel: ActivityLevel.LOW,
        insulinDose: 0,
        notes: "Feeling okay",
        recordedAt: date,
      },
    });
    createdHealthRecords.push({ id: healthRecord.id });
  }

  // ── Medications for Patient 1 ─────────────────────────────────────
  await prisma.medication.createMany({
    data: [
      {
        patientId: patient1.id,
        drugName: "Metformin",
        dosage: "500mg",
        frequency: "twice daily",
        reminderTimes: ["08:00", "20:00"],
        isActive: true,
        prescribedBy: doctor1.id,
      },
      {
        patientId: patient1.id,
        drugName: "Glipizide",
        dosage: "5mg",
        frequency: "once daily",
        reminderTimes: ["09:00"],
        isActive: true,
        prescribedBy: doctor1.id,
      },
      {
        patientId: patient1.id,
        drugName: "Lisinopril",
        dosage: "10mg",
        frequency: "once daily",
        reminderTimes: ["07:30"],
        isActive: true,
        prescribedBy: doctor1.id,
      },
    ],
  });

  // ── Sample Prediction for Patient 1 ──────────────────────────────
  await prisma.prediction.create({
    data: {
      patientId: patient1.id,
      predictedGlucose: 168.5,
      predictionHours: 2,
      riskLevel: RiskLevel.MEDIUM,
      riskFactors: { high_carb_meal: true, low_activity: true },
      confidence: 0.82,
      modelVersion: "1.0.0-placeholder",
    },
  });

  // ── Sample Chat Messages ──────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      {
        senderId: patient1.id,
        receiverId: doctor1.id,
        content:
          "Good morning doctor, my sugar was 175 this morning after breakfast.",
        isRead: true,
      },
      {
        senderId: doctor1.id,
        receiverId: patient1.id,
        content:
          "Thank you Marie. Please reduce your carbohydrate intake at breakfast.",
        isRead: true,
      },
      {
        senderId: patient1.id,
        receiverId: doctor1.id,
        content: "I also felt a little tired after lunch.",
        isRead: false,
      },
      {
        senderId: doctor1.id,
        receiverId: patient1.id,
        content: "Try a short walk after meals and keep your hydration up.",
        isRead: false,
      },
      {
        senderId: patient1.id,
        receiverId: doctor1.id,
        content: "Understood, I will log my next reading this evening.",
        isRead: false,
      },
    ],
  });

  // ── Sample Diet Recommendation for Patient 1 ─────────────────────
  await prisma.dietRecommendation.create({
    data: {
      patientId: patient1.id,
      recommendationText:
        "Focus on balanced meals with beans, greens, avocado, and controlled portions of whole grains.",
      foodsToEat: ["beans", "spinach", "avocado", "whole grains"],
      foodsToAvoid: [
        "sugary drinks",
        "fried snacks",
        "large white bread portions",
      ],
      basedOnRecordId: createdHealthRecords[createdHealthRecords.length - 1].id,
    },
  });

  console.log("✅ Seed complete!");
  console.log(
    `   Users    : ${doctor1.fullName}, ${patient1.fullName}, ${patient2.fullName}`,
  );
  console.log(`   Password : Test@1234  (all accounts)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
