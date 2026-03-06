require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.documentItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.phoneVerificationCode.deleteMany();
  await prisma.roomJoinRequest.deleteMany();
  await prisma.workerSupplierLink.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.supplierStoreProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log("BOON database reset complete.");
  console.log("No demo users or demo documents were created.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
