require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient, Role, LinkStatus, UserStatus, RoomStatus } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function upsertUser(payload, passwordHash, now) {
  return prisma.user.upsert({
    where: { phone: payload.phone },
    update: {
      ...payload,
      passwordHash,
      phoneVerifiedAt: now,
      status: UserStatus.ACTIVE,
    },
    create: {
      ...payload,
      passwordHash,
      phoneVerifiedAt: now,
      status: UserStatus.ACTIVE,
    },
  });
}

async function main() {
  const password = "BoonTest@123";
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const owner = await upsertUser(
    {
      phone: "+212600000101",
      email: "owner.test@boon.local",
      fullName: "BOON Test Owner",
      defaultRole: Role.OWNER,
    },
    passwordHash,
    now,
  );

  const worker = await upsertUser(
    {
      phone: "+212600000102",
      email: "worker.test@boon.local",
      fullName: "BOON Test Worker",
      defaultRole: Role.WORKER,
    },
    passwordHash,
    now,
  );

  const supplier = await upsertUser(
    {
      phone: "+212600000103",
      email: "supplier.test@boon.local",
      fullName: "BOON Test Supplier",
      defaultRole: Role.SUPPLIER,
    },
    passwordHash,
    now,
  );

  const roomCode = "BOON-7K2Q";
  const room = await prisma.room.upsert({
    where: { roomCode },
    update: {
      name: "BOON Trial Room",
      ownerId: owner.id,
      status: RoomStatus.ACTIVE,
    },
    create: {
      name: "BOON Trial Room",
      roomCode,
      ownerId: owner.id,
      status: RoomStatus.ACTIVE,
    },
  });

  const memberships = [
    { userId: owner.id, role: Role.OWNER },
    { userId: worker.id, role: Role.WORKER },
    { userId: supplier.id, role: Role.SUPPLIER },
  ];

  for (const membership of memberships) {
    await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: membership.userId,
        },
      },
      update: {
        role: membership.role,
        lastSeenAt: now,
      },
      create: {
        roomId: room.id,
        userId: membership.userId,
        role: membership.role,
        lastSeenAt: now,
      },
    });
  }

  await prisma.workerSupplierLink.upsert({
    where: {
      roomId_workerId_supplierId: {
        roomId: room.id,
        workerId: worker.id,
        supplierId: supplier.id,
      },
    },
    update: {
      status: LinkStatus.ACTIVE,
    },
    create: {
      roomId: room.id,
      workerId: worker.id,
      supplierId: supplier.id,
      status: LinkStatus.ACTIVE,
    },
  });

  await prisma.supplierStoreProfile.upsert({
    where: { supplierId: supplier.id },
    update: {
      storeName: "BOON Supplier Store",
      phone: supplier.phone,
      address: "Casablanca, Morocco",
      footerNote: "Merci / Livraison sur site / Paiement a la reception",
    },
    create: {
      supplierId: supplier.id,
      storeName: "BOON Supplier Store",
      phone: supplier.phone,
      address: "Casablanca, Morocco",
      footerNote: "Merci / Livraison sur site / Paiement a la reception",
    },
  });

  console.log(
    JSON.stringify(
      {
        password,
        roomCode,
        owner: { phone: owner.phone, email: owner.email },
        worker: { phone: worker.phone, email: worker.email },
        supplier: { phone: supplier.phone, email: supplier.email },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
