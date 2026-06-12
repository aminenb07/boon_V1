
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
import { DocumentPreviewModal } from "./DocumentPreviewModal";

function money(value, currency) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency || "MAD",
  }).format(value);
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function sortRoomDocuments(documents) {
  return [...documents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function roomDocumentsSignature(documents) {
  const lastDocument = documents[documents.length - 1];
  return `${documents.length}:${lastDocument?.id || "none"}:${lastDocument?.createdAt || "none"}`;
}

function roleBadge(roleValue) {
  if (roleValue === "OWNER") {
    return "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/50 dark:text-fuchsia-200";
  }
  if (roleValue === "WORKER") {
    return "border-blue-300 bg-blue-100 text-blue-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  }
  return "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200";
}

function getTabsByRole(role) {
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
    filterClosed: "Fermées",
    newRoom: "+ Nouvelle room",
    joinWithCode: "Rejoindre par code",
    joinPending: "Demande envoyée. En attente de validation owner.",
    joinAccepted: "Room rejointe avec succès.",
    requestAccepted: "Demande worker acceptée.",
    requestRefused: "Demande worker refusée.",
    loadingRooms: "Chargement des rooms...",
    loadingRoom: "Chargement de la room...",
    noActivity: "Aucune activité",
    noMessagesToShare: "Aucun document à partager.",
    roomCode: "Code room",
    roomSettings: "Paramètres room",
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
    roomClosedReadOnly: "Room fermée : mode lecture seule.",
    supplierLinked: "Supplier lié à votre scope worker.",
    supplierRemoved: "Supplier retiré de cette room.",
    memberRemoved: "Membre retiré de la room.",
    quickRoomBoon: "Boon rapide room",
    noWorkerLink: "Aucun lien worker",
    boonSent: "Boon envoyé dans le feed.",
    noRoomDocsSupplier: "Aucun doc room pour votre supplier ici.",
    preview: "Aperçu",
    shareWhatsapp: "Partager WhatsApp",
    exportPdf: "Exporter PDF",
    setActive: "Activer",
    setClosed: "Fermer",
    statusUpdated: "Statut room mis à jour vers",
    roomClosedSupplierLink: "Room fermée. Liaison supplier désactivée.",
    roomClosedNewBoon: "Room fermée. Nouveaux boons désactivés.",
    amountError: "Le montant doit être supérieur à 0.",
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
};

export function RoomLive({ token, userId, role, language, labels }) {
  const copy = ROOM_COPY[language === "ar" ? "en" : language];
  const filters = [
    { id: "all", label: copy.filterAll },
    { id: "active", label: copy.filterActive },
    { id: "closed", label: copy.filterClosed },
  ];
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [roomDetails, setRoomDetails] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [roomDocuments, setRoomDocuments] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [workerSupplierLinks, setWorkerSupplierLinks] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [supplierSearchResults, setSupplierSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [view, setView] = useState("list");
  const [tab, setTab] = useState("feed");
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const roomDocumentsSignatureRef = useRef("0:none:none");

  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickWorkerId, setQuickWorkerId] = useState("");

  const tabs = useMemo(() => getTabsByRole(role), [role]);
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const roomDocsForSupplier = useMemo(
    () => roomDocuments.filter((doc) => doc.supplierId === userId),
    [roomDocuments, userId],
  );

  const isRoomClosed = useMemo(() => {
    const status = selectedRoom?.status || selectedRoom?.status;
    return status === "CLOSED";
  }, [selectedRoom?.status, selectedRoom?.status]);

  const supplierLinksForMe = useMemo(
    () => workerSupplierLinks.filter((link) => link.supplierId === userId),
    [workerSupplierLinks, userId],
  );

  useEffect(() => {
    if (role !== "SUPPLIER") return;
    if (!quickWorkerId && supplierLinksForMe.length > 0) {
      setQuickWorkerId(supplierLinksForMe[0].workerId);
    }
  }, [quickWorkerId, role, supplierLinksForMe]);

  async function refreshRooms() {
    const nextRooms = await listRoomsWithFilters(token, {
      search: searchQuery,
      filter: roomFilter,
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

  async function loadRoomDetails(roomId) {
    const [details, docs, members, links] = await Promise.all([
      getRoomDetails(token, roomId),
      listRoomDocuments(token, roomId),
      role === "SUPPLIER"
        ? Promise.resolve([])
        : listRoomMembers(token, roomId),
      role === "SUPPLIER"
        ? listWorkerSuppliers(token, roomId).catch(() => [])
        : listRoomSuppliers(token, roomId).catch(() => []),
    ]);

    setRoomInfo(details);
    const sortedDocs = sortRoomDocuments(docs);
    roomDocumentsSignatureRef.current = roomDocumentsSignature(sortedDocs);
    setRoomDocuments(sortedDocs);
    setRoomMembers(members);
    setWorkerSupplierLinks(links);
  }

  async function openRoom(roomId) {
    setError(null);
    setNotice(null);
    setLoadingRoom(true);
    try {
      setSelectedRoomId(roomId);
      setView("room");
      setTab("feed");
      await loadRoomDetails(roomId);
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
  }, [token, roomFilter, searchQuery, userId]);

  useEffect(() => {
    if (!selectedRoomId || view !== "room") return undefined;

    const unsubscribe = subscribeRoomDocuments(
      token,
      selectedRoomId,
      (nextDocuments) => {
        setIsLive(true);
        const sortedDocuments = sortRoomDocuments(nextDocuments);
        const nextSignature = roomDocumentsSignature(sortedDocuments);

        if (nextSignature === roomDocumentsSignatureRef.current) {
          return;
        }

        roomDocumentsSignatureRef.current = nextSignature;
        setRoomDocuments(sortedDocuments);

        Promise.all([
          getRoomDetails(token, selectedRoomId).then((details) => {
            setRoomInfo(details);
          }),
          (role === "SUPPLIER"
            ? listWorkerSuppliers(token, selectedRoomId)
            : listRoomSuppliers(token, selectedRoomId)
          ).then((result) => {
            setWorkerSupplierLinks(result);
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

  async function handleCreateRoom(event) {
    event.preventDefault();
    if (!newRoomName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const room = await createRoom(token, newRoomName.trim());
      setNewRoomName("");
      await refreshRooms();
      setNotice(`Room created (${room.roomCode})`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.loadError);
    }
  }

  async function handleJoinRoom(event) {
    event.preventDefault();
    if (!joinRoomCode.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const result = await joinRoom(token, joinRoomCode.trim().toUpperCase());
      setJoinRoomCode("");
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

  async function handleJoinRequestDecision(requestId, decision) {
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

  async function handleSearchSuppliers(event) {
    event.preventDefault();
    if (!selectedRoomId) return;
    if (isRoomClosed) {
      setError(copy.roomClosedSupplierLink);
      return;
    }
    setError(null);
    try {
      const results = await searchSuppliers(token, supplierQuery.trim());
      setSupplierSearchResults(results);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : labels.loadError);
    }
  }

  async function handleLinkSupplier(supplierId) {
    if (!selectedRoomId) return;
    if (isRoomClosed) {
      setError(copy.roomClosedSupplierLink);
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await addSupplierToRoom(token, selectedRoomId, supplierId);
      await Promise.all([loadRoomDetails(selectedRoomId), refreshRooms()]);
      setNotice(copy.supplierLinked);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : labels.loadError);
    }
  }

  async function handleUnlinkSupplier(supplierId) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await unlinkRoomSupplier(token, selectedRoomId, supplierId);
      await Promise.all([loadRoomDetails(selectedRoomId), refreshRooms()]);
      setNotice(copy.supplierRemoved);
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : labels.loadError);
    }
  }

  async function handleRemoveMember(memberUserId) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await removeRoomMember(token, selectedRoomId, memberUserId);
      await Promise.all([loadRoomDetails(selectedRoomId), refreshRooms()]);
      setNotice(copy.memberRemoved);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : labels.loadError);
    }
  }

  async function handleSendSupplierBoon(event) {
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
      await Promise.all([loadRoomDetails(selectedRoomId), refreshRooms()]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : labels.loadError);
    }
  }

  async function handleChangeRoomStatus(nextStatus) {
    if (!selectedRoomId) return;
    setError(null);
    setNotice(null);
    try {
      await updateRoomStatus(token, selectedRoomId, nextStatus);
      await Promise.all([loadRoomDetails(selectedRoomId), refreshRooms()]);
      setNotice(`${copy.statusUpdated} ${nextStatus}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : labels.loadError);
    }
  }

  async function handleShare(doc) {
    setError(null);
    const popup = typeof navigator.share === "function"
      ? null
      : window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
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

  async function handleExport(doc) {
    setError(null);
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={copy.searchRooms}
            className="boon-input mt-1 !rounded-lg !py-2"
          />
          <div className="mt-3 flex gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRoomFilter(item.id)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  roomFilter === item.id
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
                  value={newRoomName}
                  onChange={(event) => setNewRoomName(event.target.value)}
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
                  value={joinRoomCode}
                  onChange={(event) => setJoinRoomCode(event.target.value)}
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
                      onClick={() => handleJoinRequestDecision(request.id, "accept")}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {copy.accept}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJoinRequestDecision(request.id, "refuse")}
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
            setRoomInfo(null);
            setRoomDocuments([]);
            setRoomMembers([]);
            setWorkerSupplierLinks([]);
          }}
          className="text-xs font-semibold text-blue-700"
        >
          {copy.backToRooms}
        </button>
        <h3 className="mt-1 text-lg font-bold">{roomInfo?.name}</h3>
        <p className="text-xs text-muted-foreground">
          {roomInfo?.roomCode} - {liveLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.statusLabel}: {roomInfo?.status || "ACTIVE"}
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
          {roomDocuments.length === 0 && (
            <div className="mx-auto mt-16 max-w-xs rounded-2xl border border-dashed border-border bg-card/80 p-4 text-center text-sm text-muted-foreground">
              {labels.noMessages}
            </div>
          )}
          {roomDocuments.map((doc) => {
            const isMine = doc.supplierId === userId;
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

      {tab === "summary" && roomInfo && (
        <div className="grid gap-3">
          <div className="boon-surface p-3">
            <p className="text-xs text-muted-foreground">{copy.ownerTotal}</p>
            <p className="text-2xl font-bold">{money(roomInfo.totals.owner, "MAD")}</p>
          </div>
          <div className="boon-surface p-3">
            <p className="text-xs text-muted-foreground">{copy.workerTotal}</p>
            <p className="text-2xl font-bold">{money(roomInfo.totals.workerScope, "MAD")}</p>
          </div>
          <div className="boon-surface p-3">
            <p className="text-xs text-muted-foreground">{copy.supplierTotal}</p>
            <p className="text-2xl font-bold">{money(roomInfo.totals.supplierScope, "MAD")}</p>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="boon-surface p-3">
          <p className="mb-2 text-sm font-semibold">{labels.members}</p>
          <div className="space-y-2">
            {roomMembers.map((member) => (
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

          {supplierSearchResults.length > 0 && (
            <div className="space-y-2">
              {supplierSearchResults.map((supplier) => (
                <div key={supplier.id} className="boon-subsurface p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{supplier.fullName}</p>
                      <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLinkSupplier(supplier.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                      disabled={isRoomClosed}
                    >
                      Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {workerSupplierLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Linked Suppliers</p>
              {workerSupplierLinks.map((link) => (
                <div key={link.id} className="boon-subsurface p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{link.supplier.fullName}</p>
                      <p className="text-xs text-muted-foreground">{link.supplier.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkSupplier(link.supplierId)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                    >
                      {copy.remove}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "add" && role === "SUPPLIER" && (
        <form onSubmit={handleSendSupplierBoon} className="boon-surface p-3 space-y-3">
          <p className="text-sm font-semibold">{copy.quickRoomBoon}</p>
          {supplierLinksForMe.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Worker Link</label>
              <select
                value={quickWorkerId}
                onChange={(e) => setQuickWorkerId(e.target.value)}
                className="boon-input"
                disabled={isRoomClosed}
              >
                {supplierLinksForMe.map((link) => (
                  <option key={link.id} value={link.workerId}>
                    {link.worker.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{labels.amount}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              placeholder={labels.amount}
              className="boon-input"
              disabled={isRoomClosed}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{labels.category}</label>
            <input
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              placeholder={labels.category}
              className="boon-input"
              disabled={isRoomClosed}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{labels.note}</label>
            <textarea
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder={labels.note}
              className="boon-input"
              rows={3}
              disabled={isRoomClosed}
            />
          </div>
          <button
            type="submit"
            className="boon-primary-action w-full rounded-2xl py-3 text-sm font-black"
            disabled={isRoomClosed}
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
              className="boon-surface w-full p-3 text-left text-sm"
            >
              <p className="font-semibold">
                {doc.category || doc.type} - {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(doc.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}

      {tab === "share" && (
        <div className="space-y-2">
          {roomDocuments.length === 0 && (
            <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
              {copy.noMessagesToShare}
            </div>
          )}
          {roomDocuments.map((doc) => (
            <div key={doc.id} className="boon-surface p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">
                  {doc.category || doc.type} - {money(doc.grandTotal, doc.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {doc.supplier.fullName} - {new Date(doc.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocument(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  {copy.preview}
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(doc)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  {copy.shareWhatsapp}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(doc)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {copy.exportPdf}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-3">
          {role === "OWNER" && (
            <div className="boon-surface p-3 space-y-3">
              <p className="text-sm font-semibold">{copy.roomDetails}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">{copy.roomStatus}</span>
                <span className="text-sm font-semibold">{roomInfo?.status || "ACTIVE"}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeRoomStatus("ACTIVE")}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                  disabled={roomInfo?.status === "ACTIVE"}
                >
                  {copy.setActive}
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeRoomStatus("CLOSED")}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
                  disabled={roomInfo?.status === "CLOSED"}
                >
                  {copy.setClosed}
                </button>
              </div>
            </div>
          )}

          <div className="boon-surface p-3">
            <p className="text-sm font-semibold">{copy.roomCode}</p>
            <p className="mt-1 text-xl font-black">{roomInfo?.roomCode}</p>
          </div>
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
