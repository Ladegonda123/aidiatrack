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

  const passwordHash = await bcrypt.hash("password123", 10);

  // ── Create 2 Doctors ──────────────────────────────────────────────
  const doctor1 = await prisma.user.create({
    data: {
      fullName: "Dr. Amina Uwase",
      email: "amina.uwase@kigalihealth.rw",
      passwordHash,
      role: Role.DOCTOR,
      phone: "+250788000001",
      gender: "Female",
    },
  });

  const doctor2 = await prisma.user.create({
    data: {
      fullName: "Dr. Jean-Pierre Nkurunziza",
      email: "jeanpierre@kigalihealth.rw",
      passwordHash,
      role: Role.DOCTOR,
      phone: "+250788000002",
      gender: "Male",
    },
  });

  // ── Create 3 Patients (assigned to doctors) ───────────────────────
  const patient1 = await prisma.user.create({
    data: {
      fullName: "Marie Mukamana",
      email: "marie@example.com",
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
      email: "emmanuel@example.com",
      passwordHash,
      role: Role.PATIENT,
      phone: "+250788100002",
      gender: "Male",
      dateOfBirth: new Date("1965-07-22"),
      doctorId: doctor1.id,
    },
  });

  const patient3 = await prisma.user.create({
    data: {
      fullName: "Claudine Uwimana",
      email: "claudine@example.com",
      passwordHash,
      role: Role.PATIENT,
      phone: "+250788100003",
      gender: "Female",
      dateOfBirth: new Date("1990-11-08"),
      doctorId: doctor2.id,
    },
  });

  // ── Health Records for Patient 1 (last 7 days) ────────────────────
  const glucoseReadings = [145, 162, 138, 175, 120, 190, 155];
  for (let i = 0; i < glucoseReadings.length; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    await prisma.healthRecord.create({
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
  }

  // ── Medication for Patient 1 ──────────────────────────────────────
  await prisma.medication.create({
    data: {
      patientId: patient1.id,
      drugName: "Metformin",
      dosage: "500mg",
      frequency: "twice daily",
      reminderTimes: ["08:00", "20:00"],
      isActive: true,
      prescribedBy: doctor1.id,
    },
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
  await prisma.message.create({
    data: {
      senderId: patient1.id,
      receiverId: doctor1.id,
      content:
        "Good morning doctor, my sugar was 175 this morning after breakfast.",
      isRead: true,
    },
  });

  await prisma.message.create({
    data: {
      senderId: doctor1.id,
      receiverId: patient1.id,
      content:
        "Thank you Marie. Please reduce your carbohydrate intake at breakfast. Try eggs with vegetables instead.",
      isRead: false,
    },
  });

  console.log("✅ Seed complete!");
  console.log(`   Doctors  : ${doctor1.fullName}, ${doctor2.fullName}`);
  console.log(
    `   Patients : ${patient1.fullName}, ${patient2.fullName}, ${patient3.fullName}`,
  );
  console.log(`   Password : password123  (all accounts)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
