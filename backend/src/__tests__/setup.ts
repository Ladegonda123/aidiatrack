/// <reference types="jest" />
import prisma from "../config/database";

beforeAll(async () => {
  try {
    await prisma.$connect();
    console.log("\n✓ Test database connected");
  } catch (error) {
    console.error("Failed to connect to test database:", error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Clean up test data created during tests
    // Delete in reverse dependency order
    await prisma.notification.deleteMany({
      where: { user: { email: { contains: "test_jest" } } },
    });
    await prisma.message.deleteMany({
      where: {
        OR: [
          { sender: { email: { contains: "test_jest" } } },
          { receiver: { email: { contains: "test_jest" } } },
        ],
      },
    });
    await prisma.medication.deleteMany({
      where: { patient: { email: { contains: "test_jest" } } },
    });
    await prisma.dietRecommendation.deleteMany({
      where: { patient: { email: { contains: "test_jest" } } },
    });
    await prisma.prediction.deleteMany({
      where: { patient: { email: { contains: "test_jest" } } },
    });
    await prisma.healthRecord.deleteMany({
      where: { patient: { email: { contains: "test_jest" } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test_jest" } },
    });
    console.log("✓ Test data cleaned up");
  } catch (error) {
    console.error("Error during test cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
});
