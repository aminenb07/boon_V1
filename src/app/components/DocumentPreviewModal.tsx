import boonLogo from "../../assets/boon.png";
import type { DocumentRecord } from "../api";

// This type defines the data shape for props.
type Props = {
  document: DocumentRecord | null;
  onClose: () => void;
  onShare: (document: DocumentRecord) => void;
  onExport: (document: DocumentRecord) => void;
  onDelete?: (document: DocumentRecord) => void;
};

// This function runs.
function money(value: number, currency: string) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency || "MAD",
  }).format(value);
}

// This function runs image attachment.
function isImageAttachment(mimeType?: string | null) {
  return typeof mimeType === "string" && mimeType.startsWith("image/");
}

// This component renders the document preview modal UI.
export function DocumentPreviewModal({
  document,
  onClose,
  onShare,
  onExport,
  onDelete,
}: Props) {
  if (!document) return null;

  // This variable stores the logo url value.
  const logoUrl = document.storeProfile.logoUrl || boonLogo;
  // This variable stores the rows value.
  const rows =
    document.items.length > 0
      ? document.items
      : [
          {
            id: "quick",
            productName: document.category || document.type,
            qty: 1,
            unit: null,
            unitPrice: document.grandTotal,
            lineTotal: document.grandTotal,
            position: 0,
          },
        ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 px-3 py-6 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border bg-background shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              BOON document preview
            </p>
            <h3 className="text-lg font-bold">
              {document.category || document.type}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 md:px-8">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-[#c9d8ff] bg-[#f7fbff] p-5 text-slate-950 shadow-[0_18px_60px_rgba(9,22,163,0.12)]">
            <div className="flex flex-col gap-4 border-b border-[#c9d8ff] pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <img
                  src={logoUrl}
                  alt={document.storeProfile.storeName}
                  className="h-16 w-16 rounded-2xl border border-[#c9d8ff] bg-white object-cover p-1"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0916a3]">
                    Supplier profile
                  </p>
                  <h4 className="text-2xl font-black">{document.storeProfile.storeName}</h4>
                  <p className="mt-1 text-sm text-slate-600">{document.storeProfile.address}</p>
                  <p className="text-sm text-slate-600">{document.storeProfile.phone}</p>
                  {document.storeProfile.ice && (
                    <p className="text-xs text-slate-500">ICE: {document.storeProfile.ice}</p>
                  )}
                  {document.storeProfile.rc && (
                    <p className="text-xs text-slate-500">RC: {document.storeProfile.rc}</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-[#0916a3] px-5 py-4 text-white md:min-w-[220px]">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Total</p>
                <p className="mt-2 text-3xl font-black">
                  {money(document.grandTotal, document.currency)}
                </p>
                <p className="mt-2 text-xs text-white/70">
                  {new Date(document.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-[#c9d8ff] bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#e7efff] text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 text-right font-semibold">Qty</th>
                    <th className="px-4 py-3 text-center font-semibold">Unit</th>
                    <th className="px-4 py-3 text-right font-semibold">Unit price</th>
                    <th className="px-4 py-3 text-right font-semibold">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} className="border-t border-[#dbe8ff]">
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-right">{item.qty}</td>
                      <td className="px-4 py-3 text-center">{item.unit || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {money(item.unitPrice, document.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {money(item.lineTotal, document.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {document.note && (
              <div className="mt-5 rounded-[24px] border border-[#c9d8ff] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Note
                </p>
                <p className="mt-2 text-sm text-slate-700">{document.note}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-[#c9d8ff] bg-white px-4 py-3 text-sm text-slate-600">
                Supplier: {document.supplier.fullName}
              </div>
              <div className="rounded-2xl border border-[#c9d8ff] bg-white px-4 py-3 text-sm text-slate-600">
                Scope: {document.isPersonal ? "Personal" : "Room"}
              </div>
              <div className="rounded-2xl border border-[#c9d8ff] bg-white px-4 py-3 text-sm text-slate-600">
                Type: {document.type}
              </div>
            </div>

            {document.attachments.length > 0 && (
              <div className="mt-5 rounded-[24px] border border-[#c9d8ff] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Attachments
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {document.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-2xl border border-[#c9d8ff] bg-[#edf4ff]"
                    >
                      {isImageAttachment(attachment.mimeType) ? (
                        <img
                          src={attachment.fileUrl}
                          alt="Attachment"
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
                          Open attachment
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-[#c9d8ff] pt-4 text-center text-xs text-slate-500">
              {document.storeProfile.footerNote ||
                "Merci / Livraison sur site / Paiement a la reception"}
              <br />
              Powered by BOON. Secure room-based invoice visibility for construction teams.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-5 py-4">
          {onDelete && document.isPersonal && (
            <button
              type="button"
              onClick={() => onDelete(document)}
              className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => onShare(document)}
            className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Share WhatsApp
          </button>
          <button
            type="button"
            onClick={() => onExport(document)}
            className="boon-primary-action rounded-2xl px-4 py-2 text-sm font-black"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
