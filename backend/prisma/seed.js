require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient, Role, DocumentType } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const demoPassword = "boon12345";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.attachment.deleteMany();
  await prisma.documentItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workerSupplierLink.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.supplierStoreProfile.deleteMany();
  await prisma.user.deleteMany();

  const owner = await prisma.user.create({
    data: {
      phone: "+212600000001",
      fullName: "Yassine Owner",
      passwordHash,
      defaultRole: Role.OWNER,
    },
  });

  const worker = await prisma.user.create({
    data: {
      phone: "+212600000002",
      fullName: "Rachid Worker",
      passwordHash,
      defaultRole: Role.WORKER,
    },
  });

  const supplierA = await prisma.user.create({
    data: {
      phone: "+212600000003",
      fullName: "Sanae Supplier",
      passwordHash,
      defaultRole: Role.SUPPLIER,
    },
  });

  const supplierB = await prisma.user.create({
    data: {
      phone: "+212600000004",
      fullName: "Karim Supplier",
      passwordHash,
      defaultRole: Role.SUPPLIER,
    },
  });

  const room = await prisma.room.create({
    data: {
      name: "Villa Casablanca - Bloc A",
      roomCode: "BOON01",
      ownerId: owner.id,
    },
  });

  await prisma.roomMember.createMany({
    data: [
      { roomId: room.id, userId: owner.id, role: Role.OWNER },
      { roomId: room.id, userId: worker.id, role: Role.WORKER },
      { roomId: room.id, userId: supplierA.id, role: Role.SUPPLIER },
      { roomId: room.id, userId: supplierB.id, role: Role.SUPPLIER },
    ],
  });

  await prisma.workerSupplierLink.createMany({
    data: [
      { roomId: room.id, workerId: worker.id, supplierId: supplierA.id },
      { roomId: room.id, workerId: worker.id, supplierId: supplierB.id },
    ],
  });

  const profileA = await prisma.supplierStoreProfile.create({
    data: {
      supplierId: supplierA.id,
      storeName: "Sanae Matériaux",
      phone: "+212611111111",
      address: "Sidi Maarouf, Casablanca",
      ice: "001234567000089",
      rc: "CASA-88912",
      footerNote: "Merci pour votre confiance - BOON",
    },
  });

  const profileB = await prisma.supplierStoreProfile.create({
    data: {
      supplierId: supplierB.id,
      storeName: "Karim Steel & Tools",
      phone: "+212622222222",
      address: "Bouskoura, Casablanca",
      ice: "009876543210001",
      rc: "CASA-90177",
      footerNote: "Paiement sous 30 jours",
    },
  });

  await prisma.document.create({
    data: {
      type: DocumentType.RECEIPT,
      roomId: room.id,
      workerId: worker.id,
      supplierId: supplierA.id,
      createdBySupplierId: supplierA.id,
      storeProfileId: profileA.id,
      quickAmount: 980,
      category: "Ciment",
      note: "35 sacs ciment CPJ 45",
      currency: "MAD",
      grandTotal: 980,
      isPersonal: false,
      immutable: true,
      attachments: {
        create: [
          {
            fileUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5",
            mimeType: "image/jpeg",
          },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      type: DocumentType.INVOICE,
      roomId: room.id,
      workerId: worker.id,
      supplierId: supplierB.id,
      createdBySupplierId: supplierB.id,
      storeProfileId: profileB.id,
      category: "Acier",
      note: "Livraison ferraillage dalle",
      currency: "MAD",
      grandTotal: 1780,
      isPersonal: false,
      immutable: true,
      items: {
        create: [
          {
            productName: "Fer 12mm",
            qty: 50,
            unit: "barres",
            unitPrice: 22,
            lineTotal: 1100,
            position: 0,
          },
          {
            productName: "Ligature",
            qty: 20,
            unit: "kg",
            unitPrice: 34,
            lineTotal: 680,
            position: 1,
          },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      type: DocumentType.QUOTE,
      supplierId: supplierA.id,
      createdBySupplierId: supplierA.id,
      storeProfileId: profileA.id,
      quickAmount: 3200,
      category: "Devis peinture",
      note: "Document personnel, hors chantier",
      currency: "MAD",
      grandTotal: 3200,
      isPersonal: true,
      immutable: true,
    },
  });

  console.log("BOON demo seed ready.");
  console.log("Room code:", room.roomCode);
  console.log("Demo password for all users:", demoPassword);
  console.log("Owner:", owner.phone);
  console.log("Worker:", worker.phone);
  console.log("Supplier A:", supplierA.phone);
  console.log("Supplier B:", supplierB.phone);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
