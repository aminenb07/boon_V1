import {
  API_BASE,
  configureAuthSessionHandlers,
  restAddSupplierToRoom,
  restChangeMyPassword,
  restCreateDocument,
  restCreateMyDocument,
  restCreateRoom,
  restCreateRoomDocument,
  restDecideJoinRequest,
  restDeleteDocument,
  restExportDocumentPdf,
  restGetAnalyticsOverview,
  restGetDocument,
  restGetDocumentPdfUrl,
  restGetDocumentShare,
  restGetMe,
  restGetRoomDetails,
  restGetRoomStreamUrl,
  restGetSupplierProfile,
  restJoinRoom,
  restLinkSupplier,
  restListJoinRequests,
  restListMyDocuments,
  restListMyWorkerSuppliers,
  restListPersonalDocuments,
  restListRoomDocuments,
  restListRoomMembers,
  restListRoomSuppliers,
  restListRooms,
  restListRoomsWithFilters,
  restListWorkerSuppliers,
  restLogin,
  restMarkRoomRead,
  restRegister,
  restRefreshAuth,
  restRemoveRoomMember,
  restResendVerificationCode,
  restSearchSuppliers,
  restSubscribeRoomDocuments,
  restUnlinkRoomSupplier,
  restUpdateMe,
  restUpdateRoomStatus,
  restUpsertSupplierProfile,
  restVerifyPhone,
} from "./api-rest";

export { configureAuthSessionHandlers };

// This type defines the data shape for role.
export type Role = "OWNER" | "WORKER" | "SUPPLIER";
// This type defines the data shape for document type.
export type DocumentType = "RECEIPT" | "INVOICE" | "QUOTE";
// This type defines the data shape for room status.
export type RoomStatus = "ACTIVE" | "CLOSED";
// This type defines the data shape for user status.
export type UserStatus = "ACTIVE" | "DISABLED";
// This type defines the data shape for join request status.
export type JoinRequestStatus = "PENDING" | "ACCEPTED" | "REFUSED";

// This type defines the data shape for auth user.
export type AuthUser = {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: Role;
  phoneVerifiedAt: string | null;
  status: UserStatus;
};

// This type defines the data shape for auth response.
export type AuthResponse = {
  token: string;
  refreshToken: string;
  expiresInSeconds?: number;
  user: AuthUser;
};

// This type defines the data shape for verification response.
export type VerificationResponse = {
  verificationRequired: true;
  phone: string;
  maskedPhone: string;
  expiresInSeconds: number;
  devCode?: string;
  user?: AuthUser;
};

// This type defines the data shape for join room response.
export type JoinRoomResponse = {
  roomId: string;
  requestId?: string;
  role?: Role;
  status: "pending" | "accepted";
};

// This type defines the data shape for room join request.
export type RoomJoinRequest = {
  id: string;
  roomId: string;
  workerId: string;
  status: JoinRequestStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedById: string | null;
  room: {
    id: string;
    name: string;
    roomCode: string;
    status: RoomStatus;
  };
  worker: {
    id: string;
    fullName: string;
    phone: string;
  };
};

// This type defines the data shape for room summary.
export type RoomSummary = {
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

// This type defines the data shape for room details.
export type RoomDetails = {
  id: string;
  name: string;
  roomCode: string;
  status: RoomStatus;
  roleInRoom: Role;
  ownerId: string;
  lastMessagePreview: string | null;
  lastMessageTime: string | null;
  membersCount: number;
  cachedDocsCount: number;
  totals: {
    owner: number;
    workerScope: number;
    supplierScope: number;
  };
  docsCountByScope: {
    workerScope: number;
    supplierScope: number;
  };
};

// This type defines the data shape for room member.
export type RoomMember = {
  id: string;
  roomId: string;
  userId: string;
  role: Role;
  lastSeenAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    defaultRole: Role;
  };
};

// This type defines the data shape for supplier profile.
export type SupplierProfile = {
  id: string;
  supplierId: string;
  logoUrl: string | null;
  storeName: string;
  phone: string;
  address: string;
  ice: string | null;
  rc: string | null;
  footerNote: string | null;
  createdAt: string;
  updatedAt: string;
};

// This type defines the data shape for supplier user.
export type SupplierUser = {
  id: string;
  fullName: string;
  phone: string;
};

// This type defines the data shape for worker supplier link.
export type WorkerSupplierLink = {
  id: string;
  roomId: string;
  workerId: string;
  supplierId: string;
  status?: "ACTIVE" | "DISABLED";
  cachedTotal?: number;
  cachedDocsCount?: number;
  lastActivityAt?: string | null;
  createdAt: string;
  worker?: {
    id: string;
    fullName: string;
    phone: string;
  };
  supplier?: {
    id: string;
    fullName: string;
    phone: string;
  };
};

// This type defines the data shape for document item.
export type DocumentItem = {
  id: string;
  productName: string;
  qty: number;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
  position: number;
};

// This type defines the data shape for attachment.
export type Attachment = {
  id: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
};

// This type defines the data shape for document record.
export type DocumentRecord = {
  id: string;
  type: DocumentType;
  roomId: string | null;
  workerId: string | null;
  supplierId: string;
  quickAmount: number | null;
  category: string | null;
  note: string | null;
  currency: string;
  grandTotal: number;
  isPersonal: boolean;
  immutable: boolean;
  createdAt: string;
  supplier: {
    id: string;
    fullName: string;
    phone: string;
  };
  storeProfile: SupplierProfile;
  items: DocumentItem[];
  attachments: Attachment[];
};

// This type defines the data shape for create document input.
export type CreateDocumentInput = {
  type: DocumentType;
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

// This type defines the data shape for share payload.
export type SharePayload = {
  pdfUrl: string;
  whatsappUrl: string;
  message?: string;
};

// This type defines the data shape for analytics overview.
export type AnalyticsOverview = {
  totals: {
    today: number;
    week: number;
    month: number;
    all: number;
    personal: number;
    room: number;
  };
  documentsCount: number;
  roomsCount: number;
  byType: Array<{
    type: DocumentType;
    count: number;
    amount: number;
  }>;
  byCategory: Array<{
    category: string;
    count: number;
    amount: number;
  }>;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    count: number;
    amount: number;
  }>;
  last7Days: Array<{
    date: string;
    label: string;
    amount: number;
    count: number;
  }>;
};

// This function gets document pdf url.
export function getDocumentPdfUrl(documentId: string, token: string) {
  return restGetDocumentPdfUrl(documentId, token);
}

// This function gets room stream url.
export function getRoomStreamUrl(roomId: string, token: string) {
  return restGetRoomStreamUrl(roomId, token);
}

// This function subscribes to room documents.
export function subscribeRoomDocuments(
  token: string,
  roomId: string,
  onDocuments: (documents: DocumentRecord[]) => void,
  onError?: (error: Error) => void,
) {
  return restSubscribeRoomDocuments(token, roomId, onDocuments, onError);
}

// This function registers.
export async function register(payload: {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: Role;
}) {
  return restRegister(payload);
}

// This function logs in.
export async function login(payload: { identifier: string; password: string }) {
  return restLogin(payload);
}

// This function refreshes auth.
export async function refreshAuth(refreshToken: string) {
  return restRefreshAuth(refreshToken);
}

// This function verifies phone.
export async function verifyPhone(payload: { phone: string; code: string }) {
  return restVerifyPhone(payload);
}

// This function resends verification code.
export async function resendVerificationCode(payload: { phone: string }) {
  return restResendVerificationCode(payload);
}

// This function gets me.
export async function getMe(token: string) {
  return restGetMe(token);
}

// This function updates me.
export async function updateMe(
  token: string,
  payload: { fullName: string; email?: string | null },
) {
  return restUpdateMe(token, payload);
}

// This function changes my password.
export async function changeMyPassword(
  token: string,
  payload: { currentPassword: string; newPassword: string },
) {
  return restChangeMyPassword(token, payload);
}

// This function lists rooms.
export async function listRooms(token: string) {
  return restListRooms(token);
}

// This function lists rooms with filters.
export async function listRoomsWithFilters(
  token: string,
  params?: { search?: string; filter?: "all" | "active" | "closed" },
) {
  return restListRoomsWithFilters(token, params);
}

// This function gets room details.
export async function getRoomDetails(token: string, roomId: string) {
  return restGetRoomDetails(token, roomId);
}

// This function searches suppliers.
export async function searchSuppliers(token: string, query?: string) {
  return restSearchSuppliers(token, query);
}

// This function creates room.
export async function createRoom(token: string, name: string) {
  return restCreateRoom(token, name);
}

// This function joins room.
export async function joinRoom(token: string, roomCode: string) {
  return restJoinRoom(token, roomCode);
}

// This function lists join requests.
export async function listJoinRequests(token: string) {
  return restListJoinRequests(token);
}

// This function decides join request.
export async function decideJoinRequest(
  token: string,
  requestId: string,
  decision: "accept" | "refuse",
) {
  return restDecideJoinRequest(token, requestId, decision);
}

// This function updates room status.
export async function updateRoomStatus(token: string, roomId: string, status: RoomStatus) {
  return restUpdateRoomStatus(token, roomId, status);
}

// This function lists room members.
export async function listRoomMembers(token: string, roomId: string) {
  return restListRoomMembers(token, roomId);
}

// This function removes room member.
export async function removeRoomMember(token: string, roomId: string, userId: string) {
  return restRemoveRoomMember(token, roomId, userId);
}

// This function marks room read.
export async function markRoomRead(token: string, roomId: string) {
  return restMarkRoomRead(token, roomId);
}

// This function links supplier.
export async function linkSupplier(
  token: string,
  roomId: string,
  workerId: string,
  supplierId: string,
) {
  return restLinkSupplier(token, roomId, workerId, supplierId);
}

// This function adds supplier to room.
export async function addSupplierToRoom(token: string, roomId: string, supplierId: string) {
  return restAddSupplierToRoom(token, roomId, supplierId);
}

// This function unlinks room supplier.
export async function unlinkRoomSupplier(token: string, roomId: string, supplierId: string) {
  return restUnlinkRoomSupplier(token, roomId, supplierId);
}

// This function lists worker suppliers.
export async function listWorkerSuppliers(
  token: string,
  roomId: string,
  filters?: { workerId?: string; supplierId?: string },
) {
  return restListWorkerSuppliers(token, roomId, filters);
}

// This function lists my worker suppliers.
export async function listMyWorkerSuppliers(token: string, roomId: string) {
  return restListMyWorkerSuppliers(token, roomId);
}

// This function lists room suppliers.
export async function listRoomSuppliers(token: string, roomId: string) {
  return restListRoomSuppliers(token, roomId);
}

// This function gets supplier profile.
export async function getSupplierProfile(token: string) {
  return restGetSupplierProfile(token);
}

// This function creates or updates supplier profile.
export async function upsertSupplierProfile(
  token: string,
  payload: {
    logoUrl?: string;
    storeName: string;
    phone: string;
    address: string;
    ice?: string;
    rc?: string;
    footerNote?: string;
  },
) {
  return restUpsertSupplierProfile(token, payload);
}

// This function creates document.
export async function createDocument(token: string, payload: CreateDocumentInput) {
  return restCreateDocument(token, payload);
}

// This function creates room document.
export async function createRoomDocument(
  token: string,
  roomId: string,
  payload: Omit<CreateDocumentInput, "roomId" | "isPersonal">,
) {
  return restCreateRoomDocument(token, roomId, payload);
}

// This function lists room documents.
export async function listRoomDocuments(token: string, roomId: string) {
  return restListRoomDocuments(token, roomId);
}

// This function lists personal documents.
export async function listPersonalDocuments(token: string) {
  return restListPersonalDocuments(token);
}

// This function lists my documents.
export async function listMyDocuments(
  token: string,
  scope: "all" | "room" | "personal" = "personal",
) {
  return restListMyDocuments(token, scope);
}

// This function creates my document.
export async function createMyDocument(
  token: string,
  payload: Omit<CreateDocumentInput, "roomId" | "workerId" | "isPersonal">,
) {
  return restCreateMyDocument(token, payload);
}

// This function gets document.
export async function getDocument(token: string, documentId: string) {
  return restGetDocument(token, documentId);
}

// This function deletes document.
export async function deleteDocument(token: string, documentId: string) {
  return restDeleteDocument(token, documentId);
}

// This function gets document share.
export async function getDocumentShare(token: string, documentId: string) {
  return restGetDocumentShare(token, documentId);
}

// This function exports document pdf.
export async function exportDocumentPdf(token: string, documentId: string) {
  return restExportDocumentPdf(token, documentId);
}

// This function gets analytics overview.
export async function getAnalyticsOverview(token: string) {
  return restGetAnalyticsOverview(token);
}
