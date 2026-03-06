import { useEffect, useState } from "react";
import {
  createDocument,
  getDocumentPdfUrl,
  getDocumentShare,
  listPersonalDocuments,
  listRoomDocuments,
  listRooms,
  listWorkerSuppliers,
} from "../api";
import type { DocumentRecord, Role, RoomSummary } from "../api";

type Props = {
  token: string;
  role: Role;
  userId: string;
  labels: {
    title: string;
    subtitle: string;
    personalTitle: string;
    roomTitle: string;
    amount: string;
    category: string;
    note: string;
    createPersonal: string;
    share: string;
    pdf: string;
    room: string;
    noData: string;
  };
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency || "MAD",
  }).format(value);
}

export function BoonCenter({ token, role, userId, labels }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState("");
  const [personalDocs, setPersonalDocs] = useState<DocumentRecord[]>([]);
  const [roomDocs, setRoomDocs] = useState<DocumentRecord[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    const nextRooms = await listRooms(token);
    setRooms(nextRooms);
    if (!roomId && nextRooms.length > 0) {
      setRoomId(nextRooms[0].id);
    }
    if (role === "SUPPLIER") {
      const personal = await listPersonalDocuments(token);
      setPersonalDocs(personal);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Load failed");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  useEffect(() => {
    if (!roomId) return;
    listRoomDocuments(token, roomId)
      .then((docs) => setRoomDocs(docs))
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Load room docs failed");
      });
  }, [roomId, token]);

  async function handleCreatePersonal(event: React.FormEvent) {
    event.preventDefault();
    if (role !== "SUPPLIER") return;
    setError(null);
    setNotice(null);
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    try {
      await createDocument(token, {
        type: "RECEIPT",
        isPersonal: true,
        quickAmount: amountNumber,
        category: category.trim() || "General",
        note: note.trim(),
        currency: "MAD",
      });
      setAmount("");
      setCategory("");
      setNote("");
      const refreshed = await listPersonalDocuments(token);
      setPersonalDocs(refreshed);
      setNotice("Personal boon created.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Create failed");
    }
  }

  async function handleShare(doc: DocumentRecord) {
    try {
      const result = await getDocumentShare(token, doc.id);
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Share failed");
    }
  }

  function handlePdf(doc: DocumentRecord) {
    const url = getDocumentPdfUrl(doc.id, token);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSendRoomBoonFromCenter(event: React.FormEvent) {
    event.preventDefault();
    if (role !== "SUPPLIER" || !roomId) return;
    setError(null);
    setNotice(null);
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    try {
      const links = await listWorkerSuppliers(token, roomId);
      const own = links.find((entry) => entry.supplierId === userId);
      if (!own) {
        setError("No worker link in this room.");
        return;
      }

      await createDocument(token, {
        type: "RECEIPT",
        isPersonal: false,
        roomId,
        workerId: own.workerId,
        quickAmount: amountNumber,
        category: category.trim() || "General",
        note: note.trim(),
        currency: "MAD",
      });
      setAmount("");
      setCategory("");
      setNote("");
      const refreshedRoomDocs = await listRoomDocuments(token, roomId);
      setRoomDocs(refreshedRoomDocs);
      setNotice("Room boon sent.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Create failed");
    }
  }

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

      {role === "SUPPLIER" && (
        <form
          onSubmit={roomId ? handleSendRoomBoonFromCenter : handleCreatePersonal}
          className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
        >
          <p className="font-semibold text-sm">{roomId ? labels.roomTitle : labels.personalTitle}</p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={labels.amount}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder={labels.category}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={labels.note}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button className="w-full rounded-lg bg-blue-600 py-2 text-white text-sm font-semibold">
            {labels.createPersonal}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
        <label className="text-xs text-gray-500">{labels.room}</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          disabled={rooms.length === 0 || loading}
        >
          {rooms.length === 0 && <option value="">{labels.noData}</option>}
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} ({room.roomCode})
            </option>
          ))}
        </select>
      </div>

      {role === "SUPPLIER" && (
        <section className="space-y-2">
          <p className="text-sm font-semibold">{labels.personalTitle}</p>
          {personalDocs.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
              {labels.noData}
            </div>
          )}
          {personalDocs.map((doc) => (
            <article
              key={doc.id}
              className="rounded-xl border border-gray-200 bg-white p-3 text-sm space-y-2"
            >
              <p className="font-semibold">
                {doc.type} • {money(doc.grandTotal, doc.currency)}
              </p>
              <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleString()}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(doc)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                >
                  {labels.share}
                </button>
                <button
                  type="button"
                  onClick={() => handlePdf(doc)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                >
                  {labels.pdf}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold">{labels.roomTitle}</p>
        {roomDocs.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
            {labels.noData}
          </div>
        )}
        {roomDocs.map((doc) => (
          <article
            key={doc.id}
            className="rounded-xl border border-gray-200 bg-white p-3 text-sm space-y-2"
          >
            <p className="font-semibold">
              {doc.supplier.fullName} • {money(doc.grandTotal, doc.currency)}
            </p>
            <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleString()}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleShare(doc)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
              >
                {labels.share}
              </button>
              <button
                type="button"
                onClick={() => handlePdf(doc)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
              >
                {labels.pdf}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
