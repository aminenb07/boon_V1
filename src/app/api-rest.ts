/**
 * API REST Client - Wrappers for all API endpoints
 *
 * This file provides type-safe functions to call the BOON backend API,
 * plus utilities for authentication token handling and refresh.
 */
import type {
  AnalyticsOverview,
  AuthResponse,
  AuthUser,
  CreateDocumentInput,
  DocumentRecord,
  JoinRoomResponse,
  Role,
  RoomDetails,
  RoomJoinRequest,
  RoomMember,
  RoomStatus,
  RoomSummary,
  SharePayload,
  SupplierProfile,
  SupplierUser,
  VerificationResponse,
  WorkerSupplierLink,
} from "./api";

/** Default API base URL for browser environments */
const browserDefaultApiBase =
  typeof window !== "undefined"
    ? `${window.location.origin.replace(/\/$/, "")}/api`
    : "http://localhost:4000/api";

/** Configured API base from Vite environment variables */
const configuredApiBase =
  import.meta.env.VITE_API_BASE_URL?.trim()
  || import.meta.env.VITE_API_BASE?.trim()
  || "";

/**
 * Resolves the correct API base URL for local, tunnel, or deployed environments
 */
function resolveApiBase() {
  if (
    typeof window !== "undefined"
    && window.location.hostname.endsWith(".devtunnels.ms")
    && configuredApiBase.includes(".devtunnels.ms")
  ) {
    return "/api";
  }

  return configuredApiBase || browserDefaultApiBase;
}

/** Base URL for API requests */
export const API_BASE = resolveApiBase();

/** Shape of error responses from the API */
type ApiErrorPayload = Record<string, unknown> & {
  error?: string;
};

/** Handlers for managing auth state in the app */
type AuthSessionHandlers = {
  getAuth: () => AuthResponse | null;
  saveAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
};

let authSessionHandlers: AuthSessionHandlers | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

/** Configure auth session handlers for token refresh */
export function configureAuthSessionHandlers(handlers: AuthSessionHandlers | null) {
  authSessionHandlers = handlers;
}

/**
 * Makes a type-safe API request, with automatic token refresh on 401
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  retryOnUnauthorized = true,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `Network error: API unreachable at ${API_BASE}. Start the local backend or configure VITE_API_BASE_URL.`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson
    ? ((await response.json()) as ApiErrorPayload)
    : null;

  if (!response.ok) {
    if (response.status === 401 && token && retryOnUnauthorized) {
      const refreshedAuth = await refreshStoredAuth(token);
      if (refreshedAuth) {
        return apiRequest<T>(path, options, refreshedAuth.token, false);
      }
    }

    const error = new Error(
      payload?.error || `Request failed (${response.status})`,
    ) as Error & { payload?: ApiErrorPayload };
    error.payload = payload || undefined;
    throw error;
  }

  return payload as T;
}

/**
 * Refreshes auth tokens using the stored refresh token
 * Prevents multiple concurrent refresh requests
 */
async function refreshStoredAuth(failedToken: string): Promise<AuthResponse | null> {
  if (!authSessionHandlers) return null;

  const currentAuth = authSessionHandlers.getAuth();
  if (!currentAuth?.refreshToken) {
    authSessionHandlers.clearAuth();
    return null;
  }

  // If we already have a fresh token, just use it
  if (currentAuth.token !== failedToken) {
    return currentAuth;
  }

  // Only allow one refresh at a time
  if (!refreshPromise) {
    refreshPromise = restRefreshAuth(currentAuth.refreshToken)
      .then((nextAuth) => {
        authSessionHandlers?.saveAuth(nextAuth);
        return nextAuth;
      })
      .catch(() => {
        authSessionHandlers?.clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/** Get a URL for viewing a document's PDF with auth token */
export function restGetDocumentPdfUrl(documentId: string, token: string) {
  const encoded = encodeURIComponent(token);
  return `${API_BASE}/documents/${documentId}/pdf?token=${encoded}`;
}

/** Get a URL for a room's stream endpoint */
export function restGetRoomStreamUrl(roomId: string, token: string) {
  const encoded = encodeURIComponent(token);
  return `${API_BASE}/rooms/${roomId}/stream?token=${encoded}`;
}

/** Subscribe to room document updates with polling */
export function restSubscribeRoomDocuments(
  token: string,
  roomId: string,
  onDocuments: (documents: DocumentRecord[]) => void,
  onError?: (error: Error) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let closed = false;

  const refreshDocuments = () => {
    void restListRoomDocuments(token, roomId)
      .then((documents) => {
        if (!closed) onDocuments(documents);
      })
      .catch((error) => {
        if (!closed) {
          onError?.(error instanceof Error ? error : new Error("Room stream refresh failed"));
        }
      });
  };

  refreshDocuments();
  const timer = window.setInterval(refreshDocuments, 5000);

  return () => {
    closed = true;
    window.clearInterval(timer);
  };
}

// ==========================================
// AUTH ENDPOINTS
// ==========================================

export async function restRegister(payload: {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: Role;
}) {
  return apiRequest<VerificationResponse & { user: AuthUser }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function restLogin(payload: { identifier: string; password: string }) {
  return apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function restRefreshAuth(refreshToken: string) {
  return apiRequest<AuthResponse>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    null,
    false,
  );
}

export async function restVerifyPhone(payload: { phone: string; code: string }) {
  return apiRequest<AuthResponse>(
    "/auth/verify-phone",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function restResendVerificationCode(payload: { phone: string }) {
  return apiRequest<VerificationResponse>(
    "/auth/resend-code",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

// ==========================================
// USER & PROFILE ENDPOINTS
// ==========================================

export async function restGetMe(token: string) {
  return apiRequest<AuthUser>("/me", {}, token);
}

export async function restUpdateMe(
  token: string,
  payload: { fullName: string; email?: string | null },
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

export async function restChangeMyPassword(
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

// ==========================================
// ROOM ENDPOINTS
// ==========================================

export async function restListRooms(token: string) {
  return apiRequest<RoomSummary[]>("/rooms", {}, token);
}

export async function restListRoomsWithFilters(
  token: string,
  params?: { search?: string; filter?: "all" | "active" | "closed" },
) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.filter) query.set("filter", params.filter);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<RoomSummary[]>(`/rooms${suffix}`, {}, token);
}

export async function restGetRoomDetails(token: string, roomId: string) {
  return apiRequest<RoomDetails>(`/rooms/${roomId}`, {}, token);
}

export async function restSearchSuppliers(token: string, query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  return apiRequest<SupplierUser[]>(`/users/suppliers${suffix}`, {}, token);
}

export async function restCreateRoom(token: string, name: string) {
  return apiRequest<RoomSummary>(
    "/rooms",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    token,
  );
}

export async function restJoinRoom(token: string, roomCode: string) {
  return apiRequest<JoinRoomResponse>(
    "/rooms/join",
    {
      method: "POST",
      body: JSON.stringify({ roomCode }),
    },
    token,
  );
}

export async function restListJoinRequests(token: string) {
  return apiRequest<RoomJoinRequest[]>("/join-requests", {}, token);
}

export async function restDecideJoinRequest(
  token: string,
  requestId: string,
  decision: "accept" | "refuse",
) {
  return apiRequest<RoomJoinRequest>(
    `/join-requests/${requestId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    },
    token,
  );
}

export async function restUpdateRoomStatus(
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

export async function restListRoomMembers(token: string, roomId: string) {
  return apiRequest<RoomMember[]>(`/rooms/${roomId}/members`, {}, token);
}

export async function restRemoveRoomMember(token: string, roomId: string, userId: string) {
  return apiRequest<void>(
    `/rooms/${roomId}/members/${userId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function restMarkRoomRead(token: string, roomId: string) {
  return apiRequest<void>(
    `/rooms/${roomId}/read`,
    {
      method: "POST",
    },
    token,
  );
}

// ==========================================
// WORKER-SUPPLIER LINKS
// ==========================================

export async function restLinkSupplier(
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

export async function restAddSupplierToRoom(
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

export async function restUnlinkRoomSupplier(
  token: string,
  roomId: string,
  supplierId: string,
) {
  return apiRequest<void>(
    `/rooms/${roomId}/suppliers/${supplierId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function restListWorkerSuppliers(
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

export async function restListMyWorkerSuppliers(token: string, roomId: string) {
  return apiRequest<WorkerSupplierLink[]>(
    `/rooms/${roomId}/worker-suppliers/me`,
    {},
    token,
  );
}

export async function restListRoomSuppliers(token: string, roomId: string) {
  return apiRequest<WorkerSupplierLink[]>(
    `/rooms/${roomId}/suppliers`,
    {},
    token,
  );
}

export async function restGetSupplierProfile(token: string) {
  return apiRequest<SupplierProfile | null>("/supplier/profile", {}, token);
}

export async function restUpsertSupplierProfile(
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

// ==========================================
// DOCUMENT ENDPOINTS
// ==========================================

export async function restCreateDocument(token: string, payload: CreateDocumentInput) {
  return apiRequest<DocumentRecord>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function restCreateRoomDocument(
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

export async function restListRoomDocuments(token: string, roomId: string) {
  return apiRequest<DocumentRecord[]>(`/rooms/${roomId}/documents`, {}, token);
}

export async function restListPersonalDocuments(token: string) {
  return apiRequest<DocumentRecord[]>("/documents/personal", {}, token);
}

export async function restListMyDocuments(
  token: string,
  scope: "all" | "room" | "personal" = "personal",
) {
  return apiRequest<DocumentRecord[]>(
    `/me/documents?scope=${encodeURIComponent(scope)}`,
    {},
    token,
  );
}

export async function restCreateMyDocument(
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

export async function restGetDocument(token: string, documentId: string) {
  return apiRequest<DocumentRecord>(`/documents/${documentId}`, {}, token);
}

export async function restDeleteDocument(token: string, documentId: string) {
  return apiRequest<void>(
    `/documents/${documentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function restGetDocumentShare(token: string, documentId: string) {
  return apiRequest<SharePayload>(`/documents/${documentId}/share`, {}, token);
}

export async function restExportDocumentPdf(token: string, documentId: string) {
  return apiRequest<{ documentId: string; pdfUrl: string }>(
    `/documents/${documentId}/export-pdf`,
    { method: "POST" },
    token,
  );
}

// ==========================================
// ANALYTICS ENDPOINTS
// ==========================================

export async function restGetAnalyticsOverview(token: string) {
  return apiRequest<AnalyticsOverview>("/analytics/overview", {}, token);
}
