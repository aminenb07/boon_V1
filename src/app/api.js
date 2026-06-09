
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

// This function gets document pdf url.
export function getDocumentPdfUrl(documentId, token) {
  return restGetDocumentPdfUrl(documentId, token);
}

// This function gets room stream url.
export function getRoomStreamUrl(roomId, token) {
  return restGetRoomStreamUrl(roomId, token);
}

// This function subscribes to room documents.
export function subscribeRoomDocuments(
  token,
  roomId,
  onDocuments,
  onError,
) {
  return restSubscribeRoomDocuments(token, roomId, onDocuments, onError);
}

// This function registers.
export async function register(payload) {
  return restRegister(payload);
}

// This function logs in.
export async function login(payload) {
  return restLogin(payload);
}

// This function refreshes auth.
export async function refreshAuth(refreshToken) {
  return restRefreshAuth(refreshToken);
}

// This function verifies phone.
export async function verifyPhone(payload) {
  return restVerifyPhone(payload);
}

// This function resends verification code.
export async function resendVerificationCode(payload) {
  return restResendVerificationCode(payload);
}

// This function gets me.
export async function getMe(token) {
  return restGetMe(token);
}

// This function updates me.
export async function updateMe(
  token,
  payload,
) {
  return restUpdateMe(token, payload);
}

// This function changes my password.
export async function changeMyPassword(
  token,
  payload,
) {
  return restChangeMyPassword(token, payload);
}

// This function lists rooms.
export async function listRooms(token) {
  return restListRooms(token);
}

// This function lists rooms with filters.
export async function listRoomsWithFilters(
  token,
  params,
) {
  return restListRoomsWithFilters(token, params);
}

// This function gets room details.
export async function getRoomDetails(token, roomId) {
  return restGetRoomDetails(token, roomId);
}

// This function searches suppliers.
export async function searchSuppliers(token, query) {
  return restSearchSuppliers(token, query);
}

// This function creates room.
export async function createRoom(token, name) {
  return restCreateRoom(token, name);
}

// This function joins room.
export async function joinRoom(token, roomCode) {
  return restJoinRoom(token, roomCode);
}

// This function lists join requests.
export async function listJoinRequests(token) {
  return restListJoinRequests(token);
}

// This function decides join request.
export async function decideJoinRequest(
  token,
  requestId,
  decision,
) {
  return restDecideJoinRequest(token, requestId, decision);
}

// This function updates room status.
export async function updateRoomStatus(token, roomId, status) {
  return restUpdateRoomStatus(token, roomId, status);
}

// This function lists room members.
export async function listRoomMembers(token, roomId) {
  return restListRoomMembers(token, roomId);
}

// This function removes room member.
export async function removeRoomMember(token, roomId, userId) {
  return restRemoveRoomMember(token, roomId, userId);
}

// This function marks room read.
export async function markRoomRead(token, roomId) {
  return restMarkRoomRead(token, roomId);
}

// This function links supplier.
export async function linkSupplier(
  token,
  roomId,
  workerId,
  supplierId,
) {
  return restLinkSupplier(token, roomId, workerId, supplierId);
}

// This function adds supplier to room.
export async function addSupplierToRoom(token, roomId, supplierId) {
  return restAddSupplierToRoom(token, roomId, supplierId);
}

// This function unlinks room supplier.
export async function unlinkRoomSupplier(token, roomId, supplierId) {
  return restUnlinkRoomSupplier(token, roomId, supplierId);
}

// This function lists worker suppliers.
export async function listWorkerSuppliers(
  token,
  roomId,
  filters,
) {
  return restListWorkerSuppliers(token, roomId, filters);
}

// This function lists my worker suppliers.
export async function listMyWorkerSuppliers(token, roomId) {
  return restListMyWorkerSuppliers(token, roomId);
}

// This function lists room suppliers.
export async function listRoomSuppliers(token, roomId) {
  return restListRoomSuppliers(token, roomId);
}

// This function gets supplier profile.
export async function getSupplierProfile(token) {
  return restGetSupplierProfile(token);
}

// This function creates or updates supplier profile.
export async function upsertSupplierProfile(
  token,
  payload,
) {
  return restUpsertSupplierProfile(token, payload);
}

// This function creates document.
export async function createDocument(token, payload) {
  return restCreateDocument(token, payload);
}

// This function creates room document.
export async function createRoomDocument(
  token,
  roomId,
  payload,
) {
  return restCreateRoomDocument(token, roomId, payload);
}

// This function lists room documents.
export async function listRoomDocuments(token, roomId) {
  return restListRoomDocuments(token, roomId);
}

// This function lists personal documents.
export async function listPersonalDocuments(token) {
  return restListPersonalDocuments(token);
}

// This function lists my documents.
export async function listMyDocuments(
  token,
  scope = "personal",
) {
  return restListMyDocuments(token, scope);
}

// This function creates my document.
export async function createMyDocument(
  token,
  payload,
) {
  return restCreateMyDocument(token, payload);
}

// This function gets document.
export async function getDocument(token, documentId) {
  return restGetDocument(token, documentId);
}

// This function deletes document.
export async function deleteDocument(token, documentId) {
  return restDeleteDocument(token, documentId);
}

// This function gets document share.
export async function getDocumentShare(token, documentId) {
  return restGetDocumentShare(token, documentId);
}

// This function exports document pdf.
export async function exportDocumentPdf(token, documentId) {
  return restExportDocumentPdf(token, documentId);
}

// This function gets analytics overview.
export async function getAnalyticsOverview(token) {
  return restGetAnalyticsOverview(token);
}

