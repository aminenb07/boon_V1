export const API_BASE =
  import.meta.env.VITE_API_BASE?.trim() || "http://localhost:4000/api";

export type Role = "OWNER" | "WORKER" | "SUPPLIER";
export type DocumentType = "RECEIPT" | "INVOICE" | "QUOTE";
export type RoomStatus = "ACTIVE" | "CLOSED";

export type AuthUser = {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

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

export type SupplierUser = {
  id: string;
  fullName: string;
  phone: string;
};

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

export type DocumentItem = {
  id: string;
  productName: string;
  qty: number;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
  position: number;
};

export type Attachment = {
  id: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
};

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

export type SharePayload = {
  pdfUrl: string;
  whatsappUrl: string;
};

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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore invalid json
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getDocumentPdfUrl(documentId: string, token: string) {
  const encoded = encodeURIComponent(token);
  return `${API_BASE}/documents/${documentId}/pdf?token=${encoded}`;
}

export function getRoomStreamUrl(roomId: string, token: string) {
  const encoded = encodeURIComponent(token);
  return `${API_BASE}/rooms/${roomId}/stream?token=${encoded}`;
}

export async function register(payload: {
  phone: string;
  password: string;
  fullName: string;
  role: Role;
}) {
  return apiRequest<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function login(payload: { phone: string; password: string }) {
  return apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function getMe(token: string) {
  return apiRequest<AuthUser>("/me", {}, token);
}

export async function updateMe(
  token: string,
  payload: { fullName: string; phone: string },
) {
  return apiRequest<AuthUser>(
    "/me/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function changeMyPassword(
  token: string,
  payload: { currentPassword: string; newPassword: string },
) {
  return apiRequest<void>(
    "/me/password",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function listRooms(token: string) {
  return apiRequest<RoomSummary[]>("/rooms", {}, token);
}

export async function listRoomsWithFilters(
  token: string,
  params?: { search?: string; filter?: "all" | "active" | "closed" },
) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.filter) query.set("filter", params.filter);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<RoomSummary[]>(`/rooms${suffix}`, {}, token);
}

export async function getRoomDetails(token: string, roomId: string) {
  return apiRequest<RoomDetails>(`/rooms/${roomId}`, {}, token);
}

export async function searchSuppliers(token: string, query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  return apiRequest<SupplierUser[]>(`/users/suppliers${suffix}`, {}, token);
}

export async function createRoom(token: string, name: string) {
  return apiRequest<RoomSummary>(
    "/rooms",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    token,
  );
}

export async function joinRoom(token: string, roomCode: string) {
  return apiRequest<{ roomId: string; role: Role }>(
    "/rooms/join",
    {
      method: "POST",
      body: JSON.stringify({ roomCode }),
    },
    token,
  );
}

export async function updateRoomStatus(
  token: string,
  roomId: string,
  status: RoomStatus,
) {
  return apiRequest<{ id: string; status: RoomStatus; name: string; roomCode: string }>(
    `/rooms/${roomId}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export async function listRoomMembers(token: string, roomId: string) {
  return apiRequest<RoomMember[]>(`/rooms/${roomId}/members`, {}, token);
}

export async function markRoomRead(token: string, roomId: string) {
  return apiRequest<void>(
    `/rooms/${roomId}/read`,
    {
      method: "POST",
    },
    token,
  );
}

export async function linkSupplier(
  token: string,
  roomId: string,
  workerId: string,
  supplierId: string,
) {
  return apiRequest<WorkerSupplierLink>(
    `/rooms/${roomId}/workers/${workerId}/link-supplier`,
    {
      method: "POST",
      body: JSON.stringify({ supplierId }),
    },
    token,
  );
}

export async function addSupplierToRoom(
  token: string,
  roomId: string,
  supplierId: string,
) {
  return apiRequest<WorkerSupplierLink>(
    `/rooms/${roomId}/suppliers`,
    {
      method: "POST",
      body: JSON.stringify({ supplierId }),
    },
    token,
  );
}

export async function listWorkerSuppliers(
  token: string,
  roomId: string,
  filters?: { workerId?: string; supplierId?: string },
) {
  const query = new URLSearchParams();
  if (filters?.workerId) query.set("workerId", filters.workerId);
  if (filters?.supplierId) query.set("supplierId", filters.supplierId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<WorkerSupplierLink[]>(
    `/rooms/${roomId}/worker-suppliers${suffix}`,
    {},
    token,
  );
}

export async function listMyWorkerSuppliers(token: string, roomId: string) {
  return apiRequest<WorkerSupplierLink[]>(
    `/rooms/${roomId}/worker-suppliers/me`,
    {},
    token,
  );
}

export async function listRoomSuppliers(token: string, roomId: string) {
  return apiRequest<WorkerSupplierLink[]>(
    `/rooms/${roomId}/suppliers`,
    {},
    token,
  );
}

export async function getSupplierProfile(token: string) {
  return apiRequest<SupplierProfile | null>("/supplier/profile", {}, token);
}

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
  return apiRequest<SupplierProfile>(
    "/supplier/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function createDocument(token: string, payload: CreateDocumentInput) {
  return apiRequest<DocumentRecord>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function createRoomDocument(
  token: string,
  roomId: string,
  payload: Omit<CreateDocumentInput, "roomId" | "isPersonal">,
) {
  return apiRequest<DocumentRecord>(
    `/rooms/${roomId}/documents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function listRoomDocuments(token: string, roomId: string) {
  return apiRequest<DocumentRecord[]>(`/rooms/${roomId}/documents`, {}, token);
}

export async function listPersonalDocuments(token: string) {
  return apiRequest<DocumentRecord[]>("/documents/personal", {}, token);
}

export async function listMyDocuments(
  token: string,
  scope: "all" | "room" | "personal" = "personal",
) {
  return apiRequest<DocumentRecord[]>(
    `/me/documents?scope=${encodeURIComponent(scope)}`,
    {},
    token,
  );
}

export async function createMyDocument(
  token: string,
  payload: Omit<CreateDocumentInput, "roomId" | "workerId" | "isPersonal">,
) {
  return apiRequest<DocumentRecord>(
    "/me/documents",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getDocument(token: string, documentId: string) {
  return apiRequest<DocumentRecord>(`/documents/${documentId}`, {}, token);
}

export async function getDocumentShare(token: string, documentId: string) {
  return apiRequest<SharePayload>(`/documents/${documentId}/share`, {}, token);
}

export async function exportDocumentPdf(token: string, documentId: string) {
  return apiRequest<{ documentId: string; pdfUrl: string }>(
    `/documents/${documentId}/export-pdf`,
    { method: "POST" },
    token,
  );
}

export async function getAnalyticsOverview(token: string) {
  return apiRequest<AnalyticsOverview>("/analytics/overview", {}, token);
}
