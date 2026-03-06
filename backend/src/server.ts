import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "node:crypto";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import {
  Prisma,
  PrismaClient,
  Role,
  DocumentType,
  RoomStatus,
  LinkStatus,
} from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";

dotenv.config();

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET =
  process.env.JWT_SECRET?.trim() || crypto.randomBytes(48).toString("hex");
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL;
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean)
  : null;
const PASSWORD_MIN_LENGTH = 10;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 40;
const AUTH_BLOCK_MS = 15 * 60 * 1000;

if (!process.env.JWT_SECRET?.trim()) {
  // eslint-disable-next-line no-console
  console.warn("JWT_SECRET not set. Using ephemeral key for this process.");
}

app.use(
  cors({
    origin: CORS_ORIGINS?.length ? CORS_ORIGINS : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  next();
});

type JwtPayload = { userId: string; role: Role };
type AuthenticatedRequest = express.Request & { user?: JwtPayload };

type RegisterBody = {
  phone?: string;
  password?: string;
  fullName?: string;
  role?: Role;
};

type LoginBody = {
  phone?: string;
  password?: string;
};

type UpdateProfileBody = {
  fullName?: string;
  phone?: string;
};

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};

type CreateDocumentBody = {
  type?: DocumentType;
  isPersonal?: boolean;
  roomId?: string;
  workerId?: string;
  quickAmount?: number;
  category?: string;
  note?: string;
  currency?: string;
  photoUrl?: string;
  attachments?: { fileUrl: string; mimeType?: string }[];
  items?: {
    productName: string;
    qty: number;
    unit?: string;
    unitPrice: number;
  }[];
};

type AuthLimiterEntry = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

type AnalyticsDoc = {
  id: string;
  type: DocumentType;
  roomId: string | null;
  supplierId: string;
  category: string | null;
  currency: string;
  grandTotal: number;
  isPersonal: boolean;
  createdAt: Date;
  supplier: {
    id: string;
    fullName: string;
  };
};

type RoomFilter = "all" | "active" | "closed";

type RoomListItem = {
  id: string;
  name: string;
  roomCode: string;
  status: RoomStatus;
  role: Role;
  roleInRoom: Role;
  lastMessagePreview: string | null;
  lastMessageTime: string | null;
  totalForOwner: number | null;
  totalForWorkerScope: number | null;
  totalForSupplier: number | null;
  unreadCount: number;
};

type RoomStreamSubscriber = {
  response: express.Response;
  user: JwtPayload;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const authLimiterStore = new Map<string, AuthLimiterEntry>();
const roomStreams = new Map<string, Set<RoomStreamSubscriber>>();

function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getOptionalNonEmptyText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toUpperText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().toUpperCase();
}

function isRoomStatus(value: unknown): value is RoomStatus {
  return value === RoomStatus.ACTIVE || value === RoomStatus.CLOSED;
}

function parseRoomFilter(value: unknown): RoomFilter {
  const normalized = getOptionalNonEmptyText(value)?.toLowerCase();
  if (normalized === "active" || normalized === "closed") return normalized;
  return "all";
}

function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol";
  }
  return null;
}

function authRateLimiter(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const key = getOptionalNonEmptyText(req.ip) ?? "unknown";
  const now = Date.now();
  const entry = authLimiterStore.get(key);

  if (!entry) {
    authLimiterStore.set(key, {
      count: 1,
      windowStart: now,
      blockedUntil: 0,
    });
    return next();
  }

  if (entry.blockedUntil > now) {
    const waitSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return res.status(429).json({
      error: `Too many attempts. Try again in ${waitSeconds}s`,
    });
  }

  if (now - entry.windowStart > AUTH_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    entry.blockedUntil = 0;
    authLimiterStore.set(key, entry);
    return next();
  }

  entry.count += 1;
  if (entry.count > AUTH_MAX_ATTEMPTS) {
    entry.blockedUntil = now + AUTH_BLOCK_MS;
    authLimiterStore.set(key, entry);
    return res.status(429).json({
      error: "Too many auth attempts. Access temporarily blocked.",
    });
  }

  authLimiterStore.set(key, entry);
  return next();
}

function registerRoomStream(roomId: string, subscriber: RoomStreamSubscriber) {
  const existing = roomStreams.get(roomId);
  if (existing) {
    existing.add(subscriber);
    return;
  }
  roomStreams.set(roomId, new Set([subscriber]));
}

function unregisterRoomStream(roomId: string, response: express.Response) {
  const existing = roomStreams.get(roomId);
  if (!existing) return;
  for (const subscriber of existing) {
    if (subscriber.response === response) {
      existing.delete(subscriber);
    }
  }
  if (existing.size === 0) {
    roomStreams.delete(roomId);
  }
}

async function emitRoomEvent(roomId: string, eventName: string, payload: unknown) {
  const listeners = roomStreams.get(roomId);
  if (!listeners || listeners.size === 0) return;

  const serialized = JSON.stringify(payload);
  let allowedWorkers = new Set<string>();
  let supplierIdForDoc: string | null = null;

  if (
    eventName === "document.created" &&
    typeof payload === "object" &&
    payload !== null &&
    "supplierId" in payload
  ) {
    supplierIdForDoc = getOptionalNonEmptyText(
      (payload as Record<string, unknown>).supplierId,
    ) ?? null;

    if (supplierIdForDoc) {
      const workerLinks = await prisma.workerSupplierLink.findMany({
        where: {
          roomId,
          supplierId: supplierIdForDoc,
          status: LinkStatus.ACTIVE,
        },
        select: { workerId: true },
      });
      allowedWorkers = new Set(workerLinks.map((entry) => entry.workerId));
    }
  }

  for (const subscriber of listeners) {
    if (eventName === "document.created" && supplierIdForDoc) {
      const isAllowed =
        subscriber.user.role === Role.OWNER ||
        (subscriber.user.role === Role.WORKER &&
          allowedWorkers.has(subscriber.user.userId)) ||
        (subscriber.user.role === Role.SUPPLIER &&
          subscriber.user.userId === supplierIdForDoc);
      if (!isAllowed) continue;
    }

    try {
      subscriber.response.write(`event: ${eventName}\n`);
      subscriber.response.write(`data: ${serialized}\n\n`);
    } catch {
      unregisterRoomStream(roomId, subscriber.response);
    }
  }
}

function isRole(value: unknown): value is Role {
  return value === Role.OWNER || value === Role.WORKER || value === Role.SUPPLIER;
}

function isDocumentType(value: unknown): value is DocumentType {
  return (
    value === DocumentType.RECEIPT ||
    value === DocumentType.INVOICE ||
    value === DocumentType.QUOTE
  );
}

async function getCurrentUser(req: AuthenticatedRequest) {
  if (!req.user) return null;
  return prisma.user.findUnique({ where: { id: req.user.userId } });
}

async function getMembership(roomId: string, userId: string) {
  return prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });
}

async function getRoomOrNull(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      status: true,
      ownerId: true,
    },
  });
}

async function canAccessDocument(current: JwtPayload, doc: {
  isPersonal: boolean;
  roomId: string | null;
  supplierId: string;
}) {
  if (doc.isPersonal) {
    return doc.supplierId === current.userId;
  }

  if (!doc.roomId) return false;
  const membership = await getMembership(doc.roomId, current.userId);
  if (!membership) return false;

  if (membership.role === Role.OWNER) return true;
  if (membership.role === Role.SUPPLIER) {
    return doc.supplierId === current.userId;
  }

  if (membership.role === Role.WORKER) {
    const link = await prisma.workerSupplierLink.findFirst({
      where: {
        roomId: doc.roomId,
        workerId: current.userId,
        supplierId: doc.supplierId,
        status: LinkStatus.ACTIVE,
      },
    });
    return Boolean(link);
  }

  return false;
}

async function getAccessibleDocumentsForAnalytics(current: JwtPayload) {
  const select = {
    id: true,
    type: true,
    roomId: true,
    supplierId: true,
    category: true,
    currency: true,
    grandTotal: true,
    isPersonal: true,
    createdAt: true,
    supplier: {
      select: {
        id: true,
        fullName: true,
      },
    },
  } satisfies Prisma.DocumentSelect;

  if (current.role === Role.SUPPLIER) {
    return prisma.document.findMany({
      where: { supplierId: current.userId },
      select,
      orderBy: { createdAt: "desc" },
    }) as Promise<AnalyticsDoc[]>;
  }

  if (current.role === Role.OWNER) {
    const ownedMemberships = await prisma.roomMember.findMany({
      where: {
        userId: current.userId,
        role: Role.OWNER,
      },
      select: { roomId: true },
    });

    const roomIds = ownedMemberships.map((entry) => entry.roomId);
    if (roomIds.length === 0) return [] as AnalyticsDoc[];

    return prisma.document.findMany({
      where: {
        roomId: { in: roomIds },
        isPersonal: false,
      },
      select,
      orderBy: { createdAt: "desc" },
    }) as Promise<AnalyticsDoc[]>;
  }

  const workerLinks = await prisma.workerSupplierLink.findMany({
    where: {
      workerId: current.userId,
      status: LinkStatus.ACTIVE,
    },
    select: {
      roomId: true,
      supplierId: true,
    },
  });

  if (workerLinks.length === 0) return [] as AnalyticsDoc[];

  const roomIds = [...new Set(workerLinks.map((entry) => entry.roomId))];
  const linkSet = new Set(
    workerLinks.map((entry) => `${entry.roomId}:${entry.supplierId}`),
  );

  const rawDocs = (await prisma.document.findMany({
    where: {
      roomId: { in: roomIds },
      isPersonal: false,
    },
    select,
    orderBy: { createdAt: "desc" },
  })) as AnalyticsDoc[];

  return rawDocs.filter((doc) => {
    if (!doc.roomId) return false;
    return linkSet.has(`${doc.roomId}:${doc.supplierId}`);
  });
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const mondayOffset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - mondayOffset);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const header = req.headers.authorization;
  const allowQueryToken =
    /^\/api\/documents\/[^/]+\/pdf$/.test(req.path) ||
    /^\/api\/rooms\/[^/]+\/stream$/.test(req.path);
  const queryToken = allowQueryToken
    ? getOptionalNonEmptyText((req.query as Record<string, unknown>).token)
    : undefined;
  const tokenFromHeader = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;
  const token = tokenFromHeader ?? queryToken;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles: Role[]) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const payload = (req as AuthenticatedRequest).user;
    if (!payload || !roles.includes(payload.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

function generateRoomCode(roomName?: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const compact = (roomName ?? "ROOM")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 5)
    .padEnd(5, "X");
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    suffix += alphabet[idx];
  }
  return `${compact}-${suffix}`;
}

function buildActivityPreview(input: {
  supplierName: string;
  type: DocumentType;
  category: string | null;
  amount: number;
  currency: string;
}) {
  const title = getOptionalNonEmptyText(input.category) ?? input.type;
  return `${input.supplierName} - ${title} - ${input.amount.toFixed(2)} ${input.currency}`;
}

async function refreshRoomCaches(roomId: string) {
  const [aggregate, latestDoc, supplierGroups, links] = await Promise.all([
    prisma.document.aggregate({
      where: {
        roomId,
        isPersonal: false,
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.document.findFirst({
      where: {
        roomId,
        isPersonal: false,
      },
      orderBy: { createdAt: "desc" },
      select: {
        supplier: { select: { fullName: true } },
        type: true,
        category: true,
        grandTotal: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.document.groupBy({
      by: ["supplierId"],
      where: {
        roomId,
        isPersonal: false,
      },
      _sum: { grandTotal: true },
      _count: { supplierId: true },
      _max: { createdAt: true },
    }),
    prisma.workerSupplierLink.findMany({
      where: { roomId },
      select: {
        id: true,
        workerId: true,
        supplierId: true,
        status: true,
      },
    }),
  ]);

  const totalOwner = Number(aggregate._sum.grandTotal ?? 0);
  const docsCount = Number(aggregate._count.id ?? 0);

  await prisma.room.update({
    where: { id: roomId },
    data: {
      cachedTotalOwner: totalOwner,
      cachedDocsCount: docsCount,
      lastActivityAt: latestDoc?.createdAt ?? null,
      lastActivityPreview: latestDoc
        ? buildActivityPreview({
            supplierName: latestDoc.supplier.fullName,
            type: latestDoc.type,
            category: latestDoc.category,
            amount: Number(latestDoc.grandTotal),
            currency: latestDoc.currency,
          })
        : null,
    },
  });

  const supplierAggregateMap = new Map(
    supplierGroups.map((group) => [
      group.supplierId,
      {
        total: Number(group._sum.grandTotal ?? 0),
        docsCount: Number(group._count.supplierId ?? 0),
        lastActivityAt: group._max.createdAt ?? null,
      },
    ]),
  );

  const supplierIds = [...supplierAggregateMap.keys()];

  if (supplierIds.length > 0) {
    await Promise.all(
      supplierIds.map((supplierId) => {
        const entry = supplierAggregateMap.get(supplierId)!;
        return prisma.roomSupplierScopeCache.upsert({
          where: {
            roomId_supplierId: {
              roomId,
              supplierId,
            },
          },
          create: {
            roomId,
            supplierId,
            total: entry.total,
            docsCount: entry.docsCount,
          },
          update: {
            total: entry.total,
            docsCount: entry.docsCount,
          },
        });
      }),
    );

    await prisma.roomSupplierScopeCache.deleteMany({
      where: {
        roomId,
        supplierId: { notIn: supplierIds },
      },
    });
  } else {
    await prisma.roomSupplierScopeCache.deleteMany({ where: { roomId } });
  }

  const linksByWorker = new Map<string, Set<string>>();
  for (const link of links) {
    if (link.status !== LinkStatus.ACTIVE) continue;
    const existing = linksByWorker.get(link.workerId) ?? new Set<string>();
    existing.add(link.supplierId);
    linksByWorker.set(link.workerId, existing);
  }

  const workerIds = [...linksByWorker.keys()];
  if (workerIds.length > 0) {
    await Promise.all(
      workerIds.map((workerId) => {
        const supplierSet = linksByWorker.get(workerId)!;
        let total = 0;
        let docs = 0;
        let lastActivityAt: Date | null = null;

        for (const supplierId of supplierSet) {
          const aggregateEntry = supplierAggregateMap.get(supplierId);
          if (!aggregateEntry) continue;
          total += aggregateEntry.total;
          docs += aggregateEntry.docsCount;
          if (
            aggregateEntry.lastActivityAt &&
            (!lastActivityAt || aggregateEntry.lastActivityAt > lastActivityAt)
          ) {
            lastActivityAt = aggregateEntry.lastActivityAt;
          }
        }

        return prisma.roomWorkerScopeCache.upsert({
          where: {
            roomId_workerId: {
              roomId,
              workerId,
            },
          },
          create: {
            roomId,
            workerId,
            total,
            docsCount: docs,
          },
          update: {
            total,
            docsCount: docs,
          },
        });
      }),
    );

    await prisma.roomWorkerScopeCache.deleteMany({
      where: {
        roomId,
        workerId: { notIn: workerIds },
      },
    });
  } else {
    await prisma.roomWorkerScopeCache.deleteMany({ where: { roomId } });
  }

  await Promise.all(
    links.map((link) => {
      const supplierCache = supplierAggregateMap.get(link.supplierId);
      return prisma.workerSupplierLink.update({
        where: { id: link.id },
        data: {
          cachedTotal: Number(supplierCache?.total ?? 0),
          cachedDocsCount: Number(supplierCache?.docsCount ?? 0),
          lastActivityAt: supplierCache?.lastActivityAt ?? null,
        },
      });
    }),
  );
}

async function refreshAllRoomCaches() {
  const rooms = await prisma.room.findMany({
    select: { id: true },
  });

  for (const room of rooms) {
    // Recompute room totals at boot so list responses are always fast.
    // eslint-disable-next-line no-await-in-loop
    await refreshRoomCaches(room.id);
  }
}

async function buildRoomsListForUser(
  userId: string,
  params?: { search?: string | undefined; filter?: RoomFilter },
): Promise<RoomListItem[]> {
  const search = getOptionalNonEmptyText(params?.search);
  const filter = params?.filter ?? "all";

  const memberships = await prisma.roomMember.findMany({
    where: {
      userId,
      room: {
        ...(filter === "active" ? { status: RoomStatus.ACTIVE } : {}),
        ...(filter === "closed" ? { status: RoomStatus.CLOSED } : {}),
        ...(search
          ? {
              name: {
                contains: search,
              },
            }
          : {}),
      },
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          roomCode: true,
          status: true,
          lastActivityPreview: true,
          lastActivityAt: true,
          cachedTotalOwner: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (memberships.length === 0) return [];

  const roomIds = memberships.map((entry) => entry.room.id);

  const [workerTotals, supplierTotals] = await Promise.all([
    prisma.roomWorkerScopeCache.findMany({
      where: {
        workerId: userId,
        roomId: { in: roomIds },
      },
      select: {
        roomId: true,
        total: true,
      },
    }),
    prisma.roomSupplierScopeCache.findMany({
      where: {
        supplierId: userId,
        roomId: { in: roomIds },
      },
      select: {
        roomId: true,
        total: true,
      },
    }),
  ]);

  const workerMap = new Map(workerTotals.map((entry) => [entry.roomId, entry.total]));
  const supplierMap = new Map(
    supplierTotals.map((entry) => [entry.roomId, entry.total]),
  );

  const workerLinks = await prisma.workerSupplierLink.findMany({
    where: {
      workerId: userId,
      roomId: { in: roomIds },
      status: LinkStatus.ACTIVE,
    },
    select: {
      roomId: true,
      supplierId: true,
    },
  });

  const workerSupplierMap = new Map<string, string[]>();
  for (const link of workerLinks) {
    const existing = workerSupplierMap.get(link.roomId) ?? [];
    if (!existing.includes(link.supplierId)) existing.push(link.supplierId);
    workerSupplierMap.set(link.roomId, existing);
  }

  const unreadCounts = await Promise.all(
    memberships.map(async (member) => {
      const lastSeen = member.lastSeenAt ?? undefined;
      const createdAtFilter = lastSeen ? { gt: lastSeen } : undefined;

      if (member.role === Role.OWNER) {
        const count = await prisma.document.count({
          where: {
            roomId: member.room.id,
            isPersonal: false,
            ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
          },
        });
        return { roomId: member.room.id, count };
      }

      if (member.role === Role.SUPPLIER) {
        const count = await prisma.document.count({
          where: {
            roomId: member.room.id,
            supplierId: userId,
            isPersonal: false,
            ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
          },
        });
        return { roomId: member.room.id, count };
      }

      const supplierIds = workerSupplierMap.get(member.room.id) ?? [];
      if (supplierIds.length === 0) {
        return { roomId: member.room.id, count: 0 };
      }
      const count = await prisma.document.count({
        where: {
          roomId: member.room.id,
          supplierId: { in: supplierIds },
          isPersonal: false,
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
      });
      return { roomId: member.room.id, count };
    }),
  );
  const unreadMap = new Map(unreadCounts.map((entry) => [entry.roomId, entry.count]));

  const rows = memberships.map((member) => {
    const item: RoomListItem = {
      id: member.room.id,
      name: member.room.name,
      roomCode: member.room.roomCode,
      status: member.room.status,
      role: member.role,
      roleInRoom: member.role,
      lastMessagePreview: member.room.lastActivityPreview,
      lastMessageTime: member.room.lastActivityAt
        ? member.room.lastActivityAt.toISOString()
        : null,
      totalForOwner: null,
      totalForWorkerScope: null,
      totalForSupplier: null,
      unreadCount: Number(unreadMap.get(member.room.id) ?? 0),
    };

    if (member.role === Role.OWNER) {
      item.totalForOwner = Number(member.room.cachedTotalOwner ?? 0);
    } else if (member.role === Role.WORKER) {
      item.totalForWorkerScope = Number(workerMap.get(member.room.id) ?? 0);
    } else {
      item.totalForSupplier = Number(supplierMap.get(member.room.id) ?? 0);
    }

    return item;
  });

  return rows.sort((a, b) => {
    const at = a.lastMessageTime ? Date.parse(a.lastMessageTime) : 0;
    const bt = b.lastMessageTime ? Date.parse(b.lastMessageTime) : 0;
    return bt - at;
  });
}

const documentInclude = {
  supplier: {
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
  },
  storeProfile: true,
  items: {
    orderBy: {
      position: "asc",
    },
  },
  attachments: true,
} satisfies Prisma.DocumentInclude;

type DocumentWithInclude = Prisma.DocumentGetPayload<{
  include: typeof documentInclude;
}>;

async function createDocumentForSupplier(
  current: JwtPayload,
  body: CreateDocumentBody,
): Promise<DocumentWithInclude> {
  if (!isDocumentType(body.type)) {
    throw new ApiError(400, "Invalid document type");
  }

  const roomId = getOptionalNonEmptyText(body.roomId);
  const workerId = getOptionalNonEmptyText(body.workerId);
  const isPersonal = body.isPersonal ?? !roomId;

  if (!isPersonal) {
    if (!roomId || !workerId) {
      throw new ApiError(400, "roomId and workerId are required for room documents");
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room) {
      throw new ApiError(404, "Room not found");
    }
    if (room.status !== RoomStatus.ACTIVE) {
      throw new ApiError(403, "Room is closed");
    }

    const link = await prisma.workerSupplierLink.findFirst({
      where: {
        roomId,
        workerId,
        supplierId: current.userId,
        status: LinkStatus.ACTIVE,
      },
    });

    if (!link) {
      throw new ApiError(
        403,
        "Supplier is not linked to this worker in the room",
      );
    }
  }

  const profile = await prisma.supplierStoreProfile.findUnique({
    where: { supplierId: current.userId },
  });
  if (!profile) {
    throw new ApiError(
      400,
      "Supplier profile must be configured before creating documents",
    );
  }

  const parsedItems = Array.isArray(body.items)
    ? body.items
        .filter(
          (item) =>
            Boolean(getOptionalNonEmptyText(item.productName)) &&
            Number.isFinite(item.qty) &&
            Number.isFinite(item.unitPrice),
        )
        .map((item) => ({
          productName: getOptionalNonEmptyText(item.productName)!,
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice),
          unit: getNullableText(item.unit),
        }))
    : [];

  let grandTotal = 0;
  if (parsedItems.length > 0) {
    grandTotal = parsedItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  } else if (typeof body.quickAmount === "number" && Number.isFinite(body.quickAmount)) {
    grandTotal = Number(body.quickAmount);
  } else {
    throw new ApiError(400, "Provide either quickAmount or at least one item");
  }

  const attachmentRows: { fileUrl: string; mimeType: string }[] = [];
  const photoUrl = getOptionalNonEmptyText(body.photoUrl);
  if (photoUrl) {
    attachmentRows.push({
      fileUrl: photoUrl,
      mimeType: "image/jpeg",
    });
  }

  if (Array.isArray(body.attachments)) {
    for (const attachment of body.attachments) {
      const fileUrl = getOptionalNonEmptyText(attachment.fileUrl);
      if (!fileUrl) continue;
      attachmentRows.push({
        fileUrl,
        mimeType:
          getOptionalNonEmptyText(attachment.mimeType) ?? "application/octet-stream",
      });
    }
  }

  const createData: Prisma.DocumentUncheckedCreateInput = {
    type: body.type,
    roomId: isPersonal ? null : roomId!,
    workerId: isPersonal ? null : workerId!,
    supplierId: current.userId,
    createdBySupplierId: current.userId,
    storeProfileId: profile.id,
    quickAmount:
      typeof body.quickAmount === "number" && Number.isFinite(body.quickAmount)
        ? Number(body.quickAmount)
        : null,
    category: getNullableText(body.category),
    note: getNullableText(body.note),
    currency: getOptionalNonEmptyText(body.currency)?.toUpperCase() ?? "MAD",
    grandTotal,
    isPersonal,
    immutable: true,
    ...(parsedItems.length > 0
      ? {
          items: {
            create: parsedItems.map((item, position) => ({
              productName: item.productName,
              qty: item.qty,
              unit: item.unit,
              unitPrice: item.unitPrice,
              lineTotal: item.qty * item.unitPrice,
              position,
            })),
          },
        }
      : {}),
    ...(attachmentRows.length > 0
      ? {
          attachments: {
            create: attachmentRows,
          },
        }
      : {}),
  };

  const doc = await prisma.document.create({
    data: createData,
    include: documentInclude,
  });

  if (doc.roomId) {
    await refreshRoomCaches(doc.roomId);
    await emitRoomEvent(doc.roomId, "document.created", doc);
  }

  return doc;
}

// Auth
app.post("/api/auth/register", authRateLimiter, async (req, res) => {
  const body = req.body as RegisterBody;
  const phone = getOptionalNonEmptyText(body.phone);
  const password = getOptionalNonEmptyText(body.password);
  const fullName = getOptionalNonEmptyText(body.fullName);
  const role = body.role;

  if (!phone || !password || !fullName || !isRole(role)) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  const passwordError = passwordPolicyError(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      fullName,
      defaultRole: role,
    },
  });

  const token = signToken({ userId: user.id, role: user.defaultRole });
  return res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.defaultRole,
    },
  });
});

app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  const body = req.body as LoginBody;
  const phone = getOptionalNonEmptyText(body.phone);
  const password = getOptionalNonEmptyText(body.password);
  if (!phone || !password) {
    return res.status(400).json({ error: "Missing phone or password" });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id, role: user.defaultRole });
  return res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.defaultRole,
    },
  });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const user = await getCurrentUser(req as AuthenticatedRequest);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    role: user.defaultRole,
  });
});

app.put("/api/me/profile", authMiddleware, async (req, res) => {
  const current = await getCurrentUser(req as AuthenticatedRequest);
  if (!current) return res.status(404).json({ error: "User not found" });

  const body = req.body as UpdateProfileBody;
  const nextFullName = getOptionalNonEmptyText(body.fullName);
  const nextPhone = getOptionalNonEmptyText(body.phone);

  if (!nextFullName || !nextPhone) {
    return res.status(400).json({ error: "fullName and phone are required" });
  }

  if (nextPhone !== current.phone) {
    const exists = await prisma.user.findUnique({ where: { phone: nextPhone } });
    if (exists && exists.id !== current.id) {
      return res.status(409).json({ error: "Phone already in use" });
    }
  }

  const updated = await prisma.user.update({
    where: { id: current.id },
    data: {
      fullName: nextFullName,
      phone: nextPhone,
    },
  });

  return res.json({
    id: updated.id,
    phone: updated.phone,
    fullName: updated.fullName,
    role: updated.defaultRole,
  });
});

app.put("/api/me/password", authMiddleware, async (req, res) => {
  const current = await getCurrentUser(req as AuthenticatedRequest);
  if (!current) return res.status(404).json({ error: "User not found" });

  const body = req.body as ChangePasswordBody;
  const currentPassword = getOptionalNonEmptyText(body.currentPassword);
  const newPassword = getOptionalNonEmptyText(body.newPassword);

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required" });
  }

  const matches = await bcrypt.compare(currentPassword, current.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const policyError = passwordPolicyError(newPassword);
  if (policyError) {
    return res.status(400).json({ error: policyError });
  }

  const nextHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: current.id },
    data: { passwordHash: nextHash },
  });

  return res.status(204).send();
});

app.get(
  "/api/users/suppliers",
  authMiddleware,
  requireRole(Role.OWNER, Role.WORKER),
  async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const query = getOptionalNonEmptyText(
    (req.query as Record<string, unknown>).q,
  );

  const where: Prisma.UserWhereInput = {
    defaultRole: Role.SUPPLIER,
    ...(query
      ? {
          OR: [
            {
              fullName: { contains: query },
            },
            {
              phone: { contains: query },
            },
          ],
        }
      : {}),
  };

  const suppliers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
    take: 25,
    orderBy: { createdAt: "desc" },
  });

  return res.json(suppliers);
});

// Rooms
app.post(
  "/api/rooms",
  authMiddleware,
  requireRole(Role.OWNER),
  async (req, res) => {
    const current = await getCurrentUser(req as AuthenticatedRequest);
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const name = getOptionalNonEmptyText((req.body as { name?: string }).name);
    if (!name) {
      return res.status(400).json({ error: "Missing room name" });
    }

    let roomCode = "";
    let exists = true;
    while (exists) {
      roomCode = generateRoomCode(name);
      const found = await prisma.room.findUnique({ where: { roomCode } });
      exists = Boolean(found);
    }

    const room = await prisma.room.create({
      data: {
        name,
        roomCode,
        ownerId: current.id,
        members: {
          create: {
            userId: current.id,
            role: Role.OWNER,
            lastSeenAt: new Date(),
          },
        },
      },
    });

    await refreshRoomCaches(room.id);

    return res.json(room);
  },
);

app.get("/api/rooms", authMiddleware, async (req, res) => {
  const payload = (req as AuthenticatedRequest).user;
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const query = req.query as Record<string, unknown>;
  const search = getOptionalNonEmptyText(query.search);
  const filter = parseRoomFilter(query.filter);

  const listItems = await buildRoomsListForUser(payload.userId, { search, filter });
  return res.json(listItems);
});

app.get("/api/rooms/:roomId", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  const membership = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: current.userId,
      },
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          roomCode: true,
          status: true,
          lastActivityPreview: true,
          lastActivityAt: true,
          cachedTotalOwner: true,
          cachedDocsCount: true,
          ownerId: true,
        },
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  const [membersCount, workerScope, supplierScope] = await Promise.all([
    prisma.roomMember.count({ where: { roomId } }),
    prisma.roomWorkerScopeCache.findUnique({
      where: {
        roomId_workerId: {
          roomId,
          workerId: current.userId,
        },
      },
      select: { total: true, docsCount: true },
    }),
    prisma.roomSupplierScopeCache.findUnique({
      where: {
        roomId_supplierId: {
          roomId,
          supplierId: current.userId,
        },
      },
      select: { total: true, docsCount: true },
    }),
  ]);

  return res.json({
    id: membership.room.id,
    name: membership.room.name,
    roomCode: membership.room.roomCode,
    status: membership.room.status,
    roleInRoom: membership.role,
    ownerId: membership.room.ownerId,
    lastMessagePreview: membership.room.lastActivityPreview,
    lastMessageTime: membership.room.lastActivityAt?.toISOString() ?? null,
    membersCount,
    cachedDocsCount: membership.room.cachedDocsCount,
    totals: {
      owner: Number(membership.room.cachedTotalOwner ?? 0),
      workerScope: Number(workerScope?.total ?? 0),
      supplierScope: Number(supplierScope?.total ?? 0),
    },
    docsCountByScope: {
      workerScope: Number(workerScope?.docsCount ?? 0),
      supplierScope: Number(supplierScope?.docsCount ?? 0),
    },
  });
});

app.get("/api/rooms/:roomId/members", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  const membership = await getMembership(roomId, current.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this room" });
  }
  if (membership.role === Role.SUPPLIER) {
    return res.status(403).json({ error: "Suppliers cannot list all room members in MVP" });
  }

  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          defaultRole: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json(members);
});

app.post("/api/rooms/:roomId/read", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  const membership = await getMembership(roomId, current.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  await prisma.roomMember.update({
    where: {
      roomId_userId: {
        roomId,
        userId: current.userId,
      },
    },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return res.status(204).send();
});

app.post(
  "/api/rooms/join",
  authMiddleware,
  requireRole(Role.WORKER),
  async (req, res) => {
    const current = await getCurrentUser(req as AuthenticatedRequest);
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomCode = getOptionalNonEmptyText(
      (req.body as { roomCode?: string }).roomCode,
    )?.toUpperCase();

    if (!roomCode) return res.status(400).json({ error: "Missing room code" });

    const room = await prisma.room.findUnique({ where: { roomCode } });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== RoomStatus.ACTIVE) {
      return res.status(403).json({ error: "Room is closed" });
    }

    const member = await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: current.id,
        },
      },
      create: {
        roomId: room.id,
        userId: current.id,
        role: Role.WORKER,
        lastSeenAt: new Date(),
      },
      update: {},
    });

    return res.json({ roomId: room.id, role: member.role });
  },
);

app.put(
  "/api/rooms/:roomId/status",
  authMiddleware,
  requireRole(Role.OWNER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
    if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

    const membership = await getMembership(roomId, current.userId);
    if (!membership || membership.role !== Role.OWNER) {
      return res.status(403).json({ error: "Only room owner can update status" });
    }

    const nextStatusRaw = toUpperText((req.body as { status?: string }).status);
    if (!isRoomStatus(nextStatusRaw)) {
      return res.status(400).json({ error: "Invalid room status" });
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: { status: nextStatusRaw },
      select: {
        id: true,
        status: true,
        name: true,
        roomCode: true,
      },
    });

    return res.json(room);
  },
);

// Worker-Supplier links
app.post(
  "/api/rooms/:roomId/workers/:workerId/link-supplier",
  authMiddleware,
  requireRole(Role.WORKER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
    const workerId = getSingleParam((req.params as Record<string, string | string[] | undefined>).workerId);
    const supplierId = getOptionalNonEmptyText(
      (req.body as { supplierId?: string }).supplierId,
    );

    if (!roomId || !workerId || !supplierId) {
      return res.status(400).json({ error: "Missing roomId, workerId or supplierId" });
    }

    const currentMembership = await getMembership(roomId, current.userId);
    if (!currentMembership) {
      return res.status(403).json({ error: "Not a member of this room" });
    }
    if (currentMembership.role !== Role.WORKER) {
      return res.status(403).json({ error: "Only workers can add suppliers in MVP" });
    }
    if (current.userId !== workerId) {
      return res.status(403).json({ error: "Worker can only link suppliers to their own scope" });
    }

    const room = await getRoomOrNull(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== RoomStatus.ACTIVE) {
      return res.status(403).json({ error: "Room is closed" });
    }

    const workerMembership = await getMembership(roomId, workerId);
    if (!workerMembership || workerMembership.role !== Role.WORKER) {
      return res.status(400).json({ error: "workerId must belong to a WORKER in the room" });
    }

    const supplier = await prisma.user.findUnique({ where: { id: supplierId } });
    if (!supplier || supplier.defaultRole !== Role.SUPPLIER) {
      return res.status(400).json({ error: "supplierId must be a SUPPLIER user" });
    }

    await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: supplierId,
        },
      },
      create: {
        roomId,
        userId: supplierId,
        role: Role.SUPPLIER,
        lastSeenAt: new Date(),
      },
      update: {
        role: Role.SUPPLIER,
      },
    });

    const link = await prisma.workerSupplierLink.upsert({
      where: {
        roomId_workerId_supplierId: {
          roomId,
          workerId,
          supplierId,
        },
      },
      create: {
        roomId,
        workerId,
        supplierId,
        status: LinkStatus.ACTIVE,
      },
      update: {
        status: LinkStatus.ACTIVE,
      },
      include: {
        worker: {
          select: { id: true, fullName: true, phone: true },
        },
        supplier: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    await refreshRoomCaches(roomId);

    await emitRoomEvent(roomId, "supplier.linked", {
      roomId,
      workerId: link.workerId,
      supplierId: link.supplierId,
      linkedAt: link.createdAt.toISOString(),
      byUserId: current.userId,
    });

    return res.json(link);
  },
);

app.post(
  "/api/rooms/:roomId/suppliers",
  authMiddleware,
  requireRole(Role.WORKER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
    const supplierId = getOptionalNonEmptyText(
      (req.body as { supplierId?: string }).supplierId,
    );
    if (!roomId || !supplierId) {
      return res.status(400).json({ error: "Missing roomId or supplierId" });
    }

    const currentMembership = await getMembership(roomId, current.userId);
    if (!currentMembership || currentMembership.role !== Role.WORKER) {
      return res.status(403).json({ error: "Only room workers can add suppliers" });
    }

    const room = await getRoomOrNull(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== RoomStatus.ACTIVE) {
      return res.status(403).json({ error: "Room is closed" });
    }

    const supplier = await prisma.user.findUnique({ where: { id: supplierId } });
    if (!supplier || supplier.defaultRole !== Role.SUPPLIER) {
      return res.status(400).json({ error: "supplierId must be a SUPPLIER user" });
    }

    await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: supplierId,
        },
      },
      create: {
        roomId,
        userId: supplierId,
        role: Role.SUPPLIER,
        lastSeenAt: new Date(),
      },
      update: {
        role: Role.SUPPLIER,
      },
    });

    const link = await prisma.workerSupplierLink.upsert({
      where: {
        roomId_workerId_supplierId: {
          roomId,
          workerId: current.userId,
          supplierId,
        },
      },
      create: {
        roomId,
        workerId: current.userId,
        supplierId,
        status: LinkStatus.ACTIVE,
      },
      update: {
        status: LinkStatus.ACTIVE,
      },
      include: {
        worker: {
          select: { id: true, fullName: true, phone: true },
        },
        supplier: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    await refreshRoomCaches(roomId);

    await emitRoomEvent(roomId, "supplier.linked", {
      roomId,
      workerId: link.workerId,
      supplierId: link.supplierId,
      linkedAt: link.createdAt.toISOString(),
      byUserId: current.userId,
    });

    return res.json(link);
  },
);

app.get("/api/rooms/:roomId/worker-suppliers", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  const membership = await getMembership(roomId, current.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  const where: Prisma.WorkerSupplierLinkWhereInput = {
    roomId,
    status: LinkStatus.ACTIVE,
  };
  const query = req.query as Record<string, unknown>;
  if (membership.role === Role.SUPPLIER) {
    where.supplierId = current.userId;
  }

  const workerId = getOptionalNonEmptyText(query.workerId);
  const supplierId = getOptionalNonEmptyText(query.supplierId);
  if (workerId && membership.role !== Role.SUPPLIER) where.workerId = workerId;
  if (supplierId && membership.role !== Role.SUPPLIER) where.supplierId = supplierId;

  const links = await prisma.workerSupplierLink.findMany({
    where,
    include: {
      worker: {
        select: { id: true, fullName: true, phone: true },
      },
      supplier: {
        select: { id: true, fullName: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(links);
});

app.get(
  "/api/rooms/:roomId/worker-suppliers/me",
  authMiddleware,
  requireRole(Role.WORKER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
    if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

    const membership = await getMembership(roomId, current.userId);
    if (!membership || membership.role !== Role.WORKER) {
      return res.status(403).json({ error: "Not a WORKER in this room" });
    }

    const links = await prisma.workerSupplierLink.findMany({
      where: {
        roomId,
        workerId: current.userId,
        status: LinkStatus.ACTIVE,
      },
      include: {
        supplier: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(links);
  },
);

app.get(
  "/api/rooms/:roomId/suppliers",
  authMiddleware,
  requireRole(Role.OWNER, Role.WORKER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
    if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

    const membership = await getMembership(roomId, current.userId);
    if (!membership || (membership.role !== Role.OWNER && membership.role !== Role.WORKER)) {
      return res.status(403).json({ error: "Not allowed for this room" });
    }

    const links = await prisma.workerSupplierLink.findMany({
      where: {
        roomId,
        ...(membership.role === Role.WORKER ? { workerId: current.userId } : {}),
      },
      include: {
        worker: {
          select: { id: true, fullName: true, phone: true },
        },
        supplier: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(links);
  },
);

// Supplier profile
app.get(
  "/api/supplier/profile",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const profile = await prisma.supplierStoreProfile.findUnique({
      where: { supplierId: current.userId },
    });
    return res.json(profile ?? null);
  },
);

app.put(
  "/api/supplier/profile",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body as {
      logoUrl?: string;
      storeName?: string;
      phone?: string;
      address?: string;
      ice?: string;
      rc?: string;
      footerNote?: string;
    };

    const storeName = getOptionalNonEmptyText(body.storeName);
    const phone = getOptionalNonEmptyText(body.phone);
    const address = getOptionalNonEmptyText(body.address);

    if (!storeName || !phone || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const createData: Prisma.SupplierStoreProfileUncheckedCreateInput = {
      supplierId: current.userId,
      storeName,
      phone,
      address,
      logoUrl: getNullableText(body.logoUrl),
      ice: getNullableText(body.ice),
      rc: getNullableText(body.rc),
      footerNote: getNullableText(body.footerNote),
    };

    const updateData: Prisma.SupplierStoreProfileUncheckedUpdateInput = {
      storeName,
      phone,
      address,
      logoUrl: getNullableText(body.logoUrl),
      ice: getNullableText(body.ice),
      rc: getNullableText(body.rc),
      footerNote: getNullableText(body.footerNote),
    };

    const profile = await prisma.supplierStoreProfile.upsert({
      where: { supplierId: current.userId },
      create: createData,
      update: updateData,
    });

    return res.json(profile);
  },
);

// Documents
app.post(
  "/api/documents",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body as CreateDocumentBody;

    try {
      const doc = await createDocumentForSupplier(current, body);
      return res.json(doc);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to create document" });
    }
  },
);

app.get(
  "/api/documents/personal",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const docs = await prisma.document.findMany({
      where: {
        supplierId: current.userId,
        isPersonal: true,
      },
      include: documentInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.json(docs);
  },
);

app.post(
  "/api/rooms/:roomId/documents",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
    if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

    const membership = await getMembership(roomId, current.userId);
    if (!membership || membership.role !== Role.SUPPLIER) {
      return res.status(403).json({ error: "Supplier is not a member of this room" });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true },
    });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== RoomStatus.ACTIVE) {
      return res.status(403).json({ error: "Room is closed" });
    }

    const body = req.body as CreateDocumentBody;
    let workerId = getOptionalNonEmptyText(body.workerId);
    if (!workerId) {
      const links = await prisma.workerSupplierLink.findMany({
        where: {
          roomId,
          supplierId: current.userId,
          status: LinkStatus.ACTIVE,
        },
        select: { workerId: true },
      });

      if (links.length === 0) {
        return res.status(403).json({ error: "Supplier is not linked in this room" });
      }
      if (links.length > 1) {
        return res.status(400).json({
          error: "Multiple worker scopes found. Please provide workerId.",
        });
      }
      workerId = links[0]?.workerId;
    }
    if (!workerId) {
      return res.status(400).json({ error: "workerId is required for room document" });
    }

    try {
      const doc = await createDocumentForSupplier(current, {
        ...body,
        roomId,
        workerId,
        isPersonal: false,
      });
      return res.json(doc);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to create room document" });
    }
  },
);

app.get(
  "/api/me/documents",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const scope = getOptionalNonEmptyText((req.query as Record<string, unknown>).scope)?.toLowerCase() ?? "personal";
    const where: Prisma.DocumentWhereInput = {
      supplierId: current.userId,
    };

    if (scope === "personal") {
      where.isPersonal = true;
    } else if (scope === "room") {
      where.isPersonal = false;
    }

    const docs = await prisma.document.findMany({
      where,
      include: documentInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.json(docs);
  },
);

app.post(
  "/api/me/documents",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body as CreateDocumentBody;
    try {
      const payload: CreateDocumentBody = {
        ...body,
        isPersonal: true,
      };
      const doc = await createDocumentForSupplier(current, {
        ...payload,
      });
      return res.json(doc);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to create personal document" });
    }
  },
);

app.get("/api/rooms/:roomId/documents", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  const membership = await getMembership(roomId, current.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  let docs;
  if (membership.role === Role.OWNER) {
    docs = await prisma.document.findMany({
      where: { roomId },
      include: documentInclude,
      orderBy: { createdAt: "asc" },
    });
  } else if (membership.role === Role.WORKER) {
    const links = await prisma.workerSupplierLink.findMany({
      where: {
        roomId,
        workerId: current.userId,
        status: LinkStatus.ACTIVE,
      },
      select: { supplierId: true },
    });
    const supplierIds = links.map((link) => link.supplierId);
    docs = await prisma.document.findMany({
      where: {
        roomId,
        supplierId: { in: supplierIds.length > 0 ? supplierIds : [""] },
      },
      include: documentInclude,
      orderBy: { createdAt: "asc" },
    });
  } else {
    docs = await prisma.document.findMany({
      where: {
        roomId,
        supplierId: current.userId,
      },
      include: documentInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  return res.json(docs);
});

app.get("/api/rooms/:roomId/stream", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const roomId = getSingleParam((req.params as Record<string, string | string[] | undefined>).roomId);
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  const membership = await getMembership(roomId, current.userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  registerRoomStream(roomId, {
    response: res,
    user: current,
  });
  res.write(`event: ready\n`);
  res.write(`data: ${JSON.stringify({ roomId, ts: Date.now() })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unregisterRoomStream(roomId, res);
    res.end();
  });
});

app.get("/api/documents/:id", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const id = getSingleParam((req.params as Record<string, string | string[] | undefined>).id);
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: documentInclude,
  });
  if (!doc) return res.status(404).json({ error: "Not found" });

  const allowed = await canAccessDocument(current, doc);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  return res.json(doc);
});

app.get("/api/documents/:id/share", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const id = getSingleParam((req.params as Record<string, string | string[] | undefined>).id);
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      grandTotal: true,
      currency: true,
      roomId: true,
      supplierId: true,
      isPersonal: true,
    },
  });

  if (!doc) return res.status(404).json({ error: "Not found" });
  const allowed = await canAccessDocument(current, doc);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const apiBase = PUBLIC_API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  const pdfUrl = `${apiBase}/api/documents/${doc.id}/pdf`;
  const message = encodeURIComponent(
    `BOON ${doc.type} | Total: ${doc.grandTotal} ${doc.currency}\n${pdfUrl}`,
  );
  const whatsappUrl = `https://wa.me/?text=${message}`;

  return res.json({
    pdfUrl,
    whatsappUrl,
  });
});

app.post("/api/documents/:id/export-pdf", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const id = getSingleParam((req.params as Record<string, string | string[] | undefined>).id);
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      roomId: true,
      supplierId: true,
      isPersonal: true,
    },
  });
  if (!doc) return res.status(404).json({ error: "Not found" });

  const allowed = await canAccessDocument(current, doc);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const apiBase = PUBLIC_API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  return res.json({
    documentId: id,
    pdfUrl: `${apiBase}/api/documents/${id}/pdf`,
  });
});

app.post(
  "/api/me/documents/:id/export-pdf",
  authMiddleware,
  requireRole(Role.SUPPLIER),
  async (req, res) => {
    const current = (req as AuthenticatedRequest).user;
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const id = getSingleParam((req.params as Record<string, string | string[] | undefined>).id);
    if (!id) return res.status(400).json({ error: "Invalid document id" });

    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        supplierId: true,
        isPersonal: true,
      },
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (doc.supplierId !== current.userId || !doc.isPersonal) {
      return res.status(403).json({ error: "Only your personal documents can be exported here" });
    }

    const apiBase = PUBLIC_API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
    return res.json({
      documentId: id,
      pdfUrl: `${apiBase}/api/documents/${id}/pdf`,
    });
  },
);

app.get("/api/documents/:id/pdf", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const id = getSingleParam((req.params as Record<string, string | string[] | undefined>).id);
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: documentInclude,
  });

  if (!doc) return res.status(404).json({ error: "Not found" });
  const allowed = await canAccessDocument(current, doc);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="boon-${doc.id}.pdf"`);

  const pdf = new PDFDocument({ size: "A4", margin: 40 });
  pdf.pipe(res);

  pdf.fontSize(18).text(doc.storeProfile.storeName);
  pdf.fontSize(10).text(doc.storeProfile.address);
  pdf.text(`Phone: ${doc.storeProfile.phone}`);
  if (doc.storeProfile.ice) pdf.text(`ICE: ${doc.storeProfile.ice}`);
  if (doc.storeProfile.rc) pdf.text(`RC: ${doc.storeProfile.rc}`);
  pdf.moveDown();

  pdf.fontSize(14).text(`${doc.type} ${doc.category ? `- ${doc.category}` : ""}`);
  pdf.fontSize(10).text(`Created: ${doc.createdAt.toISOString()}`);
  pdf.moveDown();

  if (doc.items.length > 0) {
    pdf.fontSize(12).text("Items");
    for (const item of doc.items) {
      pdf
        .fontSize(10)
        .text(
          `${item.productName} | ${item.qty} ${item.unit ?? ""} x ${item.unitPrice} = ${item.lineTotal}`,
        );
    }
  } else if (doc.quickAmount != null) {
    pdf.fontSize(12).text(`Quick amount: ${doc.quickAmount} ${doc.currency}`);
  }

  if (doc.note) {
    pdf.moveDown();
    pdf.fontSize(10).text(`Note: ${doc.note}`);
  }

  if (doc.attachments.length > 0) {
    pdf.moveDown();
    pdf.fontSize(10).text(`Attachments: ${doc.attachments.length}`);
    for (const attachment of doc.attachments) {
      pdf.fontSize(9).fillColor("#444").text(attachment.fileUrl);
    }
    pdf.fillColor("#000");
  }

  pdf.moveDown();
  pdf.fontSize(16).text(`TOTAL: ${doc.grandTotal} ${doc.currency}`, { align: "right" });

  if (doc.storeProfile.footerNote) {
    pdf.moveDown();
    pdf.fontSize(10).text(doc.storeProfile.footerNote, { align: "center" });
  }

  pdf.end();
});

app.get("/api/analytics/overview", authMiddleware, async (req, res) => {
  const current = (req as AuthenticatedRequest).user;
  if (!current) return res.status(401).json({ error: "Unauthorized" });

  const docs = await getAccessibleDocumentsForAnalytics(current);
  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;
  let allTotal = 0;
  let personalTotal = 0;
  let roomTotal = 0;

  const byTypeMap = new Map<DocumentType, { type: DocumentType; count: number; amount: number }>();
  const byCategoryMap = new Map<string, { category: string; count: number; amount: number }>();
  const bySupplierMap = new Map<string, { supplierId: string; supplierName: string; count: number; amount: number }>();

  const last7 = [...Array(7)].map((_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      amount: 0,
      count: 0,
    };
  });
  const last7Map = new Map(last7.map((entry) => [entry.key, entry]));

  for (const doc of docs) {
    const amount = Number(doc.grandTotal) || 0;
    const createdAt = doc.createdAt.getTime();
    const dayKey = doc.createdAt.toISOString().slice(0, 10);

    allTotal += amount;
    if (doc.isPersonal) {
      personalTotal += amount;
    } else {
      roomTotal += amount;
    }
    if (createdAt >= dayStart) todayTotal += amount;
    if (createdAt >= weekStart) weekTotal += amount;
    if (createdAt >= monthStart) monthTotal += amount;

    const typeEntry = byTypeMap.get(doc.type) ?? {
      type: doc.type,
      count: 0,
      amount: 0,
    };
    typeEntry.count += 1;
    typeEntry.amount += amount;
    byTypeMap.set(doc.type, typeEntry);

    const categoryKey = getOptionalNonEmptyText(doc.category) ?? "Uncategorized";
    const categoryEntry = byCategoryMap.get(categoryKey) ?? {
      category: categoryKey,
      count: 0,
      amount: 0,
    };
    categoryEntry.count += 1;
    categoryEntry.amount += amount;
    byCategoryMap.set(categoryKey, categoryEntry);

    const supplierEntry = bySupplierMap.get(doc.supplier.id) ?? {
      supplierId: doc.supplier.id,
      supplierName: doc.supplier.fullName,
      count: 0,
      amount: 0,
    };
    supplierEntry.count += 1;
    supplierEntry.amount += amount;
    bySupplierMap.set(doc.supplier.id, supplierEntry);

    const dayEntry = last7Map.get(dayKey);
    if (dayEntry) {
      dayEntry.count += 1;
      dayEntry.amount += amount;
    }
  }

  const roomIds = new Set(docs.map((doc) => doc.roomId).filter(Boolean));

  return res.json({
    totals: {
      today: Number(todayTotal.toFixed(2)),
      week: Number(weekTotal.toFixed(2)),
      month: Number(monthTotal.toFixed(2)),
      all: Number(allTotal.toFixed(2)),
      personal: Number(personalTotal.toFixed(2)),
      room: Number(roomTotal.toFixed(2)),
    },
    documentsCount: docs.length,
    roomsCount: roomIds.size,
    byType: [...byTypeMap.values()].sort((a, b) => b.amount - a.amount),
    byCategory: [...byCategoryMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 8),
    topSuppliers: [...bySupplierMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 6),
    last7Days: last7.map((entry) => ({
      date: entry.key,
      label: entry.label,
      amount: Number(entry.amount.toFixed(2)),
      count: entry.count,
    })),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "BOON API" });
});

app.listen(PORT, () => {
  console.log(`BOON API listening on http://localhost:${PORT}`);
  refreshAllRoomCaches().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to refresh room caches at startup:", error);
  });
});
