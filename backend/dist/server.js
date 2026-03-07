"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL?.trim() || "file:./dev.db";
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN?.trim();
const adapter = new adapter_libsql_1.PrismaLibSql({
    url: DATABASE_URL,
    ...(DATABASE_AUTH_TOKEN ? { authToken: DATABASE_AUTH_TOKEN } : {}),
});
const prisma = new client_1.PrismaClient({ adapter });
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV?.trim() || "development";
const JWT_SECRET = process.env.JWT_SECRET?.trim() || node_crypto_1.default.randomBytes(48).toString("hex");
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL;
const CORS_ORIGINS = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean)
    : null;
const PASSWORD_MIN_LENGTH = 10;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 40;
const AUTH_BLOCK_MS = 15 * 60 * 1000;
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const DOCUMENT_SHARE_TOKEN_TTL = "7d";
const SMS_WEBHOOK_URL = process.env.SMS_WEBHOOK_URL?.trim();
const SMS_WEBHOOK_TOKEN = process.env.SMS_WEBHOOK_TOKEN?.trim();
const ALLOW_DEV_VERIFICATION_CODE = NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_VERIFICATION_CODE?.trim() === "true";
const DEFAULT_BOON_LOGO_PATHS = [
    node_path_1.default.resolve(__dirname, "../public/boon.png"),
    node_path_1.default.resolve(__dirname, "../../public/boon.png"),
];
if (NODE_ENV === "production") {
    if (!process.env.JWT_SECRET?.trim()) {
        throw new Error("JWT_SECRET is required in production.");
    }
    if (DATABASE_URL.startsWith("file:")) {
        throw new Error("DATABASE_URL must point to a remote database in production. Local file databases are not supported for public deployment.");
    }
}
if (!process.env.JWT_SECRET?.trim()) {
    // eslint-disable-next-line no-console
    console.warn("JWT_SECRET not set. Using ephemeral key for this process.");
}
if (!SMS_WEBHOOK_URL && !ALLOW_DEV_VERIFICATION_CODE) {
    // eslint-disable-next-line no-console
    console.warn("SMS_WEBHOOK_URL is not configured and ALLOW_DEV_VERIFICATION_CODE is disabled. Public phone verification will not be deliverable.");
}
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((0, cors_1.default)({
    origin: CORS_ORIGINS?.length ? CORS_ORIGINS : true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: "2mb" }));
app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
});
class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
const authLimiterStore = new Map();
const roomStreams = new Map();
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function signDocumentShareToken(documentId) {
    return jsonwebtoken_1.default.sign({
        documentId,
        purpose: "document-share",
    }, JWT_SECRET, { expiresIn: DOCUMENT_SHARE_TOKEN_TTL });
}
function verifyDocumentShareToken(token, documentId) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    return decoded.purpose === "document-share" && decoded.documentId === documentId;
}
function getSingleParam(value) {
    if (Array.isArray(value)) {
        return value[0]?.trim() || null;
    }
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function getNullableText(value) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function getOptionalNonEmptyText(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function getBearerToken(req) {
    const header = req.headers.authorization;
    return header?.startsWith("Bearer ")
        ? header.slice("Bearer ".length)
        : undefined;
}
function toUpperText(value) {
    if (!value)
        return undefined;
    return value.trim().toUpperCase();
}
function normalizePhone(value) {
    if (typeof value !== "string")
        return null;
    const compact = value.trim().replace(/[\s().-]+/g, "");
    if (!compact)
        return null;
    if (compact.startsWith("00")) {
        return `+${compact.slice(2)}`;
    }
    if (/^0\d{9}$/.test(compact)) {
        return `+212${compact.slice(1)}`;
    }
    if (/^212\d{9}$/.test(compact)) {
        return `+${compact}`;
    }
    return compact;
}
function isValidPhone(value) {
    return /^\+?[1-9]\d{8,14}$/.test(value);
}
function normalizeEmail(value) {
    if (typeof value !== "string")
        return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function maskPhone(phone) {
    if (phone.length <= 4)
        return phone;
    return `${phone.slice(0, 4)}${"*".repeat(Math.max(phone.length - 6, 2))}${phone.slice(-2)}`;
}
function serializeUser(user) {
    return {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: user.defaultRole,
        phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
        status: user.status,
    };
}
function buildVerificationResponse(phone, devCode) {
    return {
        verificationRequired: true,
        phone,
        maskedPhone: maskPhone(phone),
        expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
        ...(devCode ? { devCode } : {}),
    };
}
function generateNumericCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
}
function hashVerificationCode(code) {
    return node_crypto_1.default.createHash("sha256").update(code).digest("hex");
}
async function deliverVerificationCode(phone, code) {
    if (SMS_WEBHOOK_URL) {
        const response = await fetch(SMS_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${SMS_WEBHOOK_TOKEN}` } : {}),
            },
            body: JSON.stringify({
                phone,
                message: `BOON verification code: ${code}`,
                code,
            }),
        });
        if (!response.ok) {
            throw new ApiError(502, "Verification delivery failed");
        }
        return;
    }
    // eslint-disable-next-line no-console
    console.info(`[BOON verification] ${phone}: ${code}`);
}
async function issuePhoneVerificationCode(user) {
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    await prisma.phoneVerificationCode.updateMany({
        where: {
            userId: user.id,
            consumedAt: null,
        },
        data: {
            consumedAt: new Date(),
        },
    });
    await prisma.phoneVerificationCode.create({
        data: {
            userId: user.id,
            phone: user.phone,
            codeHash: hashVerificationCode(code),
            expiresAt,
        },
    });
    await deliverVerificationCode(user.phone, code);
    return buildVerificationResponse(user.phone, ALLOW_DEV_VERIFICATION_CODE ? code : undefined);
}
async function loadPdfLogoBuffer(logoUrl) {
    if (logoUrl) {
        if (logoUrl.startsWith("data:image/")) {
            const base64 = logoUrl.split(",")[1];
            if (base64) {
                return Buffer.from(base64, "base64");
            }
        }
        if (/^https?:\/\//i.test(logoUrl)) {
            try {
                const response = await fetch(logoUrl);
                if (response.ok) {
                    return Buffer.from(await response.arrayBuffer());
                }
            }
            catch {
                // Fall back to the default BOON logo.
            }
        }
    }
    for (const logoPath of DEFAULT_BOON_LOGO_PATHS) {
        try {
            return await promises_1.default.readFile(logoPath);
        }
        catch {
            // Try the next fallback path.
        }
    }
    return null;
}
async function getOpenVerificationCode(userId, phone) {
    return prisma.phoneVerificationCode.findFirst({
        where: {
            userId,
            phone,
            consumedAt: null,
        },
        orderBy: { createdAt: "desc" },
    });
}
function isRoomStatus(value) {
    return value === client_1.RoomStatus.ACTIVE || value === client_1.RoomStatus.CLOSED;
}
function parseRoomFilter(value) {
    const normalized = getOptionalNonEmptyText(value)?.toLowerCase();
    if (normalized === "active" || normalized === "closed")
        return normalized;
    return "all";
}
function passwordPolicyError(password) {
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
function authRateLimiter(req, res, next) {
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
function registerRoomStream(roomId, subscriber) {
    const existing = roomStreams.get(roomId);
    if (existing) {
        existing.add(subscriber);
        return;
    }
    roomStreams.set(roomId, new Set([subscriber]));
}
function unregisterRoomStream(roomId, response) {
    const existing = roomStreams.get(roomId);
    if (!existing)
        return;
    for (const subscriber of existing) {
        if (subscriber.response === response) {
            existing.delete(subscriber);
        }
    }
    if (existing.size === 0) {
        roomStreams.delete(roomId);
    }
}
async function emitRoomEvent(roomId, eventName, payload) {
    const listeners = roomStreams.get(roomId);
    if (!listeners || listeners.size === 0)
        return;
    const serialized = JSON.stringify(payload);
    let allowedWorkers = new Set();
    let supplierIdForDoc = null;
    if (eventName === "document.created" &&
        typeof payload === "object" &&
        payload !== null &&
        "supplierId" in payload) {
        supplierIdForDoc = getOptionalNonEmptyText(payload.supplierId) ?? null;
        if (supplierIdForDoc) {
            const workerLinks = await prisma.workerSupplierLink.findMany({
                where: {
                    roomId,
                    supplierId: supplierIdForDoc,
                    status: client_1.LinkStatus.ACTIVE,
                },
                select: { workerId: true },
            });
            allowedWorkers = new Set(workerLinks.map((entry) => entry.workerId));
        }
    }
    for (const subscriber of listeners) {
        if (eventName === "document.created" && supplierIdForDoc) {
            const isAllowed = subscriber.user.role === client_1.Role.OWNER ||
                (subscriber.user.role === client_1.Role.WORKER &&
                    allowedWorkers.has(subscriber.user.userId)) ||
                (subscriber.user.role === client_1.Role.SUPPLIER &&
                    subscriber.user.userId === supplierIdForDoc);
            if (!isAllowed)
                continue;
        }
        try {
            subscriber.response.write(`event: ${eventName}\n`);
            subscriber.response.write(`data: ${serialized}\n\n`);
        }
        catch {
            unregisterRoomStream(roomId, subscriber.response);
        }
    }
}
function isRole(value) {
    return value === client_1.Role.OWNER || value === client_1.Role.WORKER || value === client_1.Role.SUPPLIER;
}
function isDocumentType(value) {
    return (value === client_1.DocumentType.RECEIPT ||
        value === client_1.DocumentType.INVOICE ||
        value === client_1.DocumentType.QUOTE);
}
async function findUserByIdentifier(identifier) {
    const normalizedPhone = normalizePhone(identifier);
    const normalizedEmail = normalizeEmail(identifier);
    if (!normalizedPhone && !normalizedEmail) {
        return null;
    }
    return prisma.user.findFirst({
        where: {
            OR: [
                ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
        },
    });
}
async function getCurrentUser(req) {
    if (!req.user)
        return null;
    return prisma.user.findUnique({ where: { id: req.user.userId } });
}
async function getMembership(roomId, userId) {
    return prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });
}
async function getRoomOrNull(roomId) {
    return prisma.room.findUnique({
        where: { id: roomId },
        select: {
            id: true,
            status: true,
            ownerId: true,
        },
    });
}
async function canAccessDocument(current, doc) {
    if (doc.isPersonal) {
        return doc.supplierId === current.userId;
    }
    if (!doc.roomId)
        return false;
    const membership = await getMembership(doc.roomId, current.userId);
    if (!membership)
        return false;
    if (membership.role === client_1.Role.OWNER)
        return true;
    if (membership.role === client_1.Role.SUPPLIER) {
        return doc.supplierId === current.userId;
    }
    if (membership.role === client_1.Role.WORKER) {
        const link = await prisma.workerSupplierLink.findFirst({
            where: {
                roomId: doc.roomId,
                workerId: current.userId,
                supplierId: doc.supplierId,
                status: client_1.LinkStatus.ACTIVE,
            },
        });
        return Boolean(link);
    }
    return false;
}
async function getAccessibleDocumentsForAnalytics(current) {
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
    };
    if (current.role === client_1.Role.SUPPLIER) {
        return prisma.document.findMany({
            where: { supplierId: current.userId },
            select,
            orderBy: { createdAt: "desc" },
        });
    }
    if (current.role === client_1.Role.OWNER) {
        const ownedMemberships = await prisma.roomMember.findMany({
            where: {
                userId: current.userId,
                role: client_1.Role.OWNER,
            },
            select: { roomId: true },
        });
        const roomIds = ownedMemberships.map((entry) => entry.roomId);
        if (roomIds.length === 0)
            return [];
        return prisma.document.findMany({
            where: {
                roomId: { in: roomIds },
                isPersonal: false,
            },
            select,
            orderBy: { createdAt: "desc" },
        });
    }
    const workerLinks = await prisma.workerSupplierLink.findMany({
        where: {
            workerId: current.userId,
            status: client_1.LinkStatus.ACTIVE,
        },
        select: {
            roomId: true,
            supplierId: true,
        },
    });
    if (workerLinks.length === 0)
        return [];
    const roomIds = [...new Set(workerLinks.map((entry) => entry.roomId))];
    const linkSet = new Set(workerLinks.map((entry) => `${entry.roomId}:${entry.supplierId}`));
    const rawDocs = (await prisma.document.findMany({
        where: {
            roomId: { in: roomIds },
            isPersonal: false,
        },
        select,
        orderBy: { createdAt: "desc" },
    }));
    return rawDocs.filter((doc) => {
        if (!doc.roomId)
            return false;
        return linkSet.has(`${doc.roomId}:${doc.supplierId}`);
    });
}
function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function startOfWeek(date) {
    const copy = startOfDay(date);
    const mondayOffset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - mondayOffset);
    return copy;
}
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
async function authMiddleware(req, res, next) {
    const allowQueryToken = /^\/api\/documents\/[^/]+\/pdf$/.test(req.path) ||
        /^\/api\/rooms\/[^/]+\/stream$/.test(req.path);
    const queryToken = allowQueryToken
        ? getOptionalNonEmptyText(req.query.token)
        : undefined;
    const tokenFromHeader = getBearerToken(req);
    const token = tokenFromHeader ?? queryToken;
    if (!token) {
        return res.status(401).json({ error: "Missing token" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, status: true },
        });
        if (!user || user.status !== client_1.UserStatus.ACTIVE) {
            return res.status(401).json({ error: "Account is unavailable" });
        }
        req.user = decoded;
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        const payload = req.user;
        if (!payload || !roles.includes(payload.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        return next();
    };
}
function generateRoomCode(roomName) {
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
function buildActivityPreview(input) {
    const title = getOptionalNonEmptyText(input.category) ?? input.type;
    return `${input.supplierName} - ${title} - ${input.amount.toFixed(2)} ${input.currency}`;
}
async function refreshRoomCaches(roomId) {
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
    const supplierAggregateMap = new Map(supplierGroups.map((group) => [
        group.supplierId,
        {
            total: Number(group._sum.grandTotal ?? 0),
            docsCount: Number(group._count.supplierId ?? 0),
            lastActivityAt: group._max.createdAt ?? null,
        },
    ]));
    const supplierIds = [...supplierAggregateMap.keys()];
    if (supplierIds.length > 0) {
        await Promise.all(supplierIds.map((supplierId) => {
            const entry = supplierAggregateMap.get(supplierId);
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
        }));
        await prisma.roomSupplierScopeCache.deleteMany({
            where: {
                roomId,
                supplierId: { notIn: supplierIds },
            },
        });
    }
    else {
        await prisma.roomSupplierScopeCache.deleteMany({ where: { roomId } });
    }
    const linksByWorker = new Map();
    for (const link of links) {
        if (link.status !== client_1.LinkStatus.ACTIVE)
            continue;
        const existing = linksByWorker.get(link.workerId) ?? new Set();
        existing.add(link.supplierId);
        linksByWorker.set(link.workerId, existing);
    }
    const workerIds = [...linksByWorker.keys()];
    if (workerIds.length > 0) {
        await Promise.all(workerIds.map((workerId) => {
            const supplierSet = linksByWorker.get(workerId);
            let total = 0;
            let docs = 0;
            let lastActivityAt = null;
            for (const supplierId of supplierSet) {
                const aggregateEntry = supplierAggregateMap.get(supplierId);
                if (!aggregateEntry)
                    continue;
                total += aggregateEntry.total;
                docs += aggregateEntry.docsCount;
                if (aggregateEntry.lastActivityAt &&
                    (!lastActivityAt || aggregateEntry.lastActivityAt > lastActivityAt)) {
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
        }));
        await prisma.roomWorkerScopeCache.deleteMany({
            where: {
                roomId,
                workerId: { notIn: workerIds },
            },
        });
    }
    else {
        await prisma.roomWorkerScopeCache.deleteMany({ where: { roomId } });
    }
    await Promise.all(links.map((link) => {
        const supplierCache = supplierAggregateMap.get(link.supplierId);
        return prisma.workerSupplierLink.update({
            where: { id: link.id },
            data: {
                cachedTotal: Number(supplierCache?.total ?? 0),
                cachedDocsCount: Number(supplierCache?.docsCount ?? 0),
                lastActivityAt: supplierCache?.lastActivityAt ?? null,
            },
        });
    }));
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
async function buildRoomsListForUser(userId, params) {
    const search = getOptionalNonEmptyText(params?.search);
    const filter = params?.filter ?? "all";
    const memberships = await prisma.roomMember.findMany({
        where: {
            userId,
            room: {
                ...(filter === "active" ? { status: client_1.RoomStatus.ACTIVE } : {}),
                ...(filter === "closed" ? { status: client_1.RoomStatus.CLOSED } : {}),
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
    if (memberships.length === 0)
        return [];
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
    const supplierMap = new Map(supplierTotals.map((entry) => [entry.roomId, entry.total]));
    const workerLinks = await prisma.workerSupplierLink.findMany({
        where: {
            workerId: userId,
            roomId: { in: roomIds },
            status: client_1.LinkStatus.ACTIVE,
        },
        select: {
            roomId: true,
            supplierId: true,
        },
    });
    const workerSupplierMap = new Map();
    for (const link of workerLinks) {
        const existing = workerSupplierMap.get(link.roomId) ?? [];
        if (!existing.includes(link.supplierId))
            existing.push(link.supplierId);
        workerSupplierMap.set(link.roomId, existing);
    }
    const unreadCounts = await Promise.all(memberships.map(async (member) => {
        const lastSeen = member.lastSeenAt ?? undefined;
        const createdAtFilter = lastSeen ? { gt: lastSeen } : undefined;
        if (member.role === client_1.Role.OWNER) {
            const count = await prisma.document.count({
                where: {
                    roomId: member.room.id,
                    isPersonal: false,
                    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
                },
            });
            return { roomId: member.room.id, count };
        }
        if (member.role === client_1.Role.SUPPLIER) {
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
    }));
    const unreadMap = new Map(unreadCounts.map((entry) => [entry.roomId, entry.count]));
    const rows = memberships.map((member) => {
        const item = {
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
        if (member.role === client_1.Role.OWNER) {
            item.totalForOwner = Number(member.room.cachedTotalOwner ?? 0);
        }
        else if (member.role === client_1.Role.WORKER) {
            item.totalForWorkerScope = Number(workerMap.get(member.room.id) ?? 0);
        }
        else {
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
};
function formatMoney(value, currency) {
    return new Intl.NumberFormat("fr-MA", {
        style: "currency",
        currency: currency || "MAD",
        maximumFractionDigits: 2,
    }).format(value);
}
function buildDocumentShareText(doc) {
    const title = getOptionalNonEmptyText(doc.category) ?? doc.type;
    return [
        `${doc.storeProfile.storeName}`,
        `BOON ${title}`,
        `Total: ${formatMoney(Number(doc.grandTotal), doc.currency)}`,
        `Date: ${doc.createdAt.toISOString().slice(0, 16).replace("T", " ")}`,
        `Phone: ${doc.storeProfile.phone}`,
    ].join("\n");
}
async function renderDocumentPdf(pdf, doc) {
    const pageWidth = pdf.page.width - 80;
    const rightColumnX = 320;
    const amountText = formatMoney(Number(doc.grandTotal), doc.currency);
    const logoBuffer = await loadPdfLogoBuffer(doc.storeProfile.logoUrl);
    const infoX = logoBuffer ? 124 : 56;
    pdf
        .roundedRect(40, 36, pageWidth, 110, 18)
        .fillAndStroke("#f6efe3", "#eadbc1");
    pdf.fillColor("#6b4f1d").fontSize(10).text("BOON", 56, 54);
    if (logoBuffer) {
        try {
            pdf.image(logoBuffer, 56, 66, { fit: [52, 52] });
        }
        catch {
            // Ignore logo rendering failures and continue with text-only header.
        }
    }
    pdf
        .fillColor("#171717")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(doc.storeProfile.storeName, infoX, 70);
    pdf.font("Helvetica").fontSize(10).fillColor("#4b5563");
    pdf.text(doc.storeProfile.address, infoX, 98, { width: 220 });
    pdf.text(`Phone: ${doc.storeProfile.phone}`, infoX, 116);
    if (doc.storeProfile.ice)
        pdf.text(`ICE: ${doc.storeProfile.ice}`, rightColumnX, 70);
    if (doc.storeProfile.rc)
        pdf.text(`RC: ${doc.storeProfile.rc}`, rightColumnX, 86);
    pdf.text(`Document: ${doc.type}`, rightColumnX, 102);
    pdf.text(`Created: ${doc.createdAt.toLocaleString()}`, rightColumnX, 118);
    pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text("Summary", 40, 168);
    pdf
        .roundedRect(40, 188, pageWidth, 56, 14)
        .fillAndStroke("#111827", "#111827");
    pdf.fillColor("#f8fafc").fontSize(10).font("Helvetica").text("Total amount", 56, 204);
    pdf.font("Helvetica-Bold").fontSize(22).text(amountText, 56, 218);
    let y = 272;
    pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text("Items", 40, y);
    y += 18;
    pdf
        .roundedRect(40, y, pageWidth, 28, 10)
        .fillAndStroke("#f3f4f6", "#e5e7eb");
    pdf.fillColor("#374151").fontSize(9).font("Helvetica-Bold");
    pdf.text("Product", 54, y + 9, { width: 180 });
    pdf.text("Qty", 240, y + 9, { width: 40, align: "right" });
    pdf.text("Unit", 288, y + 9, { width: 48, align: "center" });
    pdf.text("Unit Price", 344, y + 9, { width: 90, align: "right" });
    pdf.text("Total", 442, y + 9, { width: 90, align: "right" });
    y += 38;
    if (doc.items.length > 0) {
        for (const item of doc.items) {
            pdf
                .roundedRect(40, y - 4, pageWidth, 30, 10)
                .stroke("#eceff3");
            pdf.fillColor("#111827").font("Helvetica").fontSize(9);
            pdf.text(item.productName, 54, y + 4, { width: 180 });
            pdf.text(`${item.qty}`, 240, y + 4, { width: 40, align: "right" });
            pdf.text(item.unit ?? "-", 288, y + 4, { width: 48, align: "center" });
            pdf.text(formatMoney(Number(item.unitPrice), doc.currency), 344, y + 4, {
                width: 90,
                align: "right",
            });
            pdf.text(formatMoney(Number(item.lineTotal), doc.currency), 442, y + 4, {
                width: 90,
                align: "right",
            });
            y += 38;
        }
    }
    else {
        pdf
            .roundedRect(40, y - 4, pageWidth, 30, 10)
            .stroke("#eceff3");
        pdf.fillColor("#111827").font("Helvetica").fontSize(9);
        pdf.text(getOptionalNonEmptyText(doc.category) ?? "Quick amount", 54, y + 4, {
            width: 240,
        });
        pdf.text("1", 240, y + 4, { width: 40, align: "right" });
        pdf.text("-", 288, y + 4, { width: 48, align: "center" });
        pdf.text(amountText, 344, y + 4, { width: 90, align: "right" });
        pdf.text(amountText, 442, y + 4, { width: 90, align: "right" });
        y += 38;
    }
    if (doc.note) {
        pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text("Note", 40, y + 12);
        pdf.fillColor("#4b5563").font("Helvetica").fontSize(10).text(doc.note, 40, y + 30, {
            width: pageWidth,
        });
        y += 72;
    }
    const footerY = Math.max(y + 10, 710);
    pdf.moveTo(40, footerY).lineTo(555, footerY).strokeColor("#e5e7eb").stroke();
    pdf.fillColor("#4b5563").font("Helvetica").fontSize(9).text(doc.storeProfile.footerNote ||
        "Generated with BOON for secure room-based invoicing.", 40, footerY + 14, { width: pageWidth, align: "center" });
    pdf.text("Powered by BOON. Organised invoice visibility for construction teams.", 40, footerY + 30, { width: pageWidth, align: "center" });
}
async function createDocumentForSupplier(current, body) {
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
        if (room.status !== client_1.RoomStatus.ACTIVE) {
            throw new ApiError(403, "Room is closed");
        }
        const link = await prisma.workerSupplierLink.findFirst({
            where: {
                roomId,
                workerId,
                supplierId: current.userId,
                status: client_1.LinkStatus.ACTIVE,
            },
        });
        if (!link) {
            throw new ApiError(403, "Supplier is not linked to this worker in the room");
        }
    }
    const profile = await prisma.supplierStoreProfile.findUnique({
        where: { supplierId: current.userId },
    });
    if (!profile) {
        throw new ApiError(400, "Supplier profile must be configured before creating documents");
    }
    const parsedItems = Array.isArray(body.items)
        ? body.items
            .filter((item) => Boolean(getOptionalNonEmptyText(item.productName)) &&
            Number.isFinite(item.qty) &&
            Number.isFinite(item.unitPrice))
            .map((item) => ({
            productName: getOptionalNonEmptyText(item.productName),
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            unit: getNullableText(item.unit),
        }))
        : [];
    let grandTotal = 0;
    if (parsedItems.length > 0) {
        grandTotal = parsedItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    }
    else if (typeof body.quickAmount === "number" && Number.isFinite(body.quickAmount)) {
        grandTotal = Number(body.quickAmount);
    }
    else {
        throw new ApiError(400, "Provide either quickAmount or at least one item");
    }
    const attachmentRows = [];
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
            if (!fileUrl)
                continue;
            attachmentRows.push({
                fileUrl,
                mimeType: getOptionalNonEmptyText(attachment.mimeType) ?? "application/octet-stream",
            });
        }
    }
    const createData = {
        type: body.type,
        roomId: isPersonal ? null : roomId,
        workerId: isPersonal ? null : workerId,
        supplierId: current.userId,
        createdBySupplierId: current.userId,
        storeProfileId: profile.id,
        quickAmount: typeof body.quickAmount === "number" && Number.isFinite(body.quickAmount)
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
    const body = req.body;
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    const password = getOptionalNonEmptyText(body.password);
    const fullName = getOptionalNonEmptyText(body.fullName);
    const role = body.role;
    if (!phone || !password || !fullName || !isRole(role)) {
        return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: "Invalid phone format" });
    }
    if (email && !isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }
    const passwordError = passwordPolicyError(password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }
    const existing = await prisma.user.findFirst({
        where: {
            OR: [
                { phone },
                ...(email ? [{ email }] : []),
            ],
        },
    });
    if (existing) {
        return res.status(409).json({ error: "Phone or email already in use" });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            phone,
            email,
            passwordHash,
            fullName,
            defaultRole: role,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const verification = await issuePhoneVerificationCode({
        id: user.id,
        phone: user.phone,
    });
    return res.status(202).json({
        user: serializeUser(user),
        ...verification,
    });
});
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    const body = req.body;
    const identifier = getOptionalNonEmptyText(body.identifier);
    const password = getOptionalNonEmptyText(body.password);
    if (!identifier || !password) {
        return res.status(400).json({ error: "Missing identifier or password" });
    }
    const user = await findUserByIdentifier(identifier);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.status !== client_1.UserStatus.ACTIVE) {
        return res.status(403).json({ error: "Account is disabled" });
    }
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.phoneVerifiedAt) {
        const verification = await issuePhoneVerificationCode({
            id: user.id,
            phone: user.phone,
        });
        return res.status(403).json({
            error: "Phone verification required",
            user: serializeUser(user),
            ...verification,
        });
    }
    const token = signToken({ userId: user.id, role: user.defaultRole });
    return res.json({
        token,
        user: serializeUser(user),
    });
});
app.post("/api/auth/verify-phone", authRateLimiter, async (req, res) => {
    const body = req.body;
    const phone = normalizePhone(body.phone);
    const code = getOptionalNonEmptyText(body.code);
    if (!phone || !code) {
        return res.status(400).json({ error: "phone and code are required" });
    }
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        return res.status(404).json({ error: "Account not found" });
    }
    if (user.status !== client_1.UserStatus.ACTIVE) {
        return res.status(403).json({ error: "Account is disabled" });
    }
    const record = await getOpenVerificationCode(user.id, phone);
    if (!record) {
        return res.status(400).json({ error: "Verification code not found" });
    }
    if (record.consumedAt) {
        return res.status(400).json({ error: "Verification code already used" });
    }
    if (record.expiresAt.getTime() < Date.now()) {
        await prisma.phoneVerificationCode.update({
            where: { id: record.id },
            data: { consumedAt: new Date() },
        });
        return res.status(400).json({ error: "Verification code expired" });
    }
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        return res.status(429).json({ error: "Too many verification attempts" });
    }
    const matches = hashVerificationCode(code) === record.codeHash;
    if (!matches) {
        await prisma.phoneVerificationCode.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
        });
        return res.status(400).json({ error: "Invalid verification code" });
    }
    const now = new Date();
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            phoneVerifiedAt: now,
        },
    });
    await prisma.phoneVerificationCode.update({
        where: { id: record.id },
        data: {
            consumedAt: now,
        },
    });
    const token = signToken({ userId: updatedUser.id, role: updatedUser.defaultRole });
    return res.json({
        token,
        user: serializeUser(updatedUser),
    });
});
app.post("/api/auth/resend-code", authRateLimiter, async (req, res) => {
    const body = req.body;
    const phone = normalizePhone(body.phone);
    if (!phone) {
        return res.status(400).json({ error: "phone is required" });
    }
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        return res.status(404).json({ error: "Account not found" });
    }
    if (user.status !== client_1.UserStatus.ACTIVE) {
        return res.status(403).json({ error: "Account is disabled" });
    }
    const verification = await issuePhoneVerificationCode({
        id: user.id,
        phone: user.phone,
    });
    return res.json(verification);
});
app.get("/api/me", authMiddleware, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    return res.json(serializeUser(user));
});
app.put("/api/me/profile", authMiddleware, async (req, res) => {
    const current = await getCurrentUser(req);
    if (!current)
        return res.status(404).json({ error: "User not found" });
    const body = req.body;
    const nextFullName = getOptionalNonEmptyText(body.fullName);
    const nextEmail = normalizeEmail(body.email);
    if (!nextFullName) {
        return res.status(400).json({ error: "fullName is required" });
    }
    if (nextEmail && !isValidEmail(nextEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
    }
    if (nextEmail && nextEmail !== current.email) {
        const exists = await prisma.user.findUnique({ where: { email: nextEmail } });
        if (exists && exists.id !== current.id) {
            return res.status(409).json({ error: "Email already in use" });
        }
    }
    const updated = await prisma.user.update({
        where: { id: current.id },
        data: {
            fullName: nextFullName,
            email: nextEmail,
        },
    });
    return res.json(serializeUser(updated));
});
app.put("/api/me/password", authMiddleware, async (req, res) => {
    const current = await getCurrentUser(req);
    if (!current)
        return res.status(404).json({ error: "User not found" });
    const body = req.body;
    const currentPassword = getOptionalNonEmptyText(body.currentPassword);
    const newPassword = getOptionalNonEmptyText(body.newPassword);
    if (!currentPassword || !newPassword) {
        return res
            .status(400)
            .json({ error: "currentPassword and newPassword are required" });
    }
    const matches = await bcryptjs_1.default.compare(currentPassword, current.passwordHash);
    if (!matches) {
        return res.status(401).json({ error: "Current password is incorrect" });
    }
    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
        return res.status(400).json({ error: policyError });
    }
    const nextHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma.user.update({
        where: { id: current.id },
        data: { passwordHash: nextHash },
    });
    return res.status(204).send();
});
app.get("/api/users/suppliers", authMiddleware, requireRole(client_1.Role.OWNER, client_1.Role.WORKER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const query = getOptionalNonEmptyText(req.query.q);
    const where = {
        defaultRole: client_1.Role.SUPPLIER,
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
app.post("/api/rooms", authMiddleware, requireRole(client_1.Role.OWNER), async (req, res) => {
    const current = await getCurrentUser(req);
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const name = getOptionalNonEmptyText(req.body.name);
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
                    role: client_1.Role.OWNER,
                    lastSeenAt: new Date(),
                },
            },
        },
    });
    await refreshRoomCaches(room.id);
    return res.json(room);
});
app.get("/api/rooms", authMiddleware, async (req, res) => {
    const payload = req.user;
    if (!payload)
        return res.status(401).json({ error: "Unauthorized" });
    const query = req.query;
    const search = getOptionalNonEmptyText(query.search);
    const filter = parseRoomFilter(query.filter);
    const listItems = await buildRoomsListForUser(payload.userId, { search, filter });
    return res.json(listItems);
});
app.get("/api/rooms/:roomId", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
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
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership) {
        return res.status(403).json({ error: "Not a member of this room" });
    }
    if (membership.role === client_1.Role.SUPPLIER) {
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
app.get("/api/join-requests", authMiddleware, requireRole(client_1.Role.OWNER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const requests = await prisma.roomJoinRequest.findMany({
        where: {
            status: client_1.JoinRequestStatus.PENDING,
            room: {
                ownerId: current.userId,
            },
        },
        include: {
            room: {
                select: {
                    id: true,
                    name: true,
                    roomCode: true,
                    status: true,
                },
            },
            worker: {
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                },
            },
        },
        orderBy: { requestedAt: "desc" },
    });
    return res.json(requests);
});
app.post("/api/rooms/:roomId/read", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
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
app.post("/api/rooms/join", authMiddleware, requireRole(client_1.Role.WORKER), async (req, res) => {
    const current = await getCurrentUser(req);
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomCode = getOptionalNonEmptyText(req.body.roomCode)?.toUpperCase();
    if (!roomCode)
        return res.status(400).json({ error: "Missing room code" });
    const room = await prisma.room.findUnique({ where: { roomCode } });
    if (!room)
        return res.status(404).json({ error: "Room not found" });
    if (room.status !== client_1.RoomStatus.ACTIVE) {
        return res.status(403).json({ error: "Room is closed" });
    }
    const membership = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId: room.id,
                userId: current.id,
            },
        },
    });
    if (membership) {
        return res.json({
            roomId: room.id,
            role: membership.role,
            status: "accepted",
        });
    }
    const existingRequest = await prisma.roomJoinRequest.findUnique({
        where: {
            roomId_workerId: {
                roomId: room.id,
                workerId: current.id,
            },
        },
    });
    const request = existingRequest
        ? await prisma.roomJoinRequest.update({
            where: { id: existingRequest.id },
            data: {
                status: client_1.JoinRequestStatus.PENDING,
                requestedAt: new Date(),
                decidedAt: null,
                decidedById: null,
            },
        })
        : await prisma.roomJoinRequest.create({
            data: {
                roomId: room.id,
                workerId: current.id,
                status: client_1.JoinRequestStatus.PENDING,
            },
        });
    return res.status(202).json({
        roomId: room.id,
        requestId: request.id,
        status: "pending",
    });
});
app.post("/api/join-requests/:requestId/decision", authMiddleware, requireRole(client_1.Role.OWNER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const requestId = getSingleParam(req.params.requestId);
    const decision = getOptionalNonEmptyText(req.body.decision)?.toLowerCase();
    if (!requestId || (decision !== "accept" && decision !== "refuse")) {
        return res.status(400).json({ error: "Invalid request or decision" });
    }
    const request = await prisma.roomJoinRequest.findUnique({
        where: { id: requestId },
        include: {
            room: {
                select: {
                    id: true,
                    ownerId: true,
                    status: true,
                    name: true,
                    roomCode: true,
                },
            },
            worker: {
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                },
            },
        },
    });
    if (!request) {
        return res.status(404).json({ error: "Join request not found" });
    }
    if (request.room.ownerId !== current.userId) {
        return res.status(403).json({ error: "Not allowed for this room" });
    }
    if (request.status !== client_1.JoinRequestStatus.PENDING) {
        return res.status(400).json({ error: "Join request already processed" });
    }
    const now = new Date();
    if (decision === "accept") {
        if (request.room.status !== client_1.RoomStatus.ACTIVE) {
            return res.status(403).json({ error: "Room is closed" });
        }
        await prisma.roomMember.upsert({
            where: {
                roomId_userId: {
                    roomId: request.roomId,
                    userId: request.workerId,
                },
            },
            create: {
                roomId: request.roomId,
                userId: request.workerId,
                role: client_1.Role.WORKER,
                lastSeenAt: now,
            },
            update: {
                role: client_1.Role.WORKER,
            },
        });
    }
    const updatedRequest = await prisma.roomJoinRequest.update({
        where: { id: request.id },
        data: {
            status: decision === "accept"
                ? client_1.JoinRequestStatus.ACCEPTED
                : client_1.JoinRequestStatus.REFUSED,
            decidedAt: now,
            decidedById: current.userId,
        },
        include: {
            room: {
                select: {
                    id: true,
                    name: true,
                    roomCode: true,
                    status: true,
                },
            },
            worker: {
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                },
            },
        },
    });
    return res.json(updatedRequest);
});
app.put("/api/rooms/:roomId/status", authMiddleware, requireRole(client_1.Role.OWNER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership || membership.role !== client_1.Role.OWNER) {
        return res.status(403).json({ error: "Only room owner can update status" });
    }
    const nextStatusRaw = toUpperText(req.body.status);
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
});
// Worker-Supplier links
app.post("/api/rooms/:roomId/workers/:workerId/link-supplier", authMiddleware, requireRole(client_1.Role.WORKER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    const workerId = getSingleParam(req.params.workerId);
    const supplierId = getOptionalNonEmptyText(req.body.supplierId);
    if (!roomId || !workerId || !supplierId) {
        return res.status(400).json({ error: "Missing roomId, workerId or supplierId" });
    }
    const currentMembership = await getMembership(roomId, current.userId);
    if (!currentMembership) {
        return res.status(403).json({ error: "Not a member of this room" });
    }
    if (currentMembership.role !== client_1.Role.WORKER) {
        return res.status(403).json({ error: "Only workers can add suppliers in MVP" });
    }
    if (current.userId !== workerId) {
        return res.status(403).json({ error: "Worker can only link suppliers to their own scope" });
    }
    const room = await getRoomOrNull(roomId);
    if (!room)
        return res.status(404).json({ error: "Room not found" });
    if (room.status !== client_1.RoomStatus.ACTIVE) {
        return res.status(403).json({ error: "Room is closed" });
    }
    const workerMembership = await getMembership(roomId, workerId);
    if (!workerMembership || workerMembership.role !== client_1.Role.WORKER) {
        return res.status(400).json({ error: "workerId must belong to a WORKER in the room" });
    }
    const supplier = await prisma.user.findUnique({ where: { id: supplierId } });
    if (!supplier || supplier.defaultRole !== client_1.Role.SUPPLIER) {
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
            role: client_1.Role.SUPPLIER,
            lastSeenAt: new Date(),
        },
        update: {
            role: client_1.Role.SUPPLIER,
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
            status: client_1.LinkStatus.ACTIVE,
        },
        update: {
            status: client_1.LinkStatus.ACTIVE,
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
});
app.post("/api/rooms/:roomId/suppliers", authMiddleware, requireRole(client_1.Role.WORKER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    const supplierId = getOptionalNonEmptyText(req.body.supplierId);
    if (!roomId || !supplierId) {
        return res.status(400).json({ error: "Missing roomId or supplierId" });
    }
    const currentMembership = await getMembership(roomId, current.userId);
    if (!currentMembership || currentMembership.role !== client_1.Role.WORKER) {
        return res.status(403).json({ error: "Only room workers can add suppliers" });
    }
    const room = await getRoomOrNull(roomId);
    if (!room)
        return res.status(404).json({ error: "Room not found" });
    if (room.status !== client_1.RoomStatus.ACTIVE) {
        return res.status(403).json({ error: "Room is closed" });
    }
    const supplier = await prisma.user.findUnique({ where: { id: supplierId } });
    if (!supplier || supplier.defaultRole !== client_1.Role.SUPPLIER) {
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
            role: client_1.Role.SUPPLIER,
            lastSeenAt: new Date(),
        },
        update: {
            role: client_1.Role.SUPPLIER,
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
            status: client_1.LinkStatus.ACTIVE,
        },
        update: {
            status: client_1.LinkStatus.ACTIVE,
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
});
app.get("/api/rooms/:roomId/worker-suppliers", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership) {
        return res.status(403).json({ error: "Not a member of this room" });
    }
    const where = {
        roomId,
        status: client_1.LinkStatus.ACTIVE,
    };
    const query = req.query;
    if (membership.role === client_1.Role.SUPPLIER) {
        where.supplierId = current.userId;
    }
    const workerId = getOptionalNonEmptyText(query.workerId);
    const supplierId = getOptionalNonEmptyText(query.supplierId);
    if (workerId && membership.role !== client_1.Role.SUPPLIER)
        where.workerId = workerId;
    if (supplierId && membership.role !== client_1.Role.SUPPLIER)
        where.supplierId = supplierId;
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
app.get("/api/rooms/:roomId/worker-suppliers/me", authMiddleware, requireRole(client_1.Role.WORKER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership || membership.role !== client_1.Role.WORKER) {
        return res.status(403).json({ error: "Not a WORKER in this room" });
    }
    const links = await prisma.workerSupplierLink.findMany({
        where: {
            roomId,
            workerId: current.userId,
            status: client_1.LinkStatus.ACTIVE,
        },
        include: {
            supplier: {
                select: { id: true, fullName: true, phone: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    return res.json(links);
});
app.get("/api/rooms/:roomId/suppliers", authMiddleware, requireRole(client_1.Role.OWNER, client_1.Role.WORKER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership || (membership.role !== client_1.Role.OWNER && membership.role !== client_1.Role.WORKER)) {
        return res.status(403).json({ error: "Not allowed for this room" });
    }
    const links = await prisma.workerSupplierLink.findMany({
        where: {
            roomId,
            ...(membership.role === client_1.Role.WORKER ? { workerId: current.userId } : {}),
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
});
app.delete("/api/rooms/:roomId/suppliers/:supplierId", authMiddleware, requireRole(client_1.Role.OWNER, client_1.Role.WORKER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    const supplierId = getSingleParam(req.params.supplierId);
    if (!roomId || !supplierId) {
        return res.status(400).json({ error: "Invalid roomId or supplierId" });
    }
    const membership = await getMembership(roomId, current.userId);
    if (!membership || (membership.role !== client_1.Role.OWNER && membership.role !== client_1.Role.WORKER)) {
        return res.status(403).json({ error: "Not allowed for this room" });
    }
    const where = {
        roomId,
        supplierId,
        status: client_1.LinkStatus.ACTIVE,
        ...(membership.role === client_1.Role.WORKER ? { workerId: current.userId } : {}),
    };
    const activeLinks = await prisma.workerSupplierLink.findMany({
        where,
        select: { id: true },
    });
    if (activeLinks.length === 0) {
        return res.status(404).json({ error: "Supplier link not found" });
    }
    await prisma.workerSupplierLink.updateMany({
        where,
        data: {
            status: client_1.LinkStatus.DISABLED,
        },
    });
    const remainingActiveLinks = await prisma.workerSupplierLink.count({
        where: {
            roomId,
            supplierId,
            status: client_1.LinkStatus.ACTIVE,
        },
    });
    if (remainingActiveLinks === 0) {
        await prisma.roomMember.deleteMany({
            where: {
                roomId,
                userId: supplierId,
                role: client_1.Role.SUPPLIER,
            },
        });
    }
    await refreshRoomCaches(roomId);
    return res.status(204).send();
});
app.delete("/api/rooms/:roomId/members/:userId", authMiddleware, requireRole(client_1.Role.OWNER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    const userId = getSingleParam(req.params.userId);
    if (!roomId || !userId) {
        return res.status(400).json({ error: "Invalid roomId or userId" });
    }
    const ownerMembership = await getMembership(roomId, current.userId);
    if (!ownerMembership || ownerMembership.role !== client_1.Role.OWNER) {
        return res.status(403).json({ error: "Only room owner can remove members" });
    }
    if (userId === current.userId) {
        return res.status(400).json({ error: "Owner cannot remove themselves" });
    }
    const targetMembership = await getMembership(roomId, userId);
    if (!targetMembership) {
        return res.status(404).json({ error: "Member not found" });
    }
    if (targetMembership.role === client_1.Role.OWNER) {
        return res.status(400).json({ error: "Cannot remove room owner" });
    }
    await prisma.roomMember.delete({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });
    if (targetMembership.role === client_1.Role.WORKER) {
        await prisma.workerSupplierLink.updateMany({
            where: {
                roomId,
                workerId: userId,
                status: client_1.LinkStatus.ACTIVE,
            },
            data: {
                status: client_1.LinkStatus.DISABLED,
            },
        });
    }
    if (targetMembership.role === client_1.Role.SUPPLIER) {
        await prisma.workerSupplierLink.updateMany({
            where: {
                roomId,
                supplierId: userId,
                status: client_1.LinkStatus.ACTIVE,
            },
            data: {
                status: client_1.LinkStatus.DISABLED,
            },
        });
    }
    await refreshRoomCaches(roomId);
    return res.status(204).send();
});
// Supplier profile
app.get("/api/supplier/profile", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const profile = await prisma.supplierStoreProfile.findUnique({
        where: { supplierId: current.userId },
    });
    return res.json(profile ?? null);
});
app.put("/api/supplier/profile", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const body = req.body;
    const storeName = getOptionalNonEmptyText(body.storeName);
    const phone = normalizePhone(body.phone);
    const address = getOptionalNonEmptyText(body.address);
    if (!storeName || !phone || !address) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: "Invalid phone format" });
    }
    const createData = {
        supplierId: current.userId,
        storeName,
        phone,
        address,
        logoUrl: getNullableText(body.logoUrl),
        ice: getNullableText(body.ice),
        rc: getNullableText(body.rc),
        footerNote: getNullableText(body.footerNote),
    };
    const updateData = {
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
});
// Documents
app.post("/api/documents", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const body = req.body;
    try {
        const doc = await createDocumentForSupplier(current, body);
        return res.json(doc);
    }
    catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to create document" });
    }
});
app.get("/api/documents/personal", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const docs = await prisma.document.findMany({
        where: {
            supplierId: current.userId,
            isPersonal: true,
        },
        include: documentInclude,
        orderBy: { createdAt: "desc" },
    });
    return res.json(docs);
});
app.post("/api/rooms/:roomId/documents", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership || membership.role !== client_1.Role.SUPPLIER) {
        return res.status(403).json({ error: "Supplier is not a member of this room" });
    }
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { status: true },
    });
    if (!room)
        return res.status(404).json({ error: "Room not found" });
    if (room.status !== client_1.RoomStatus.ACTIVE) {
        return res.status(403).json({ error: "Room is closed" });
    }
    const body = req.body;
    let workerId = getOptionalNonEmptyText(body.workerId);
    if (!workerId) {
        const links = await prisma.workerSupplierLink.findMany({
            where: {
                roomId,
                supplierId: current.userId,
                status: client_1.LinkStatus.ACTIVE,
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
    }
    catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to create room document" });
    }
});
app.get("/api/me/documents", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const scope = getOptionalNonEmptyText(req.query.scope)?.toLowerCase() ?? "personal";
    const where = {
        supplierId: current.userId,
    };
    if (scope === "personal") {
        where.isPersonal = true;
    }
    else if (scope === "room") {
        where.isPersonal = false;
    }
    const docs = await prisma.document.findMany({
        where,
        include: documentInclude,
        orderBy: { createdAt: "desc" },
    });
    return res.json(docs);
});
app.post("/api/me/documents", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const body = req.body;
    try {
        const payload = {
            ...body,
            isPersonal: true,
        };
        const doc = await createDocumentForSupplier(current, {
            ...payload,
        });
        return res.json(doc);
    }
    catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to create personal document" });
    }
});
app.get("/api/rooms/:roomId/documents", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
    const membership = await getMembership(roomId, current.userId);
    if (!membership) {
        return res.status(403).json({ error: "Not a member of this room" });
    }
    let docs;
    if (membership.role === client_1.Role.OWNER) {
        docs = await prisma.document.findMany({
            where: { roomId },
            include: documentInclude,
            orderBy: { createdAt: "asc" },
        });
    }
    else if (membership.role === client_1.Role.WORKER) {
        const links = await prisma.workerSupplierLink.findMany({
            where: {
                roomId,
                workerId: current.userId,
                status: client_1.LinkStatus.ACTIVE,
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
    }
    else {
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
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const roomId = getSingleParam(req.params.roomId);
    if (!roomId)
        return res.status(400).json({ error: "Invalid roomId" });
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
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const id = getSingleParam(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid document id" });
    const doc = await prisma.document.findUnique({
        where: { id },
        include: documentInclude,
    });
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    const allowed = await canAccessDocument(current, doc);
    if (!allowed)
        return res.status(403).json({ error: "Forbidden" });
    return res.json(doc);
});
app.delete("/api/documents/:id", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const id = getSingleParam(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid document id" });
    const doc = await prisma.document.findUnique({
        where: { id },
        select: {
            id: true,
            roomId: true,
            supplierId: true,
            isPersonal: true,
        },
    });
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    if (doc.supplierId !== current.userId || !doc.isPersonal) {
        return res.status(403).json({ error: "Only your personal documents can be deleted" });
    }
    await prisma.attachment.deleteMany({ where: { documentId: id } });
    await prisma.documentItem.deleteMany({ where: { documentId: id } });
    await prisma.document.delete({ where: { id } });
    if (doc.roomId) {
        await refreshRoomCaches(doc.roomId);
    }
    return res.status(204).send();
});
app.get("/api/documents/:id/share", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const id = getSingleParam(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid document id" });
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
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    const allowed = await canAccessDocument(current, doc);
    if (!allowed)
        return res.status(403).json({ error: "Forbidden" });
    const apiBase = PUBLIC_API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
    const shareToken = signDocumentShareToken(doc.id);
    const pdfUrl = `${apiBase}/api/public/documents/${doc.id}/pdf?shareToken=${encodeURIComponent(shareToken)}`;
    const fullDoc = await prisma.document.findUnique({
        where: { id },
        include: documentInclude,
    });
    if (!fullDoc)
        return res.status(404).json({ error: "Not found" });
    const message = encodeURIComponent(`${buildDocumentShareText(fullDoc)}\n${pdfUrl}`);
    const whatsappUrl = `https://wa.me/?text=${message}`;
    return res.json({
        pdfUrl,
        whatsappUrl,
    });
});
app.post("/api/documents/:id/export-pdf", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const id = getSingleParam(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid document id" });
    const doc = await prisma.document.findUnique({
        where: { id },
        select: {
            id: true,
            roomId: true,
            supplierId: true,
            isPersonal: true,
        },
    });
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    const allowed = await canAccessDocument(current, doc);
    if (!allowed)
        return res.status(403).json({ error: "Forbidden" });
    const apiBase = PUBLIC_API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
    const authToken = getBearerToken(req);
    const suffix = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
    return res.json({
        documentId: id,
        pdfUrl: `${apiBase}/api/documents/${id}/pdf${suffix}`,
    });
});
app.post("/api/me/documents/:id/export-pdf", authMiddleware, requireRole(client_1.Role.SUPPLIER), async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const id = getSingleParam(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid document id" });
    const doc = await prisma.document.findUnique({
        where: { id },
        select: {
            id: true,
            supplierId: true,
            isPersonal: true,
        },
    });
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    if (doc.supplierId !== current.userId || !doc.isPersonal) {
        return res.status(403).json({ error: "Only your personal documents can be exported here" });
    }
    const apiBase = PUBLIC_API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
    const authToken = getBearerToken(req);
    const suffix = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
    return res.json({
        documentId: id,
        pdfUrl: `${apiBase}/api/documents/${id}/pdf${suffix}`,
    });
});
app.get("/api/documents/:id/pdf", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
    const id = getSingleParam(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid document id" });
    const doc = await prisma.document.findUnique({
        where: { id },
        include: documentInclude,
    });
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    const allowed = await canAccessDocument(current, doc);
    if (!allowed)
        return res.status(403).json({ error: "Forbidden" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="boon-${doc.id}.pdf"`);
    const pdf = new pdfkit_1.default({ size: "A4", margin: 40 });
    pdf.pipe(res);
    await renderDocumentPdf(pdf, doc);
    pdf.end();
});
app.get("/api/public/documents/:id/pdf", async (req, res) => {
    const id = getSingleParam(req.params.id);
    const shareToken = getOptionalNonEmptyText(req.query.shareToken);
    if (!id || !shareToken) {
        return res.status(400).json({ error: "Missing document id or share token" });
    }
    try {
        const valid = verifyDocumentShareToken(shareToken, id);
        if (!valid) {
            return res.status(401).json({ error: "Invalid share token" });
        }
    }
    catch {
        return res.status(401).json({ error: "Invalid share token" });
    }
    const doc = await prisma.document.findUnique({
        where: { id },
        include: documentInclude,
    });
    if (!doc)
        return res.status(404).json({ error: "Not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="boon-${doc.id}.pdf"`);
    const pdf = new pdfkit_1.default({ size: "A4", margin: 40 });
    pdf.pipe(res);
    await renderDocumentPdf(pdf, doc);
    pdf.end();
});
app.get("/api/analytics/overview", authMiddleware, async (req, res) => {
    const current = req.user;
    if (!current)
        return res.status(401).json({ error: "Unauthorized" });
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
    const byTypeMap = new Map();
    const byCategoryMap = new Map();
    const bySupplierMap = new Map();
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
        }
        else {
            roomTotal += amount;
        }
        if (createdAt >= dayStart)
            todayTotal += amount;
        if (createdAt >= weekStart)
            weekTotal += amount;
        if (createdAt >= monthStart)
            monthTotal += amount;
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
app.listen(PORT, "0.0.0.0", () => {
    console.log(`BOON API listening on http://0.0.0.0:${PORT}`);
    refreshAllRoomCaches().catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Failed to refresh room caches at startup:", error);
    });
});
//# sourceMappingURL=server.js.map