
/**
 * API REST Client - Wrappers for all API endpoints
 *
 * This file provides functions to call the BOON backend API,
 * plus utilities for authentication token handling and refresh.
 */

/** Default API base URL for browser environments */
const browserDefaultApiBase =
  typeof window !== "undefined"
    ? `${window.location.origin.replace(/\/$/, "")}/api`
    : "http://localhost:8000/api";

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

let authSessionHandlers = null;
let refreshPromise = null;

/** Configure auth session handlers for token refresh */
export function configureAuthSessionHandlers(handlers) {
  authSessionHandlers = handlers;
}

/**
 * Makes an API request, with automatic token refresh on 401
 */
export async function apiRequest(
  path,
  options = {},
  token,
  retryOnUnauthorized = true,
) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
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
    return undefined;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson
    ? (await response.json())
    : null;

  if (!response.ok) {
    if (response.status === 401 && token && retryOnUnauthorized) {
      const refreshedAuth = await refreshStoredAuth(token);
      if (refreshedAuth) {
        return apiRequest(path, options, refreshedAuth.token, false);
      }
    }

    const error = new Error(
      payload?.error || `Request failed (${response.status})`,
    );
    error.payload = payload;
    throw error;
  }

  return payload;
}

/**
 * Refreshes auth tokens using the stored refresh token
 * Prevents multiple concurrent refresh requests
 */
async function refreshStoredAuth(failedToken) {
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
export function restGetDocumentPdfUrl(documentId, token) {
  const encoded = encodeURIComponent(token);
  return `${API_BASE}/documents/${documentId}/pdf?token=${encoded}`;
}

/** Get a URL for a room's stream endpoint */
export function restGetRoomStreamUrl(roomId, token) {
  const encoded = encodeURIComponent(token);
  return `${API_BASE}/rooms/${roomId}/stream?token=${encoded}`;
}

/** Subscribe to room document updates with polling */
export function restSubscribeRoomDocuments(
  token,
  roomId,
  onDocuments,
  onError,
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

export async function restRegister(payload) {
  return apiRequest(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function restLogin(payload) {
  return apiRequest(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function restRefreshAuth(refreshToken) {
  return apiRequest(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    null,
    false,
  );
}

export async function restVerifyPhone(payload) {
  return apiRequest(
    "/auth/verify-phone",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    null,
  );
}

export async function restResendVerificationCode(payload) {
  return apiRequest(
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

export async function restGetMe(token) {
  return apiRequest("/me", {}, token);
}

export async function restUpdateMe(
  token,
  payload,
) {
  return apiRequest(
    "/me/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function restChangeMyPassword(
  token,
  payload,
) {
  return apiRequest(
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

export async function restListRooms(token) {
  return apiRequest("/rooms", {}, token);
}

export async function restListRoomsWithFilters(
  token,
  params,
) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.filter) query.set("filter", params.filter);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(`/rooms${suffix}`, {}, token);
}

export async function restGetRoomDetails(token, roomId) {
  return apiRequest(`/rooms/${roomId}`, {}, token);
}

export async function restSearchSuppliers(token, query) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  return apiRequest(`/users/suppliers${suffix}`, {}, token);
}

export async function restCreateRoom(token, name) {
  return apiRequest(
    "/rooms",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    token,
  );
}

export async function restJoinRoom(token, roomCode) {
  return apiRequest(
    "/rooms/join",
    {
      method: "POST",
      body: JSON.stringify({ roomCode }),
    },
    token,
  );
}

export async function restListJoinRequests(token) {
  return apiRequest("/join-requests", {}, token);
}

export async function restDecideJoinRequest(
  token,
  requestId,
  decision,
) {
  return apiRequest(
    `/join-requests/${requestId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    },
    token,
  );
}

export async function restUpdateRoomStatus(
  token,
  roomId,
  status,
) {
  return apiRequest(
    `/rooms/${roomId}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export async function restListRoomMembers(token, roomId) {
  return apiRequest(`/rooms/${roomId}/members`, {}, token);
}

export async function restRemoveRoomMember(token, roomId, userId) {
  return apiRequest(
    `/rooms/${roomId}/members/${userId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function restMarkRoomRead(token, roomId) {
  return apiRequest(
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
  token,
  roomId,
  workerId,
  supplierId,
) {
  return apiRequest(
    `/rooms/${roomId}/workers/${workerId}/link-supplier`,
    {
      method: "POST",
      body: JSON.stringify({ supplierId }),
    },
    token,
  );
}

export async function restAddSupplierToRoom(
  token,
  roomId,
  supplierId,
) {
  return apiRequest(
    `/rooms/${roomId}/suppliers`,
    {
      method: "POST",
      body: JSON.stringify({ supplierId }),
    },
    token,
  );
}

export async function restUnlinkRoomSupplier(
  token,
  roomId,
  supplierId,
) {
  return apiRequest(
    `/rooms/${roomId}/suppliers/${supplierId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function restListWorkerSuppliers(
  token,
  roomId,
  filters,
) {
  const query = new URLSearchParams();
  if (filters?.workerId) query.set("workerId", filters.workerId);
  if (filters?.supplierId) query.set("supplierId", filters.supplierId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(
    `/rooms/${roomId}/worker-suppliers${suffix}`,
    {},
    token,
  );
}

export async function restListMyWorkerSuppliers(token, roomId) {
  return apiRequest(
    `/rooms/${roomId}/worker-suppliers/me`,
    {},
    token,
  );
}

export async function restListRoomSuppliers(token, roomId) {
  return apiRequest(
    `/rooms/${roomId}/suppliers`,
    {},
    token,
  );
}

export async function restGetSupplierProfile(token) {
  return apiRequest("/supplier/profile", {}, token);
}

export async function restUpsertSupplierProfile(
  token,
  payload,
) {
  return apiRequest(
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

export async function restCreateDocument(token, payload) {
  return apiRequest(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function restCreateRoomDocument(
  token,
  roomId,
  payload,
) {
  return apiRequest(
    `/rooms/${roomId}/documents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function restListRoomDocuments(token, roomId) {
  return apiRequest(`/rooms/${roomId}/documents`, {}, token);
}

export async function restListPersonalDocuments(token) {
  return apiRequest("/documents/personal", {}, token);
}

export async function restListMyDocuments(
  token,
  scope = "personal",
) {
  return apiRequest(
    `/me/documents?scope=${encodeURIComponent(scope)}`,
    {},
    token,
  );
}

export async function restCreateMyDocument(
  token,
  payload,
) {
  return apiRequest(
    "/me/documents",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function restGetDocument(token, documentId) {
  return apiRequest(`/documents/${documentId}`, {}, token);
}

export async function restDeleteDocument(token, documentId) {
  return apiRequest(
    `/documents/${documentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function restGetDocumentShare(token, documentId) {
  return apiRequest(`/documents/${documentId}/share`, {}, token);
}

export async function restExportDocumentPdf(token, documentId) {
  return apiRequest(
    `/documents/${documentId}/export-pdf`,
    { method: "POST" },
    token,
  );
}

// ==========================================
// ANALYTICS ENDPOINTS
// ==========================================

export async function restGetAnalyticsOverview(token) {
  return apiRequest("/analytics/overview", {}, token);
}

