import { useEffect, useMemo, useState } from "react";
import {
  addSupplierToRoom,
  createRoom,
  createRoomDocument,
  exportDocumentPdf,
  getDocumentShare,
  getRoomDetails,
  getRoomStreamUrl,
  joinRoom,
  listRoomDocuments,
  listRoomMembers,
  listRoomSuppliers,
  listRoomsWithFilters,
  markRoomRead,
  searchSuppliers,
  updateRoomStatus,
} from "../api";
import type {
  DocumentRecord,
  Role,
  RoomDetails,
  RoomMember,
  RoomSummary,
  SupplierUser,
  WorkerSupplierLink,
} from "../api";

type Props = {
  token: string;
  userId: string;
  role: Role;
  labels: {
    title: string;
    subtitle: string;
    roomLabel: string;
    createRoom: string;
    joinRoom: string;
    roomCode: string;
    roomName: string;
    loadError: string;
    members: string;
    live: string;
    offline: string;
    noMessages: string;
    amount: string;
    category: string;
    note: string;
    send: string;
    linkSupplier: string;
    supplierSearch: string;
    noRooms: string;
  };
};

type RoomFilter = "all" | "active" | "closed";

type RoomTab =
  | "feed"
  | "summary"
  | "members"
  | "export"
  | "suppliers"
  | "add"
  | "docs"
  | "share"
  | "settings";

const FILTERS: Array<{ id: RoomFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
];

function money(value: number, currency: string) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency || "MAD",
  }).format(value);
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function roleBadge(roleValue: Role) {
  if (roleValue === "OWNER") return "bg-purple-100 text-purple-700 border-purple-200";
  if (roleValue === "WORKER") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function getTabsByRole(role: Role): Array<{ id: RoomTab; label: string }> {
  if (role === "OWNER") {
    return [
      { id: "feed", label: "Feed" },
      { id: "summary", label: "Summary" },
      { id: "members", label: "Members" },
      { id: "export", label: "Export" },
      { id: "settings", label: "Settings" },
    ];
  }
  if (role === "WORKER") {
    return [
      { id: "feed", label: "Feed" },
      { id: "suppliers", label: "My Suppliers" },
      { id: "summary", label: "Summary" },
      { id: "settings", label: "Settings" },
    ];
  }
  return [
    { id: "feed", label: "Feed" },
    { id: "add", label: "+ Add Boon" },
    { id: "docs", label: "My Docs" },
    { id: "share", label: "Share/PDF" },
    { id: "settings", label: "Settings" },
  ];
}

export function RoomLive({ token, userId, role, labels }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [links, setLinks] = useState<WorkerSupplierLink[]>([]);
  const [supplierResults, setSupplierResults] = useState<SupplierUser[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [view, setView] = useState<"list" | "room">("list");
  const [tab, setTab] = useState<RoomTab>("feed");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickWorkerId, setQuickWorkerId] = useState("");

  const tabs = useMemo(() => getTabsByRole(role), [role]);
  const selectedRoomCard = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const roomDocsForSupplier = useMemo(
    () => documents.filter((doc) => doc.supplierId === userId),
    [documents, userId],
  );

  const isRoomClosed = useMemo(() => {
    const status = roomDetails?.status || selectedRoomCard?.status;
    return status === "CLOSED";
  }, [roomDetails?.status, selectedRoomCard?.status]);

  const supplierLinksForMe = useMemo(
    () => links.filter((link) => link.supplierId === userId),
    [links, userId],
  );

  useEffect(() => {
    if (role !== "SUPPLIER") return;
    if (!quickWorkerId && supplierLinksForMe.length > 0) {
      setQuickWorkerId(supplierLinksForMe[0].workerId);
    }
  }, [quickWorkerId, role, supplierLinksForMe]);

  async function refreshRooms() {
    const nextRooms = await listRoomsWithFilters(token, {
      search,
      filter,
    });
    setRooms(nextRooms);
  }

  async function loadRoomScreen(roomId: string) {
    const [details, roomDocs, roomMembers, roomLinks] = await Promise.all([
      getRoomDetails(token, roomId),
      listRoomDocuments(token, roomId),
      role === "SUPPLIER"
        ? Promise.resolve([] as RoomMember[])
        : listRoomMembers(token, roomId),
      listRoomSuppliers(token, roomId).catch(() => [] as WorkerSupplierLink[]),
    ]);

    setRoomDetails(details);
    setDocuments(
      [...roomDocs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );
    setMembers(roomMembers);
    setLinks(roomLinks);
  }

  async function openRoom(roomId: string) {
    setError(null);
    setNotice(null);
    setLoadingRoom(true);
    try {
      setSelectedRoomId(roomId);
      setView("room");
      setTab("feed");
      await loadRoomScreen(roomId);
      await markRoomRead(token, roomId);
      await refreshRooms();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : labels.loadError);
    } finally {
      setLoadingRoom(false);
    }
  }

  useEffect(() => {
    setLoadingRooms(true);
    setError(null);
    refreshRooms()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : labels.loadError);
      })
      .finally(() => setLoadingRooms(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter, search]);

  useEffect(() => {
    if (!selectedRoomId || view !== "room") return undefined;
    const source = new EventSource(getRoomStreamUrl(selectedRoomId, token));

    const onReady = () => setIsLive(true);
    const onCreated = (event: MessageEvent<string>) => {
      const parsed = JSON.parse(event.data) as DocumentRecord;
      setDocuments((current) => {
        if (current.some((doc) => doc.id === parsed.id)) return current;
        return [...current, parsed].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
      refreshRooms().catch(() => undefined);
      getRoomDetails(token, selectedRoomId)
        .then((details) => setRoomDetails(details))
        .catch(() => undefined);
      if (tab === "feed") {
        markRoomRead(token, selectedRoomId)
          .then(() => refreshRooms())
          .catch(() => undefined);
      }
    };
    const onLinked = () => {
      listRoomSuppliers(token, selectedRoomId)
        .then((result) => setLinks(result))
        .catch(() => undefined);
    };

    source.addEventListener("ready", onReady as EventListener);
    source.addEventListener("document.created", onCreated as EventListener);
    source.addEventListener("supplier.linked", onLinked as EventListener);
    source.onerror = () => setIsLive(false);

    return () => {
      source.removeEventListener("ready", onReady as EventListener);
      source.removeEventListener("document.created", onCreated as EventListener);
      source.removeEventListener("supplier.linked", onLinked as EventListener);
      source.close();
      setIsLive(false);
    };
  }, [selectedRoomId, tab, token, view]);

  async function handleCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!roomName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const room = await createRoom(token, roomName.trim());
      setRoomName("");
      await refreshRooms();
      setNotice(`Room created (${room.roomCode})`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.loadError);
    }
  }

  async function handleJoinRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!roomCode.trim()) return;
    setError(null);
    setNotice(null);
    try {
      await joinRoom(token, roomCode.trim().toUpperCase());
      setRoomCode("");
      await refreshRooms();
      setNotice("Joined room by code.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.loadError);
    }
  }

  async function handleSearchSuppliers(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoomId) return;
    if (isRoomClosed) {
      setError("Room is closed. Supplier linking is disabled.");
      return;
    }
    setError(null);
    try {
      const result = await searchSuppliers(token, supplierQuery.trim());
      setSupplierResults(result);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : labels.loadError);
    }
  }

  async function handleLinkSupplier(supplierId: string) {
    if (!selectedRoomId) return;
    if (isRoomClosed) {
      setError("Room is closed. Supplier linking is disabled.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await addSupplierToRoom(token, selectedRoomId, supplierId);
      const [nextLinks, nextMembers] = await Promise.all([
        listRoomSuppliers(token, selectedRoomId),
        listRoomMembers(token, selectedRoomId),
      ]);
      setLinks(nextLinks);
      setMembers(nextMembers);
      setNotice("Supplier linked to your worker scope.");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : labels.loadError);
    }
  }

  async function handleSendSupplierBoon(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoomId || role !== "SUPPLIER") return;
    if (isRoomClosed) {
      setError("Room is closed. New boons are disabled.");
      return;
    }

    const amount = Number(quickAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    const resolvedWorkerId =
      quickWorkerId || supplierLinksForMe[0]?.workerId || "";
    if (!resolvedWorkerId) {
      setError("No active worker link in this room.");
      return;
    }

    setError(null);
    setNotice(null);
    try {
      await createRoomDocument(token, selectedRoomId, {
        type: "RECEIPT",
        workerId: resolvedWorkerId,
        quickAmount: amount,
        category: quickCategory.trim() || "General",
        note: quickNote.trim(),
        currency: "MAD",
      });
      setQuickAmount("");
      setQuickCategory("");
      setQuickNote("");
      setNotice("Boon sent to room feed.");
      const docs = await listRoomDocuments(token, selectedRoomId);
      setDocuments(
        [...docs].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      await refreshRooms();
      const details = await getRoomDetails(token, selectedRoomId);
      setRoomDetails(details);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : labels.loadError);
    }
  }

  async function handleChangeRoomStatus(next: "ACTIVE" | "CLOSED") {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await updateRoomStatus(token, selectedRoomId, next);
      const [details] = await Promise.all([getRoomDetails(token, selectedRoomId), refreshRooms()]);
      setRoomDetails(details);
      setNotice(`Room status updated to ${next}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : labels.loadError);
    }
  }

  async function handleShare(doc: DocumentRecord) {
    setError(null);
    try {
      const payload = await getDocumentShare(token, doc.id);
      window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Share failed");
    }
  }

  async function handleExport(doc: DocumentRecord) {
    setError(null);
    try {
      const payload = await exportDocumentPdf(token, doc.id);
      window.open(payload.pdfUrl, "_blank", "noopener,noreferrer");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed");
    }
  }

  const liveLabel = isLive ? labels.live : labels.offline;

  if (view === "list") {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <div>
          <h2 className="text-2xl font-bold">{labels.title}</h2>
          <p className="text-gray-600 mt-1">{labels.subtitle}</p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {notice}
          </p>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <label className="text-xs text-gray-500">Search rooms...</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search rooms..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  filter === item.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {(role === "OWNER" || role === "WORKER") && (
          <div className="grid gap-3 sm:grid-cols-2">
            {role === "OWNER" && (
              <form
                onSubmit={handleCreateRoom}
                className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
              >
                <p className="font-semibold text-sm">+ New Room</p>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder={labels.roomName}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold">
                  {labels.createRoom}
                </button>
              </form>
            )}
            {role === "WORKER" && (
              <form
                onSubmit={handleJoinRoom}
                className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
              >
                <p className="font-semibold text-sm">Join with code</p>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder={labels.roomCode}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
                />
                <button className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold">
                  {labels.joinRoom}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="space-y-2">
          {loadingRooms && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">
              Loading rooms...
            </div>
          )}
          {!loadingRooms && rooms.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
              {labels.noRooms}
            </div>
          )}
          {rooms.map((room) => {
            const scopedTotal =
              room.roleInRoom === "OWNER"
                ? room.totalForOwner
                : room.roleInRoom === "WORKER"
                  ? room.totalForWorkerScope
                  : room.totalForSupplier;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => openRoom(room.id)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{room.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{room.roomCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.unreadCount > 0 && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {room.unreadCount}
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(room.roleInRoom)}`}
                    >
                      {room.roleInRoom}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600 line-clamp-1">
                  {room.lastMessagePreview || "No activity yet"}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {formatDate(room.lastMessageTime)} - {room.status}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {scopedTotal != null ? money(scopedTotal, "MAD") : "-"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <button
          type="button"
          onClick={() => {
            setView("list");
            setTab("feed");
            setSelectedRoomId("");
            setRoomDetails(null);
            setDocuments([]);
            setMembers([]);
          }}
          className="text-xs font-semibold text-blue-700"
        >
          Back to rooms
        </button>
        <h3 className="mt-1 text-lg font-bold">{roomDetails?.name || selectedRoomCard?.name}</h3>
        <p className="text-xs text-gray-500">
          {roomDetails?.roomCode || selectedRoomCard?.roomCode} - {liveLabel}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Status: {roomDetails?.status || selectedRoomCard?.status || "ACTIVE"}
        </p>
        {isRoomClosed && (
          <p className="mt-1 text-xs font-semibold text-amber-700">
            Room closed: read-only mode.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                tab === tabItem.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {loadingRoom && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">
          Loading room...
        </div>
      )}

      {tab === "feed" && (
        <div className="space-y-2">
          {documents.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500 text-center">
              {labels.noMessages}
            </div>
          )}
          {documents.map((doc) => {
            const isMine = doc.supplierId === userId;
            const hasPhoto = doc.attachments.length > 0;
            return (
              <article
                key={doc.id}
                className={`max-w-[88%] rounded-2xl px-3 py-2 border text-sm ${
                  isMine
                    ? "ml-auto bg-blue-600 text-white border-blue-700 rounded-br-md"
                    : "bg-white text-gray-800 border-gray-200 rounded-bl-md"
                }`}
              >
                <p className={`text-xs ${isMine ? "text-blue-100" : "text-gray-500"}`}>
                  {doc.supplier.fullName} - {formatDate(doc.createdAt)}
                </p>
                <p className="font-semibold">
                  {money(doc.grandTotal, doc.currency)}
                </p>
                <p className="text-xs mt-1">
                  {doc.category || doc.type}
                  {hasPhoto ? " - photo" : ""}
                </p>
                {doc.note && <p className="text-xs mt-1">{doc.note}</p>}
              </article>
            );
          })}
        </div>
      )}

      {tab === "summary" && roomDetails && (
        <div className="grid gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Owner total</p>
            <p className="text-xl font-bold">{money(roomDetails.totals.owner, "MAD")}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Worker scope total</p>
            <p className="text-xl font-bold">{money(roomDetails.totals.workerScope, "MAD")}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Supplier total</p>
            <p className="text-xl font-bold">{money(roomDetails.totals.supplierScope, "MAD")}</p>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold">{labels.members}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <span
                key={member.id}
                className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-700"
              >
                {member.user.fullName} ({member.role})
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === "suppliers" && role === "WORKER" && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <p className="text-sm font-semibold">{labels.linkSupplier}</p>
          <form onSubmit={handleSearchSuppliers} className="flex gap-2">
            <input
              value={supplierQuery}
              onChange={(event) => setSupplierQuery(event.target.value)}
              placeholder={labels.supplierSearch}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={isRoomClosed}
            >
              Search
            </button>
          </form>

          {supplierResults.length > 0 && (
            <div className="space-y-2">
              {supplierResults.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleLinkSupplier(supplier.id)}
                  disabled={isRoomClosed}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {supplier.fullName} - {supplier.phone}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {links
              .filter((entry) => entry.workerId === userId)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
                >
                  {entry.supplier?.fullName || entry.supplierId} -{" "}
                  {money(entry.cachedTotal || 0, "MAD")}
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "add" && role === "SUPPLIER" && (
        <form
          onSubmit={handleSendSupplierBoon}
          className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
        >
          <p className="text-sm font-semibold">Quick room boon</p>

          <select
            value={quickWorkerId}
            onChange={(event) => setQuickWorkerId(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={isRoomClosed}
          >
            {supplierLinksForMe.map((entry) => (
              <option key={entry.id} value={entry.workerId}>
                Worker: {entry.worker?.fullName || entry.workerId}
              </option>
            ))}
            {supplierLinksForMe.length === 0 && <option value="">No worker link</option>}
          </select>

          <input
            value={quickAmount}
            onChange={(event) => setQuickAmount(event.target.value)}
            placeholder={labels.amount}
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={isRoomClosed}
          />
          <input
            value={quickCategory}
            onChange={(event) => setQuickCategory(event.target.value)}
            placeholder={labels.category}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={isRoomClosed}
          />
          <input
            value={quickNote}
            onChange={(event) => setQuickNote(event.target.value)}
            placeholder={labels.note}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={isRoomClosed}
          />
          <button
            className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold disabled:opacity-50"
            disabled={!quickWorkerId || isRoomClosed}
          >
            {labels.send}
          </button>
        </form>
      )}

      {tab === "docs" && role === "SUPPLIER" && (
        <div className="space-y-2">
          {roomDocsForSupplier.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
              No room docs for your supplier in this room.
            </div>
          )}
          {roomDocsForSupplier.map((doc) => (
            <article key={doc.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold">
                {doc.category || doc.type} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="text-xs text-gray-500">{formatDate(doc.createdAt)}</p>
            </article>
          ))}
        </div>
      )}

      {tab === "share" && role === "SUPPLIER" && (
        <div className="space-y-2">
          {roomDocsForSupplier.slice(0, 10).map((doc) => (
            <article key={doc.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold">
                {doc.category || doc.type} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="text-xs text-gray-500 mb-2">{formatDate(doc.createdAt)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(doc)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                >
                  Share WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(doc)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                >
                  Export PDF
                </button>
              </div>
            </article>
          ))}
          {roomDocsForSupplier.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
              No documents to share yet.
            </div>
          )}
        </div>
      )}

      {tab === "export" && role === "OWNER" && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <article key={doc.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold">
                {doc.supplier.fullName} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="text-xs text-gray-500 mb-2">{formatDate(doc.createdAt)}</p>
              <button
                type="button"
                onClick={() => handleExport(doc)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
              >
                Export PDF
              </button>
            </article>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <p className="text-sm font-semibold">Room settings</p>
          <p className="text-xs text-gray-500">
            Room code: {roomDetails?.roomCode || selectedRoomCard?.roomCode}
          </p>
          <p className="text-xs text-gray-500">
            Status: {roomDetails?.status || selectedRoomCard?.status || "ACTIVE"}
          </p>
          {role === "OWNER" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChangeRoomStatus("ACTIVE")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
              >
                Set Active
              </button>
              <button
                type="button"
                onClick={() => handleChangeRoomStatus("CLOSED")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
              >
                Set Closed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
