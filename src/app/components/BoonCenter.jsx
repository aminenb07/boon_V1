
import { useEffect, useMemo, useState } from "react";
import {
  createDocument,
  deleteDocument,
  exportDocumentPdf,
  getDocumentShare,
  listPersonalDocuments,
  listRoomDocuments,
  listRooms,
  listWorkerSuppliers,
} from "../api";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

const EXTRA_COPY = {
  en: {
    destinationPersonal: "Personal",
    destinationRoom: "Room",
    builderQuick: "Quick",
    builderItems: "Items",
    chooseRoom: "Choose room",
    roomPickerTitle: "Room documents view",
    roomPickerHint: "Select a room to load the documents you are allowed to see.",
    chooseRoomFirst: "Choose a room first.",
    loadRoomDocs: "Choose a room to load room documents.",
    noWorkerLink: "No worker link in this room.",
    roomSent: "Room document sent.",
    personalCreated: "Personal document created.",
    personalDeleted: "Personal document deleted.",
    createFailed: "Create failed",
    deleteFailed: "Delete failed",
    loadFailed: "Load failed",
    loadRoomFailed: "Load room docs failed",
    amountInvalid: "Amount must be greater than 0.",
    productName: "Product name",
    quantity: "Qty",
    unitPrice: "Unit price",
    lineTotal: "Line total",
    grandTotal: "Grand total",
    addItem: "+ Add Item",
    remove: "Remove",
    saveAndSend: "Save and send to room",
    roomClosed: "Room closed: read-only mode.",
  },
  fr: {
    destinationPersonal: "Personnel",
    destinationRoom: "Room",
    builderQuick: "Rapide",
    builderItems: "Articles",
    chooseRoom: "Choisir room",
    roomPickerTitle: "Vue des documents room",
    roomPickerHint: "Choisissez une room pour charger les documents autorisés.",
    chooseRoomFirst: "Choisissez d'abord une room.",
    loadRoomDocs: "Choisissez une room pour charger les docs room.",
    noWorkerLink: "Aucun lien worker dans cette room.",
    roomSent: "Document envoyé vers la room.",
    personalCreated: "Document personnel crée.",
    personalDeleted: "Document personnel supprimé.",
    createFailed: "Echec de création",
    deleteFailed: "Echec de suppression",
    loadFailed: "Echec de chargement",
    loadRoomFailed: "Echec de chargement des docs room",
    amountInvalid: "Le montant doit être supérieur à 0.",
    productName: "Produit",
    quantity: "Qte",
    unitPrice: "Prix unitaire",
    lineTotal: "Ligne",
    grandTotal: "Total général",
    addItem: "+ Ajouter article",
    remove: "Supprimer",
    saveAndSend: "Enregistrer et envoyer",
    roomClosed: "Room fermée : mode lecture seule.",
  },
  ar: {
    destinationPersonal: "شخصي",
    destinationRoom: "غرفة",
    builderQuick: "سريع",
    builderItems: "عناصر",
    chooseRoom: "اختر الغرفة",
    roomPickerTitle: "عرض وثائق الغرف",
    roomPickerHint: "اختر غرفة لتحميل الوثائق التي يسمح لك برؤيتها.",
    chooseRoomFirst: "اختر الغرفة أولا.",
    loadRoomDocs: "اختر غرفة لتحميل وثائق الغرفة.",
    noWorkerLink: "لا يوجد ربط مع عامل داخل هذه الغرفة.",
    roomSent: "تم إرسال الوثيقة إلى الغرفة.",
    personalCreated: "تم إنشاء الوثيقة الشخصية.",
    personalDeleted: "تم حذف الوثيقة الشخصية.",
    createFailed: "فشل الإنشاء",
    deleteFailed: "فشل الحذف",
    loadFailed: "فشل التحميل",
    loadRoomFailed: "فشل تحميل وثائق الغرفة",
    amountInvalid: "يجب أن يكون المبلغ أكبر من 0.",
    productName: "اسم المنتج",
    quantity: "الكمية",
    unitPrice: "ثمن الوحدة",
    lineTotal: "مجموع السطر",
    grandTotal: "المجموع العام",
    addItem: "+ إضافة عنصر",
    remove: "حذف",
    saveAndSend: "حفظ وإرسال إلى الغرفة",
    roomClosed: "الغرفة مغلقة: وضع قراءة فقط.",
  },
};

function money(value, currency) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency || "MAD",
  }).format(value);
}

function makeItem() {
  return {
    id: crypto.randomUUID(),
    productName: "",
    qty: "1",
    unit: "Unit",
    unitPrice: "",
  };
}

export function BoonCenter({ token, role, userId, language, labels }) {
  const copy = EXTRA_COPY[language];
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [destination, setDestination] = useState("personal");
  const [builderMode, setBuilderMode] = useState("items");
  const [docType, setDocType] = useState("RECEIPT");
  const [personalDocs, setPersonalDocs] = useState([]);
  const [roomDocs, setRoomDocs] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState([makeItem()]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === roomId) ?? null,
    [roomId, rooms],
  );

  const selectedRoomClosed = selectedRoom?.status === "CLOSED";

  const parsedItems = useMemo(
    () =>
      items
        .map((item) => ({
          productName: item.productName.trim(),
          qty: Number(item.qty),
          unit: item.unit.trim(),
          unitPrice: Number(item.unitPrice),
        }))
        .filter(
          (item) =>
            item.productName &&
            Number.isFinite(item.qty) &&
            item.qty > 0 &&
            Number.isFinite(item.unitPrice) &&
            item.unitPrice >= 0,
        ),
    [items],
  );

  const itemsTotal = useMemo(
    () => parsedItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [parsedItems],
  );

  async function refreshLists(activeRoomId) {
    const nextRooms = await listRooms(token);
    setRooms(nextRooms);

    const currentRoomId = activeRoomId ?? roomId;
    if (role === "SUPPLIER") {
      const personal = await listPersonalDocuments(token);
      setPersonalDocs(personal);
    }
    if (currentRoomId) {
      const docs = await listRoomDocuments(token, currentRoomId);
      setRoomDocs(docs);
    } else {
      setRoomDocs([]);
    }
  }

  useEffect(() => {
    setLoading(true);
    refreshLists()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [copy.loadFailed, token, role, userId]);

  useEffect(() => {
    if (!roomId) {
      setRoomDocs([]);
      return;
    }
    listRoomDocuments(token, roomId)
      .then((docs) => {
        setRoomDocs(docs);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : copy.loadRoomFailed);
      });
  }, [copy.loadRoomFailed, roomId, token, userId]);

  function updateItem(id, field, value) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((current) => [...current, makeItem()]);
  }

  function removeItem(id) {
    setItems((current) =>
      current.length === 1 ? [makeItem()] : current.filter((item) => item.id !== id),
    );
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (role !== "SUPPLIER") return;

    setError(null);
    setNotice(null);

    const useItems = builderMode === "items" && parsedItems.length > 0;
    const amountNumber = Number(amount);

    if (!useItems && (!Number.isFinite(amountNumber) || amountNumber <= 0)) {
      setError(copy.amountInvalid);
      return;
    }

    try {
      const payload = {
        type: docType,
        category:
          category.trim() ||
          (useItems ? parsedItems[0]?.productName || "General" : "General"),
        note: note.trim(),
        currency: "MAD",
        ...(useItems
          ? {
              items: parsedItems.map((item) => ({
                productName: item.productName,
                qty: item.qty,
                unit: item.unit || undefined,
                unitPrice: item.unitPrice,
              })),
            }
          : {
              quickAmount: amountNumber,
            }),
      };

      if (destination === "room") {
        if (!roomId) {
          setError(copy.chooseRoomFirst);
          return;
        }
        if (selectedRoomClosed) {
          setError(copy.roomClosed);
          return;
        }

        const links = await listWorkerSuppliers(token, roomId);
        const own = links.find((link) => link.supplierId === userId);
        if (!own) {
          setError(copy.noWorkerLink);
          return;
        }

        await createDocument(token, {
          ...payload,
          isPersonal: false,
          roomId,
          workerId: own.workerId,
        });
        setNotice(copy.roomSent);
      } else {
        await createDocument(token, {
          ...payload,
          isPersonal: true,
        });
        setNotice(copy.personalCreated);
      }

      setAmount("");
      setCategory("");
      setNote("");
      setItems([makeItem()]);
      await refreshLists(roomId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.createFailed);
    }
  }

  async function handleShare(doc) {
    const popup = typeof navigator.share === "function"
      ? null
      : window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const result = await getDocumentShare(token, doc.id);
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: doc.category || doc.type,
          text: result.message || `${doc.category || doc.type} - ${money(doc.grandTotal, doc.currency)}`,
        });
        return;
      }
      if (popup) {
        popup.location.replace(result.whatsappUrl);
      } else {
        window.location.href = result.whatsappUrl;
      }
    } catch (shareError) {
      popup?.close();
      setError(shareError instanceof Error ? shareError.message : labels.share);
    }
  }

  async function handlePdf(doc) {
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
      setError(pdfError instanceof Error ? pdfError.message : labels.pdf);
    }
  }

  async function handleDelete(doc) {
    try {
      await deleteDocument(token, doc.id);
      setSelectedDocument(null);
      await refreshLists(roomId);
      setNotice(copy.personalDeleted);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : copy.deleteFailed);
    }
  }

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
        <p className="boon-success-note">
          {notice}
        </p>
      )}

      {role === "SUPPLIER" && (
        <form onSubmit={handleCreate} className="boon-surface space-y-3 p-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-muted p-1">
              <div className="grid grid-cols-2 gap-1">
                {["personal", "room"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDestination(value)}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                      destination === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {value === "personal" ? copy.destinationPersonal : copy.destinationRoom}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-muted p-1">
              <div className="grid grid-cols-2 gap-1">
                {["quick", "items"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBuilderMode(value)}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                      builderMode === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {value === "quick" ? copy.builderQuick : copy.builderItems}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
              className="boon-input"
            >
              <option value="RECEIPT">Receipt</option>
              <option value="INVOICE">Invoice</option>
              <option value="QUOTE">Quote</option>
            </select>
          </div>

          {destination === "room" && (
            <div className="boon-subsurface p-3">
              <label className="text-xs text-muted-foreground">{labels.room}</label>
              <select
                className="boon-input mt-2"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                disabled={rooms.length === 0 || loading}
              >
                <option value="">{copy.chooseRoom}</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.roomCode})
                  </option>
                ))}
              </select>
              {selectedRoomClosed && (
                <p className="mt-2 text-xs font-semibold text-primary">
                  {copy.roomClosed}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={labels.category}
              className="boon-input"
            />
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={labels.note}
              className="boon-input"
            />
          </div>

          {builderMode === "quick" ? (
            <div className="boon-subsurface p-3">
              <label className="text-xs text-muted-foreground">{labels.amount}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={labels.amount}
                className="boon-input mt-2"
              />
            </div>
          ) : (
            <div className="boon-subsurface space-y-3 p-3">
              {items.map((item, index) => {
                const qty = Number(item.qty);
                const unitPrice = Number(item.unitPrice);
                const lineTotal =
                  Number.isFinite(qty) && Number.isFinite(unitPrice)
                    ? qty * unitPrice
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-background/80 p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[2fr_0.8fr_0.9fr_1fr_auto]">
                      <input
                        value={item.productName}
                        onChange={(event) =>
                          updateItem(item.id, "productName", event.target.value)
                        }
                        placeholder={
                          index === 0 ? copy.productName : `${copy.productName} ${index + 1}`
                        }
                        className="boon-input"
                      />
                      <input
                        value={item.qty}
                        onChange={(event) => updateItem(item.id, "qty", event.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={copy.quantity}
                        className="boon-input"
                      />
                      <select
                        value={item.unit}
                        onChange={(event) => updateItem(item.id, "unit", event.target.value)}
                        className="boon-input"
                      >
                        <option value="Unit">Unit</option>
                        <option value="Bags">Bags</option>
                        <option value="Kg">Kg</option>
                        <option value="m2">m2</option>
                        <option value="m3">m3</option>
                        <option value="Hours">Hours</option>
                      </select>
                      <input
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.id, "unitPrice", event.target.value)
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={copy.unitPrice}
                        className="boon-input"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-2xl border border-red-200 px-3 py-3 text-xs font-semibold text-red-600 dark:border-red-900/60 dark:text-red-300"
                      >
                        {copy.remove}
                      </button>
                    </div>
                    <p className="mt-2 text-right text-xs text-muted-foreground">
                      {copy.lineTotal}: {money(lineTotal, "MAD")}
                    </p>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold"
                >
                  {copy.addItem}
                </button>
                <strong className="text-sm">
                  {copy.grandTotal}: {money(itemsTotal, "MAD")}
                </strong>
              </div>
            </div>
          )}

          <button
            className="boon-primary-action w-full rounded-2xl py-3 text-sm font-black disabled:opacity-60"
            disabled={destination === "room" && selectedRoomClosed}
          >
            {destination === "room" ? copy.saveAndSend : labels.createPersonal}
          </button>
        </form>
      )}

      <section className="boon-surface space-y-3 p-3">
        <div>
          <p className="text-sm font-semibold">{copy.roomPickerTitle}</p>
          <p className="text-xs text-muted-foreground">{copy.roomPickerHint}</p>
        </div>
        <select
          className="boon-input"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          disabled={rooms.length === 0 || loading}
        >
          <option value="">{copy.chooseRoom}</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} ({room.roomCode})
            </option>
          ))}
        </select>
      </section>

      {role === "SUPPLIER" && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{labels.personalTitle}</p>
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {personalDocs.length}
            </span>
          </div>
          {personalDocs.length === 0 && (
            <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
              {labels.noData}
            </div>
          )}
          {personalDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDocument(doc)}
              className="boon-surface w-full space-y-2 p-3 text-left text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {doc.type} - {money(doc.grandTotal, doc.currency)}
                </p>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-800 dark:border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {copy.destinationPersonal}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(doc.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{labels.roomTitle}</p>
          {selectedRoom && (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {selectedRoom.name}
            </span>
          )}
        </div>
        {!roomId && (
          <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
            {copy.loadRoomDocs}
          </div>
        )}
        {roomId && roomDocs.length === 0 && (
          <div className="boon-surface border-dashed p-3 text-sm text-muted-foreground">
            {labels.noData}
          </div>
        )}
        {roomDocs.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setSelectedDocument(doc)}
            className="boon-surface w-full space-y-2 p-3 text-left text-sm"
          >
            <p className="font-semibold">
              {doc.supplier.fullName} - {money(doc.grandTotal, doc.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(doc.createdAt).toLocaleString()}
            </p>
          </button>
        ))}
      </section>

      <DocumentPreviewModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onShare={handleShare}
        onExport={handlePdf}
        onDelete={handleDelete}
      />
    </div>
  );
}
