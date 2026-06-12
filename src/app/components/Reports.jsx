
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CalendarDays, Layers3, ReceiptText } from "lucide-react";
import { getAnalyticsOverview } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const PIE_COLORS = ["#0916a3", "#214dff", "#6ea8ff", "#0f2f7a", "#7b8fb8"];

const COPY = {
  en: {
    title: "Reports",
    subtitle: "Automatic totals and trends based on real documents.",
    loading: "Loading analytics...",
    amount: "Amount",
    today: "Today",
    week: "This week",
    month: "This month",
    all: "All time",
    last7Days: "Last 7 days",
    byType: "By document type",
    byCategory: "By category",
    scope: "Scope",
    personal: "Personal documents",
    room: "Room documents",
    documents: "Total documents",
    rooms: "Rooms touched",
    topSuppliers: "Top suppliers",
    noSupplierActivity: "No supplier activity yet.",
    docs: "documents",
    failed: "Failed to load reports",
  },
  fr: {
    title: "Rapports",
    subtitle: "Totaux et tendances automatiques basés sur les vrais documents.",
    loading: "Chargement des analyses...",
    amount: "Montant",
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    all: "Depuis le début",
    last7Days: "7 derniers jours",
    byType: "Par type de document",
    byCategory: "Par catégorie",
    scope: "Périmètre",
    personal: "Documents personnels",
    room: "Documents room",
    documents: "Total documents",
    rooms: "Rooms touchés",
    topSuppliers: "Top suppliers",
    noSupplierActivity: "Aucune activité supplier pour le moment.",
    docs: "documents",
    failed: "Echec du chargement des rapports",
  },
  ar: {
    title: "Reports",
    subtitle: "Automatic totals and trends based on real documents.",
    loading: "Loading analytics...",
    amount: "Amount",
    today: "Today",
    week: "This week",
    month: "This month",
    all: "All time",
    last7Days: "Last 7 days",
    byType: "By document type",
    byCategory: "By category",
    scope: "Scope",
    personal: "Personal documents",
    room: "Room documents",
    documents: "Total documents",
    rooms: "Rooms touched",
    topSuppliers: "Top suppliers",
    noSupplierActivity: "No supplier activity yet.",
    docs: "documents",
    failed: "Failed to load reports",
  },
};

function money(value) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
  }).format(value || 0);
}

export function Reports({ token, language }) {
  const copy = useMemo(() => COPY[language === "ar" ? "en" : language], [language]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAnalyticsOverview(token)
      .then((response) => {
        setData(response);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : copy.failed);
      })
      .finally(() => setLoading(false));
  }, [copy.failed, token]);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <p className="mt-1 text-muted-foreground">{copy.subtitle}</p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <Card className="boon-surface border-0 shadow-none">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {copy.loading}
          </CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card className="boon-surface border-0 shadow-none">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm">{copy.today}</span>
                </div>
                <p className="text-2xl font-bold">{money(data.totals.today)}</p>
              </CardContent>
            </Card>

            <Card className="boon-surface border-0 shadow-none">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm">{copy.week}</span>
                </div>
                <p className="text-2xl font-bold">{money(data.totals.week)}</p>
              </CardContent>
            </Card>

            <Card className="boon-surface border-0 shadow-none">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Layers3 className="h-4 w-4" />
                  <span className="text-sm">{copy.month}</span>
                </div>
                <p className="text-2xl font-bold">{money(data.totals.month)}</p>
              </CardContent>
            </Card>

            <Card className="boon-surface border-0 shadow-none">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <ReceiptText className="h-4 w-4" />
                  <span className="text-sm">{copy.all}</span>
                </div>
                <p className="text-2xl font-bold">{money(data.totals.all)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="boon-surface border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">{copy.last7Days}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.last7Days}>
                  <defs>
                    <linearGradient id="boonArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#214dff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#214dff" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [money(Number(value)), copy.amount]} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0916a3"
                    strokeWidth={2}
                    fill="url(#boonArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="boon-surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">{copy.byType}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [money(Number(value)), copy.amount]} />
                    <Bar dataKey="amount" fill="#0916a3" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="boon-surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">{copy.byCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.byCategory}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={54}
                      outerRadius={88}
                    >
                      {data.byCategory.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [money(Number(value)), copy.amount]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="boon-surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">{copy.scope}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-muted px-3 py-3">
                  <span>{copy.personal}</span>
                  <strong>{money(data.totals.personal)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted px-3 py-3">
                  <span>{copy.room}</span>
                  <strong>{money(data.totals.room)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted px-3 py-3">
                  <span>{copy.documents}</span>
                  <strong>{data.documentsCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted px-3 py-3">
                  <span>{copy.rooms}</span>
                  <strong>{data.roomsCount}</strong>
                </div>
              </CardContent>
            </Card>

            <Card className="boon-surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">{copy.topSuppliers}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topSuppliers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {copy.noSupplierActivity}
                  </p>
                )}
                {data.topSuppliers.map((supplier) => (
                  <div
                    key={supplier.supplierId}
                    className="flex items-center justify-between rounded-2xl border border-border px-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{supplier.supplierName}</p>
                      <p className="text-xs text-muted-foreground">
                        {supplier.count} {copy.docs}
                      </p>
                    </div>
                    <strong>{money(supplier.amount)}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
