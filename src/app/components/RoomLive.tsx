import { useEffect, useMemo, useState } from "react";
import {
  addSupplierToRoom,
  createRoom,
  createRoomDocument,
  decideJoinRequest,
  getDocumentShare,
  getDocumentPdfUrl,
  getRoomDetails,
  getRoomStreamUrl,
  joinRoom,
  listJoinRequests,
  listRoomDocuments,
  listRoomMembers,
  listRoomSuppliers,
  listRoomsWithFilters,
  markRoomRead,
  removeRoomMember,
  searchSuppliers,
  unlinkRoomSupplier,
  updateRoomStatus,
} from "../api";
import type {
  DocumentRecord,
  Role,
  RoomJoinRequest,
  RoomDetails,
  RoomMember,
  RoomSummary,
  SupplierUser,
  WorkerSupplierLink,
} from "../api";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

type Language = "en" | "fr" | "ar";

type Props = {
  token: string;
  userId: string;
  role: Role;
  language: Language;
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
  if (roleValue === "OWNER") {
    return "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/50 dark:text-fuchsia-200";
  }
  if (roleValue === "WORKER") {
    return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200";
  }
  return "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200";
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

const ROOM_COPY = {
  en: {
    searchRooms: "Search rooms...",
    filterAll: "All",
    filterActive: "Active",
    filterClosed: "Closed",
    newRoom: "+ New Room",
    joinWithCode: "Join with code",
    joinPending: "Join request sent. Waiting for owner approval.",
    joinAccepted: "Joined room successfully.",
    requestAccepted: "Worker join request accepted.",
    requestRefused: "Worker join request refused.",
    loadingRooms: "Loading rooms...",
    loadingRoom: "Loading room...",
    noActivity: "No activity yet",
    noMessagesToShare: "No documents to share yet.",
    roomCode: "Room code",
    roomSettings: "Room settings",
    roomStatus: "Status",
    backToRooms: "Back to rooms",
    statusLabel: "Status",
    ownerTotal: "Owner total",
    workerTotal: "Worker scope total",
    supplierTotal: "Supplier total",
    remove: "Remove",
    search: "Search",
    workerJoinRequests: "Worker join requests",
    accept: "Accept",
    refuse: "Refuse",
    wantsToJoin: "wants to join",
    roomClosedReadOnly: "Room closed: read-only mode.",
    supplierLinked: "Supplier linked to your worker scope.",
    supplierRemoved: "Supplier removed from this room scope.",
    memberRemoved: "Member removed from the room.",
    quickRoomBoon: "Quick room boon",
    noWorkerLink: "No worker link",
    boonSent: "Boon sent to room feed.",
    noRoomDocsSupplier: "No room docs for your supplier in this room.",
    preview: "Preview",
    shareWhatsapp: "Share WhatsApp",
    exportPdf: "Export PDF",
    setActive: "Set Active",
    setClosed: "Set Closed",
    statusUpdated: "Room status updated to",
    roomClosedSupplierLink: "Room is closed. Supplier linking is disabled.",
    roomClosedNewBoon: "Room is closed. New boons are disabled.",
    amountError: "Amount must be greater than 0.",
    noActiveWorkerLink: "No active worker link in this room.",
    phoneTag: "photo",
  },
  fr: {
    searchRooms: "Chercher rooms...",
    filterAll: "Toutes",
    filterActive: "Actives",
    filterClosed: "Fermees",
    newRoom: "+ Nouvelle room",
    joinWithCode: "Rejoindre par code",
    joinPending: "Demande envoyee. En attente de validation owner.",
    joinAccepted: "Room rejointe avec succes.",
    requestAccepted: "Demande worker acceptee.",
    requestRefused: "Demande worker refusee.",
    loadingRooms: "Chargement des rooms...",
    loadingRoom: "Chargement de la room...",
    noActivity: "Aucune activite",
    noMessagesToShare: "Aucun document a partager.",
    roomCode: "Code room",
    roomSettings: "Parametres room",
    roomStatus: "Statut",
    backToRooms: "Retour aux rooms",
    statusLabel: "Statut",
    ownerTotal: "Total owner",
    workerTotal: "Total worker",
    supplierTotal: "Total supplier",
    remove: "Supprimer",
    search: "Chercher",
    workerJoinRequests: "Demandes de workers",
    accept: "Accepter",
    refuse: "Refuser",
    wantsToJoin: "veut rejoindre",
    roomClosedReadOnly: "Room fermee : mode lecture seule.",
    supplierLinked: "Supplier lie a votre scope worker.",
    supplierRemoved: "Supplier retire de cette room.",
    memberRemoved: "Membre retire de la room.",
    quickRoomBoon: "Boon rapide room",
    noWorkerLink: "Aucun lien worker",
    boonSent: "Boon envoye dans le feed.",
    noRoomDocsSupplier: "Aucun doc room pour votre supplier ici.",
    preview: "Apercu",
    shareWhatsapp: "Partager WhatsApp",
    exportPdf: "Exporter PDF",
    setActive: "Activer",
    setClosed: "Fermer",
    statusUpdated: "Statut room mis a jour vers",
    roomClosedSupplierLink: "Room fermee. Liaison supplier desactivee.",
    roomClosedNewBoon: "Room fermee. Nouveaux boons desactives.",
    amountError: "Le montant doit etre superieur a 0.",
    noActiveWorkerLink: "Aucun lien worker actif dans cette room.",
    phoneTag: "photo",
  },
  ar: {
    searchRooms: "ابحث في الغرف...",
    filterAll: "الكل",
    filterActive: "نشطة",
    filterClosed: "مغلقة",
    newRoom: "+ غرفة جديدة",
    joinWithCode: "الانضمام بالكود",
    joinPending: "تم إرسال الطلب. في انتظار موافقة المالك.",
    joinAccepted: "تم الانضمام إلى الغرفة بنجاح.",
    requestAccepted: "تم قبول طلب العامل.",
    requestRefused: "تم رفض طلب العامل.",
    loadingRooms: "جار تحميل الغرف...",
    loadingRoom: "جار تحميل الغرفة...",
    noActivity: "لا يوجد نشاط بعد",
    noMessagesToShare: "لا توجد وثائق للمشاركة بعد.",
    roomCode: "كود الغرفة",
    roomSettings: "إعدادات الغرفة",
    roomStatus: "الحالة",
    backToRooms: "العودة إلى الغرف",
    statusLabel: "الحالة",
    ownerTotal: "إجمالي المالك",
    workerTotal: "إجمالي نطاق العامل",
    supplierTotal: "إجمالي المورد",
    remove: "حذف",
    search: "بحث",
    workerJoinRequests: "طلبات انضمام العمال",
    accept: "قبول",
    refuse: "رفض",
    wantsToJoin: "يريد الانضمام إلى",
    roomClosedReadOnly: "الغرفة مغلقة: وضع قراءة فقط.",
    supplierLinked: "تم ربط المورد بنطاق العامل.",
    supplierRemoved: "تم حذف المورد من هذا النطاق.",
    memberRemoved: "تم حذف العضو من الغرفة.",
    quickRoomBoon: "بون غرفة سريع",
    noWorkerLink: "لا يوجد ربط مع عامل",
    boonSent: "تم إرسال البون إلى تغذية الغرفة.",
    noRoomDocsSupplier: "لا توجد وثائق خاصة بموردك داخل هذه الغرفة.",
    preview: "معاينة",
    shareWhatsapp: "مشاركة واتساب",
    exportPdf: "تصدير PDF",
    setActive: "تفعيل",
    setClosed: "إغلاق",
    statusUpdated: "تم تحديث حالة الغرفة إلى",
    roomClosedSupplierLink: "الغرفة مغلقة. تم تعطيل ربط الموردين.",
    roomClosedNewBoon: "الغرفة مغلقة. تم تعطيل إنشاء بونات جديدة.",
    amountError: "يجب أن يكون المبلغ أكبر من 0.",
    noActiveWorkerLink: "لا يوجد ربط نشط مع عامل داخل هذه الغرفة.",
    phoneTag: "صورة",
  },
} as const;

export function RoomLive({ token, userId, role, language, labels }: Props) {
  const copy = ROOM_COPY[language];
  const filters: Array<{ id: RoomFilter; label: string }> = [
    { id: "all", label: copy.filterAll },
    { id: "active", label: copy.filterActive },
    { id: "closed", label: copy.filterClosed },
  ];
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [links, setLinks] = useState<WorkerSupplierLink[]>([]);
  const [joinRequests, setJoinRequests] = useState<RoomJoinRequest[]>([]);
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
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
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

  async function refreshJoinRequests() {
    if (role !== "OWNER") {
      setJoinRequests([]);
      return;
    }
    const nextRequests = await listJoinRequests(token);
    setJoinRequests(nextRequests);
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
    Promise.all([refreshRooms(), refreshJoinRequests()])
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
      const result = await joinRoom(token, roomCode.trim().toUpperCase());
      setRoomCode("");
      await refreshRooms();
      setNotice(
        result.status === "pending"
          ? copy.joinPending
          : copy.joinAccepted,
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.loadError);
    }
  }

  async function handleJoinDecision(
    requestId: string,
    decision: "accept" | "refuse",
  ) {
    setError(null);
    setNotice(null);
    try {
      await decideJoinRequest(token, requestId, decision);
      await Promise.all([refreshJoinRequests(), refreshRooms()]);
      setNotice(
        decision === "accept"
          ? copy.requestAccepted
          : copy.requestRefused,
      );
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : labels.loadError);
    }
  }

  async function handleSearchSuppliers(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoomId) return;
    if (isRoomClosed) {
      setError(copy.roomClosedSupplierLink);
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
      setError(copy.roomClosedSupplierLink);
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
      setNotice(copy.supplierLinked);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : labels.loadError);
    }
  }

  async function handleRemoveSupplier(supplierId: string) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await unlinkRoomSupplier(token, selectedRoomId, supplierId);
      const [nextLinks, nextMembers] = await Promise.all([
        listRoomSuppliers(token, selectedRoomId),
        listRoomMembers(token, selectedRoomId),
      ]);
      setLinks(nextLinks);
      setMembers(nextMembers);
      await refreshRooms();
      setNotice(copy.supplierRemoved);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : labels.loadError);
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await removeRoomMember(token, selectedRoomId, memberUserId);
      const [roomMembers, roomLinks] = await Promise.all([
        listRoomMembers(token, selectedRoomId),
        listRoomSuppliers(token, selectedRoomId).catch(() => [] as WorkerSupplierLink[]),
      ]);
      setMembers(roomMembers);
      setLinks(roomLinks);
      await refreshRooms();
      const details = await getRoomDetails(token, selectedRoomId);
      setRoomDetails(details);
      setNotice(copy.memberRemoved);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : labels.loadError);
    }
  }

  async function handleSendSupplierBoon(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoomId || role !== "SUPPLIER") return;
    if (isRoomClosed) {
      setError(copy.roomClosedNewBoon);
      return;
    }

    const amount = Number(quickAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(copy.amountError);
      return;
    }

    const resolvedWorkerId =
      quickWorkerId || supplierLinksForMe[0]?.workerId || "";
    if (!resolvedWorkerId) {
      setError(copy.noActiveWorkerLink);
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
      setNotice(copy.boonSent);
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
      setNotice(`${copy.statusUpdated} ${next}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : labels.loadError);
    }
  }

  async function handleShare(doc: DocumentRecord) {
    setError(null);
    const popup = window.open("", "_blank");
    try {
      const payload = await getDocumentShare(token, doc.id);
      if (popup) {
        popup.location.href = payload.whatsappUrl;
      } else {
        window.location.href = payload.whatsappUrl;
      }
    } catch (shareError) {
      popup?.close();
      setError(shareError instanceof Error ? shareError.message : copy.shareWhatsapp);
    }
  }

  function handleExport(doc: DocumentRecord) {
    setError(null);
    const pdfUrl = getDocumentPdfUrl(doc.id, token);
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  const liveLabel = isLive ? labels.live : labels.offline;

  if (view === "list") {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <div>
          <h2 className="text-2xl font-bold">{labels.title}</h2>
          <p className="mt-1 text-muted-foreground">{labels.subtitle}</p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
            {notice}
          </p>
        )}

        <div className="boon-surface p-3">
          <label className="text-xs text-muted-foreground">{copy.searchRooms}</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchRooms}
            className="boon-input mt-1 !rounded-lg !py-2"
          />
          <div className="mt-3 flex gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  filter === item.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "boon-chip"
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
                className="boon-surface p-3 space-y-2"
              >
                <p className="font-semibold text-sm">{copy.newRoom}</p>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder={labels.roomName}
                  className="boon-input !rounded-lg !py-2"
                />
                <button className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold">
                  {labels.createRoom}
                </button>
              </form>
            )}
            {role === "WORKER" && (
              <form
                onSubmit={handleJoinRoom}
                className="boon-surface p-3 space-y-2"
              >
                <p className="font-semibold text-sm">{copy.joinWithCode}</p>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder={labels.roomCode}
                  className="boon-input !rounded-lg !py-2 uppercase"
                />
                <button className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold">
                  {labels.joinRoom}
                </button>
              </form>
            )}
          </div>
        )}

        {role === "OWNER" && joinRequests.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {copy.workerJoinRequests}
            </p>
            <div className="mt-3 space-y-2">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="boon-subsurface px-3 py-3"
                >
                  <p className="text-sm font-semibold">
                    {request.worker.fullName} {copy.wantsToJoin} {request.room.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.worker.phone} - {new Date(request.requestedAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleJoinDecision(request.id, "accept")}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {copy.accept}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJoinDecision(request.id, "refuse")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      {copy.refuse}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {loadingRooms && (
            <div className="boon-surface p-3 text-sm text-muted-foreground">
              {copy.loadingRooms}
            </div>
          )}
          {!loadingRooms && rooms.length === 0 && (
            <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
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
                className="boon-surface w-full p-3 text-left transition-colors hover:border-blue-400/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{room.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{room.roomCode}</p>
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
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                  {room.lastMessagePreview || copy.noActivity}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {formatDate(room.lastMessageTime)} - {room.status}
                  </span>
                  <span className="font-semibold text-foreground">
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
      <div className="boon-surface p-3">
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
          {copy.backToRooms}
        </button>
        <h3 className="mt-1 text-lg font-bold">{roomDetails?.name || selectedRoomCard?.name}</h3>
        <p className="text-xs text-muted-foreground">
          {roomDetails?.roomCode || selectedRoomCard?.roomCode} - {liveLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.statusLabel}: {roomDetails?.status || selectedRoomCard?.status || "ACTIVE"}
        </p>
        {isRoomClosed && (
          <p className="mt-1 text-xs font-semibold text-amber-700">
            {copy.roomClosedReadOnly}
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

      <div className="boon-surface p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                tab === tabItem.id
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {loadingRoom && (
        <div className="boon-surface p-3 text-sm text-muted-foreground">
          {copy.loadingRoom}
        </div>
      )}

      {tab === "feed" && (
        <div className="space-y-2">
          {documents.length === 0 && (
            <div className="boon-surface border-dashed p-4 text-center text-sm text-muted-foreground">
              {labels.noMessages}
            </div>
          )}
          {documents.map((doc) => {
            const isMine = doc.supplierId === userId;
            const hasPhoto = doc.attachments.length > 0;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocument(doc)}
                className={`max-w-[88%] rounded-2xl px-3 py-2 border text-sm ${
                  isMine
                    ? "ml-auto bg-blue-600 text-white border-blue-700 rounded-br-md"
                    : "bg-card text-card-foreground border-border rounded-bl-md"
                }`}
              >
                <p className={`text-xs ${isMine ? "text-blue-100" : "text-muted-foreground"}`}>
                  {doc.supplier.fullName} - {formatDate(doc.createdAt)}
                </p>
                <p className="font-semibold">
                  {money(doc.grandTotal, doc.currency)}
                </p>
                <p className="text-xs mt-1">
                  {doc.category || doc.type}
                  {hasPhoto ? ` - ${copy.phoneTag}` : ""}
                </p>
                {doc.note && <p className="text-xs mt-1">{doc.note}</p>}
              </button>
            );
          })}
        </div>
      )}

      {tab === "summary" && roomDetails && (
        <div className="grid gap-3">
          <div className="boon-surface p-3">
            <p className="text-xs text-muted-foreground">{copy.ownerTotal}</p>
            <p className="text-xl font-bold">{money(roomDetails.totals.owner, "MAD")}</p>
          </div>
          <div className="boon-surface p-3">
            <p className="text-xs text-muted-foreground">{copy.workerTotal}</p>
            <p className="text-xl font-bold">{money(roomDetails.totals.workerScope, "MAD")}</p>
          </div>
          <div className="boon-surface p-3">
            <p className="text-xs text-muted-foreground">{copy.supplierTotal}</p>
            <p className="text-xl font-bold">{money(roomDetails.totals.supplierScope, "MAD")}</p>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="boon-surface p-3">
          <p className="mb-2 text-sm font-semibold">{labels.members}</p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="boon-subsurface flex items-center justify-between px-3 py-2 text-xs"
              >
                <span>
                  {member.user.fullName} ({member.role})
                </span>
                {role === "OWNER" && member.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.userId)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                  >
                    {copy.remove}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "suppliers" && role === "WORKER" && (
        <div className="boon-surface p-3 space-y-3">
          <p className="text-sm font-semibold">{labels.linkSupplier}</p>
          <form onSubmit={handleSearchSuppliers} className="flex gap-2">
            <input
              value={supplierQuery}
              onChange={(event) => setSupplierQuery(event.target.value)}
              placeholder={labels.supplierSearch}
              className="boon-input flex-1 !rounded-lg !py-2"
            />
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={isRoomClosed}
            >
              {copy.search}
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
                  className="boon-subsurface w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
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
                  className="boon-subsurface flex items-center justify-between px-3 py-2 text-xs"
                >
                  <span>
                    {entry.supplier?.fullName || entry.supplierId} -{" "}
                    {money(entry.cachedTotal || 0, "MAD")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSupplier(entry.supplierId)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                  >
                    {copy.remove}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "add" && role === "SUPPLIER" && (
        <form
          onSubmit={handleSendSupplierBoon}
          className="boon-surface p-3 space-y-2"
        >
          <p className="text-sm font-semibold">{copy.quickRoomBoon}</p>

          <select
            value={quickWorkerId}
            onChange={(event) => setQuickWorkerId(event.target.value)}
            className="boon-input !rounded-lg !py-2"
            disabled={isRoomClosed}
          >
            {supplierLinksForMe.map((entry) => (
              <option key={entry.id} value={entry.workerId}>
                Worker: {entry.worker?.fullName || entry.workerId}
              </option>
            ))}
            {supplierLinksForMe.length === 0 && <option value="">{copy.noWorkerLink}</option>}
          </select>

          <input
            value={quickAmount}
            onChange={(event) => setQuickAmount(event.target.value)}
            placeholder={labels.amount}
            type="number"
            min="0"
            step="0.01"
            className="boon-input !rounded-lg !py-2"
            disabled={isRoomClosed}
          />
          <input
            value={quickCategory}
            onChange={(event) => setQuickCategory(event.target.value)}
            placeholder={labels.category}
            className="boon-input !rounded-lg !py-2"
            disabled={isRoomClosed}
          />
          <input
            value={quickNote}
            onChange={(event) => setQuickNote(event.target.value)}
            placeholder={labels.note}
            className="boon-input !rounded-lg !py-2"
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
            <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
              {copy.noRoomDocsSupplier}
            </div>
          )}
          {roomDocsForSupplier.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDocument(doc)}
              className="boon-surface w-full p-3 text-left"
            >
              <p className="text-sm font-semibold">
                {doc.category || doc.type} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      {tab === "share" && role === "SUPPLIER" && (
        <div className="space-y-2">
          {roomDocsForSupplier.slice(0, 10).map((doc) => (
            <article key={doc.id} className="boon-surface p-3">
              <p className="text-sm font-semibold">
                {doc.category || doc.type} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="mb-2 text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocument(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  {copy.preview}
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  {copy.shareWhatsapp}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  {copy.exportPdf}
                </button>
              </div>
            </article>
          ))}
          {roomDocsForSupplier.length === 0 && (
            <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
              {copy.noMessagesToShare}
            </div>
          )}
        </div>
      )}

      {tab === "export" && role === "OWNER" && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <article key={doc.id} className="boon-surface p-3">
              <p className="text-sm font-semibold">
                {doc.supplier.fullName} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="mb-2 text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocument(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  {copy.preview}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  {copy.exportPdf}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="boon-surface p-3 space-y-2">
          <p className="text-sm font-semibold">{copy.roomSettings}</p>
          <p className="text-xs text-muted-foreground">
            {copy.roomCode}: {roomDetails?.roomCode || selectedRoomCard?.roomCode}
          </p>
          <p className="text-xs text-muted-foreground">
            {copy.roomStatus}: {roomDetails?.status || selectedRoomCard?.status || "ACTIVE"}
          </p>
          {role === "OWNER" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChangeRoomStatus("ACTIVE")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                {copy.setActive}
              </button>
              <button
                type="button"
                onClick={() => handleChangeRoomStatus("CLOSED")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                {copy.setClosed}
              </button>
            </div>
          )}
        </div>
      )}

      <DocumentPreviewModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onShare={handleShare}
        onExport={handleExport}
      />
    </div>
  );
}






