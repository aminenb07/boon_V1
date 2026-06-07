import { useEffect, useMemo, useRef, useState } from "react";
import {
  addSupplierToRoom,
  createRoom,
  createRoomDocument,
  decideJoinRequest,
  exportDocumentPdf,
  getDocumentShare,
  getRoomDetails,
  joinRoom,
  listJoinRequests,
  listRoomDocuments,
  listRoomMembers,
  listWorkerSuppliers,
  listRoomSuppliers,
  listRoomsWithFilters,
  markRoomRead,
  removeRoomMember,
  searchSuppliers,
  subscribeRoomDocuments,
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

// This type defines the data shape for language.
type Language = "en" | "fr" | "ar";

// This type defines the data shape for props.
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

// This type defines the data shape for room filter.
type RoomFilter = "all" | "active" | "closed";

// This type defines the data shape for room tab.
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

// This function runs.
function money(value: number, currency: string) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency || "MAD",
  }).format(value);
}

// This function formats date.
function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

// This function runs room documents.
function sortRoomDocuments(documents: DocumentRecord[]) {
  return [...documents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

// This function runs documents signature.
function roomDocumentsSignature(documents: DocumentRecord[]) {
  // This variable stores the last document value.
  const lastDocument = documents[documents.length - 1];
  return `${documents.length}:${lastDocument?.id || "none"}:${lastDocument?.createdAt || "none"}`;
}

// This function runs badge.
function roleBadge(roleValue: Role) {
  if (roleValue === "OWNER") {
    return "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/50 dark:text-fuchsia-200";
  }
  if (roleValue === "WORKER") {
    return "border-blue-300 bg-blue-100 text-blue-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  }
  return "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200";
}

// This function gets tabs by role.
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

// This component renders the room copy UI.
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
    searchRooms: "'(-+ AJ 'D:1A...",
    filterAll: "'DCD",
    filterActive: "F47)",
    filterClosed: "E:DB)",
    newRoom: "+ :1A) ,/J/)",
    joinWithCode: "'D'F6E'E ('DCH/",
    joinPending: "*E %13'D 'D7D(. AJ 'F*8'1 EH'AB) 'DE'DC.",
    joinAccepted: "*E 'D'F6E'E %DI 'D:1A) (F,'-.",
    requestAccepted: "*E B(HD 7D( 'D9'ED.",
    requestRefused: "*E 1A6 7D( 'D9'ED.",
    loadingRooms: ",'1 *-EJD 'D:1A...",
    loadingRoom: ",'1 *-EJD 'D:1A)...",
    noActivity: "D' JH,/ F4'7 (9/",
    noMessagesToShare: "D' *H,/ H+'&B DDE4'1C) (9/.",
    roomCode: "CH/ 'D:1A)",
    roomSettings: "%9/'/'* 'D:1A)",
    roomStatus: "'D-'D)",
    backToRooms: "'D9H/) %DI 'D:1A",
    statusLabel: "'D-'D)",
    ownerTotal: "%,E'DJ 'DE'DC",
    workerTotal: "%,E'DJ F7'B 'D9'ED",
    supplierTotal: "%,E'DJ 'DEH1/",
    remove: "-0A",
    search: "(-+",
    workerJoinRequests: "7D('* 'F6E'E 'D9E'D",
    accept: "B(HD",
    refuse: "1A6",
    wantsToJoin: "J1J/ 'D'F6E'E %DI",
    roomClosedReadOnly: "'D:1A) E:DB): H69 B1'!) AB7.",
    supplierLinked: "*E 1(7 'DEH1/ (F7'B 'D9'ED.",
    supplierRemoved: "*E -0A 'DEH1/ EF G0' 'DF7'B.",
    memberRemoved: "*E -0A 'D96H EF 'D:1A).",
    quickRoomBoon: "(HF :1A) 31J9",
    noWorkerLink: "D' JH,/ 1(7 E9 9'ED",
    boonSent: "*E %13'D 'D(HF %DI *:0J) 'D:1A).",
    noRoomDocsSupplier: "D' *H,/ H+'&B .'5) (EH1/C /'.D G0G 'D:1A).",
    preview: "E9'JF)",
    shareWhatsapp: "E4'1C) H'*3'(",
    exportPdf: "*5/J1 PDF",
    setActive: "*A9JD",
    setClosed: "%:D'B",
    statusUpdated: "*E *-/J+ -'D) 'D:1A) %DI",
    roomClosedSupplierLink: "'D:1A) E:DB). *E *97JD 1(7 'DEH1/JF.",
    roomClosedNewBoon: "'D:1A) E:DB). *E *97JD %F4'! (HF'* ,/J/).",
    amountError: "J,( #F JCHF 'DE(D: #C(1 EF 0.",
    noActiveWorkerLink: "D' JH,/ 1(7 F47 E9 9'ED /'.D G0G 'D:1A).",
    phoneTag: "5H1)",
  },
} as const;

// This component renders the room live UI.
export function RoomLive({ token, userId, role, language, labels }: Props) {
  // This variable stores the copy value.
  const copy = ROOM_COPY[language === "ar" ? "en" : language];
  // This variable stores the filters value.
  const filters: Array<{ id: RoomFilter; label: string }> = [
    { id: "all", label: copy.filterAll },
    { id: "active", label: copy.filterActive },
    { id: "closed", label: copy.filterClosed },
  ];
  // This variable stores the rooms value.
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  // This variable stores the selected room id value.
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  // This variable stores the room details value.
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  // This variable stores the members value.
  const [members, setMembers] = useState<RoomMember[]>([]);
  // This variable stores the documents value.
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  // This variable stores the links value.
  const [links, setLinks] = useState<WorkerSupplierLink[]>([]);
  // This variable stores the join requests value.
  const [joinRequests, setJoinRequests] = useState<RoomJoinRequest[]>([]);
  // This variable stores the supplier results value.
  const [supplierResults, setSupplierResults] = useState<SupplierUser[]>([]);
  // This state stores the current search value.
  const [search, setSearch] = useState("");
  // This variable stores the filter value.
  const [filter, setFilter] = useState<RoomFilter>("all");
  // This state stores the current supplier query value.
  const [supplierQuery, setSupplierQuery] = useState("");
  // This state stores the current room name value.
  const [roomName, setRoomName] = useState("");
  // This state stores the current room code value.
  const [roomCode, setRoomCode] = useState("");
  // This variable stores the view value.
  const [view, setView] = useState<"list" | "room">("list");
  // This variable stores the tab value.
  const [tab, setTab] = useState<RoomTab>("feed");
  // This variable stores the notice value.
  const [notice, setNotice] = useState<string | null>(null);
  // This variable stores the error value.
  const [error, setError] = useState<string | null>(null);
  // This variable stores the selected document value.
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  // This state stores the current loading rooms value.
  const [loadingRooms, setLoadingRooms] = useState(false);
  // This state stores the current loading room value.
  const [loadingRoom, setLoadingRoom] = useState(false);
  // This state stores the current is live value.
  const [isLive, setIsLive] = useState(false);
  // This ref keeps access to the room documents signature ref element or value.
  const roomDocumentsSignatureRef = useRef("0:none:none");

  // This state stores the current quick amount value.
  const [quickAmount, setQuickAmount] = useState("");
  // This state stores the current quick category value.
  const [quickCategory, setQuickCategory] = useState("");
  // This state stores the current quick note value.
  const [quickNote, setQuickNote] = useState("");
  // This state stores the current quick worker id value.
  const [quickWorkerId, setQuickWorkerId] = useState("");

  // This memoized value keeps the computed tabs result.
  const tabs = useMemo(() => getTabsByRole(role), [role]);
  // This memoized value keeps the computed selected room card result.
  const selectedRoomCard = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  // This memoized value keeps the computed room docs for supplier result.
  const roomDocsForSupplier = useMemo(
    () => documents.filter((doc) => doc.supplierId === userId),
    [documents, userId],
  );

  // This memoized value keeps the computed is room closed result.
  const isRoomClosed = useMemo(() => {
    // This variable stores the status value.
    const status = roomDetails?.status || selectedRoomCard?.status;
    return status === "CLOSED";
  }, [roomDetails?.status, selectedRoomCard?.status]);

  // This memoized value keeps the computed supplier links for me result.
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

  // This function refreshes rooms.
  async function refreshRooms() {
    // This variable stores the next rooms value.
    const nextRooms = await listRoomsWithFilters(token, {
      search,
      filter,
    });
    setRooms(nextRooms);
  }

  // This function refreshes join requests.
  async function refreshJoinRequests() {
    if (role !== "OWNER") {
      setJoinRequests([]);
      return;
    }
    // This variable stores the next requests value.
    const nextRequests = await listJoinRequests(token);
    setJoinRequests(nextRequests);
  }

  // This function runs room screen.
  async function loadRoomScreen(roomId: string) {
    // This variable stores the details value.
    const [details, roomDocs, roomMembers, roomLinks] = await Promise.all([
      getRoomDetails(token, roomId),
      listRoomDocuments(token, roomId),
      role === "SUPPLIER"
        ? Promise.resolve([] as RoomMember[])
        : listRoomMembers(token, roomId),
      role === "SUPPLIER"
        ? listWorkerSuppliers(token, roomId).catch(() => [] as WorkerSupplierLink[])
        : listRoomSuppliers(token, roomId).catch(() => [] as WorkerSupplierLink[]),
    ]);

    setRoomDetails(details);
    // This variable stores the sorted room docs value.
    const sortedRoomDocs = sortRoomDocuments(roomDocs);
    roomDocumentsSignatureRef.current = roomDocumentsSignature(sortedRoomDocs);
    setDocuments(sortedRoomDocs);
    setMembers(roomMembers);
    setLinks(roomLinks);
  }

  // This function opens room.
  async function openRoom(roomId: string) {
    setError(null);
    setNotice(null);
    setLoadingRoom(true);
    try {
      setSelectedRoomId(roomId);
      setView("room");
      setTab("feed");
      await loadRoomScreen(roomId);
      await Promise.all([markRoomRead(token, roomId), refreshRooms()]);
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
  }, [token, filter, search, userId]);

  useEffect(() => {
    if (!selectedRoomId || view !== "room") return undefined;

    // This variable stores the unsubscribe value.
    const unsubscribe = subscribeRoomDocuments(
      token,
      selectedRoomId,
      (nextDocuments) => {
        setIsLive(true);
        // This variable stores the sorted documents value.
        const sortedDocuments = sortRoomDocuments(nextDocuments);
        // This variable stores the next signature value.
        const nextSignature = roomDocumentsSignature(sortedDocuments);

        if (nextSignature === roomDocumentsSignatureRef.current) {
          return;
        }

        roomDocumentsSignatureRef.current = nextSignature;
        setDocuments(sortedDocuments);

        Promise.all([
          getRoomDetails(token, selectedRoomId).then((details) => {
            setRoomDetails(details);
          }),
          (role === "SUPPLIER"
            ? listWorkerSuppliers(token, selectedRoomId)
            : listRoomSuppliers(token, selectedRoomId)
          ).then((result) => {
            setLinks(result);
          }).catch(() => undefined),
          refreshRooms(),
        ]).catch(() => undefined);
      },
      () => setIsLive(false),
    );

    return () => {
      unsubscribe();
      roomDocumentsSignatureRef.current = "0:none:none";
      setIsLive(false);
    };
  }, [selectedRoomId, token, userId, view]);

  // This function handles create room.
  async function handleCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!roomName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      // This variable stores the room value.
      const room = await createRoom(token, roomName.trim());
      setRoomName("");
      await refreshRooms();
      setNotice(`Room created (${room.roomCode})`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.loadError);
    }
  }

  // This function handles join room.
  async function handleJoinRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!roomCode.trim()) return;
    setError(null);
    setNotice(null);
    try {
      // This variable stores the result value.
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

  // This function handles join decision.
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

  // This function handles search suppliers.
  async function handleSearchSuppliers(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoomId) return;
    if (isRoomClosed) {
      setError(copy.roomClosedSupplierLink);
      return;
    }
    setError(null);
    try {
      // This variable stores the result value.
      const result = await searchSuppliers(token, supplierQuery.trim());
      setSupplierResults(result);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : labels.loadError);
    }
  }

  // This function handles link supplier.
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
      await Promise.all([loadRoomScreen(selectedRoomId), refreshRooms()]);
      setNotice(copy.supplierLinked);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : labels.loadError);
    }
  }

  // This function handles remove supplier.
  async function handleRemoveSupplier(supplierId: string) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await unlinkRoomSupplier(token, selectedRoomId, supplierId);
      await Promise.all([loadRoomScreen(selectedRoomId), refreshRooms()]);
      setNotice(copy.supplierRemoved);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : labels.loadError);
    }
  }

  // This function handles remove member.
  async function handleRemoveMember(memberUserId: string) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await removeRoomMember(token, selectedRoomId, memberUserId);
      await Promise.all([loadRoomScreen(selectedRoomId), refreshRooms()]);
      setNotice(copy.memberRemoved);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : labels.loadError);
    }
  }

  // This function handles send supplier boon.
  async function handleSendSupplierBoon(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoomId || role !== "SUPPLIER") return;
    if (isRoomClosed) {
      setError(copy.roomClosedNewBoon);
      return;
    }

    // This variable stores the amount value.
    const amount = Number(quickAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(copy.amountError);
      return;
    }

    // This variable stores the resolved worker id value.
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
      await Promise.all([loadRoomScreen(selectedRoomId), refreshRooms()]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : labels.loadError);
    }
  }

  // This function handles change room status.
  async function handleChangeRoomStatus(next: "ACTIVE" | "CLOSED") {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await updateRoomStatus(token, selectedRoomId, next);
      await Promise.all([loadRoomScreen(selectedRoomId), refreshRooms()]);
      setNotice(`${copy.statusUpdated} ${next}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : labels.loadError);
    }
  }

  // This function handles share.
  async function handleShare(doc: DocumentRecord) {
    setError(null);
    // This variable stores the popup value.
    const popup = typeof navigator.share === "function"
      ? null
      : window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      // This variable stores the payload value.
      const payload = await getDocumentShare(token, doc.id);
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: doc.category || doc.type,
          text: payload.message || `${doc.category || doc.type} - ${money(doc.grandTotal, doc.currency)}`,
        });
        return;
      }
      if (popup) {
        popup.location.replace(payload.whatsappUrl);
      } else {
        window.location.href = payload.whatsappUrl;
      }
    } catch (shareError) {
      popup?.close();
      setError(shareError instanceof Error ? shareError.message : copy.shareWhatsapp);
    }
  }

  // This function handles export.
  async function handleExport(doc: DocumentRecord) {
    setError(null);
    // This variable stores the popup value.
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      // This variable stores the result value.
      const result = await exportDocumentPdf(token, doc.id);
      if (popup) {
        popup.location.replace(result.pdfUrl);
      } else {
        window.location.href = result.pdfUrl;
      }
    } catch (pdfError) {
      popup?.close();
      setError(pdfError instanceof Error ? pdfError.message : copy.exportPdf);
    }
  }

  // This variable stores the live label value.
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
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-blue-900 dark:text-zinc-200">
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
            // This variable stores the scoped total value.
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
          <p className="mt-1 text-xs font-semibold text-primary">
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
        <div className="min-h-[360px] space-y-3 rounded-2xl border border-border/70 bg-secondary/45 p-3">
          {documents.length === 0 && (
            <div className="mx-auto mt-16 max-w-xs rounded-2xl border border-dashed border-border bg-card/80 p-4 text-center text-sm text-muted-foreground">
              {labels.noMessages}
            </div>
          )}
          {documents.map((doc) => {
            // This variable tracks whether is mine is true.
            const isMine = doc.supplierId === userId;
            // This variable tracks whether has photo is true.
            const hasPhoto = doc.attachments.length > 0;
            return (
              <div key={doc.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <button
                  type="button"
                  onClick={() => setSelectedDocument(doc)}
                  className={`group relative max-w-[82%] rounded-2xl px-3 py-2.5 text-left text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:max-w-[68%] ${
                    isMine
                      ? "rounded-br-sm bg-[#0b66ff] text-white dark:bg-zinc-700"
                      : "rounded-bl-sm border border-border/80 bg-card text-card-foreground"
                  }`}
                >
                  <span
                    className={`absolute bottom-0 h-3 w-3 ${
                      isMine
                        ? "-right-1 bg-[#0b66ff] [clip-path:polygon(0_0,100%_100%,0_100%)] dark:bg-zinc-700"
                        : "-left-1 bg-card [clip-path:polygon(100%_0,100%_100%,0_100%)]"
                    }`}
                  />

                  <span
                    className={`mb-1 block text-[11px] font-semibold leading-none ${
                      isMine ? "text-zinc-200" : "text-blue-500 dark:text-zinc-300"
                    }`}
                  >
                    {doc.supplier.fullName}
                  </span>

                  <span className="block text-base font-black leading-tight">
                    {money(doc.grandTotal, doc.currency)}
                  </span>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isMine
                        ? "bg-white/15 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {doc.category || doc.type}
                    {hasPhoto ? ` - ${copy.phoneTag}` : ""}
                  </span>

                  {doc.note && (
                    <span className={`mt-2 block text-xs leading-relaxed ${isMine ? "text-blue-50" : "text-muted-foreground"}`}>
                      {doc.note}
                    </span>
                  )}

                  <span
                    className={`mt-2 block text-right text-[10px] leading-none ${
                      isMine ? "text-blue-100" : "text-muted-foreground"
                    }`}
                  >
                    {formatDate(doc.createdAt)}
                  </span>
                </button>
              </div>
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


