import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  Link2,
  MessageCircle,
  ReceiptText,
  Store,
  Users,
} from "lucide-react";
import type { Role } from "../api";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

type DashboardProps = {
  role: Role;
  fullName: string;
  onAddExpense: () => void;
  onCreateProject: () => void;
  canAddExpense?: boolean;
  canCreateProject?: boolean;
  addExpenseLabel?: string;
  createProjectLabel?: string;
};

type HomeAction = {
  label: string;
  description: string;
  icon: typeof ReceiptText;
  primary?: boolean;
  onClick: () => void;
  disabled?: boolean;
};

const ROLE_HOME = {
  OWNER: {
    eyebrow: "Owner workspace",
    title: "Control every room from one place",
    subtitle: "Open rooms, review worker activity, and keep supplier documents visible.",
    metrics: [
      { label: "Room setup", value: "Create", detail: "Start project rooms" },
      { label: "Approvals", value: "Review", detail: "Worker join requests" },
      { label: "Visibility", value: "Track", detail: "Room totals and documents" },
    ],
    workflow: [
      "Create a room for each site",
      "Accept workers into the room",
      "Monitor documents and exports",
    ],
  },
  WORKER: {
    eyebrow: "Worker workspace",
    title: "Keep site purchases connected",
    subtitle: "Join rooms, link suppliers, and follow the documents attached to your work.",
    metrics: [
      { label: "Rooms", value: "Join", detail: "Enter by room code" },
      { label: "Suppliers", value: "Link", detail: "Connect suppliers to rooms" },
      { label: "Feed", value: "Follow", detail: "See room activity" },
    ],
    workflow: [
      "Join the owner room",
      "Link the right supplier",
      "Check the room feed",
    ],
  },
  SUPPLIER: {
    eyebrow: "Supplier workspace",
    title: "Send clean boons in seconds",
    subtitle: "Create receipts, invoices, and quotes, then share them with the right room.",
    metrics: [
      { label: "Boons", value: "Send", detail: "Receipt, invoice, quote" },
      { label: "Store", value: "Profile", detail: "Logo and business info" },
      { label: "Archive", value: "Save", detail: "Personal documents" },
    ],
    workflow: [
      "Complete your store profile",
      "Create a personal or room boon",
      "Export or share the document",
    ],
  },
} as const;

function getActions({
  role,
  onAddExpense,
  onCreateProject,
  canAddExpense,
  canCreateProject,
  addExpenseLabel,
  createProjectLabel,
}: Pick<
  DashboardProps,
  | "role"
  | "onAddExpense"
  | "onCreateProject"
  | "canAddExpense"
  | "canCreateProject"
  | "addExpenseLabel"
  | "createProjectLabel"
>): HomeAction[] {
  if (role === "OWNER") {
    return [
      {
        label: createProjectLabel || "Open Rooms",
        description: "Create rooms, review requests, and inspect activity.",
        icon: Building2,
        primary: true,
        onClick: onCreateProject,
        disabled: !canCreateProject,
      },
      {
        label: "Review room feed",
        description: "Check documents, members, and room status.",
        icon: MessageCircle,
        onClick: onCreateProject,
        disabled: !canCreateProject,
      },
    ];
  }

  if (role === "WORKER") {
    return [
      {
        label: createProjectLabel || "Open Rooms",
        description: "Join rooms and link suppliers to your work.",
        icon: Link2,
        primary: true,
        onClick: onCreateProject,
        disabled: !canCreateProject,
      },
      {
        label: "Check room feed",
        description: "Follow supplier documents and recent activity.",
        icon: MessageCircle,
        onClick: onCreateProject,
        disabled: !canCreateProject,
      },
    ];
  }

  return [
    {
      label: addExpenseLabel || "Send Boon",
      description: "Create a receipt, invoice, or quote for a room.",
      icon: ReceiptText,
      primary: true,
      onClick: onAddExpense,
      disabled: !canAddExpense,
    },
    {
      label: "Open documents",
      description: "View personal boons and room documents.",
      icon: ClipboardList,
      onClick: onAddExpense,
      disabled: !canAddExpense,
    },
  ];
}

export function Dashboard({
  role,
  fullName,
  onAddExpense,
  onCreateProject,
  canAddExpense = true,
  canCreateProject = true,
  addExpenseLabel = "Send Boon",
  createProjectLabel = "Open Rooms",
}: DashboardProps) {
  const home = ROLE_HOME[role];
  const actions = getActions({
    role,
    onAddExpense,
    onCreateProject,
    canAddExpense,
    canCreateProject,
    addExpenseLabel,
    createProjectLabel,
  });

  return (
    <div className="flex flex-col gap-4 pb-24">
      <section className="boon-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              {home.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal text-foreground sm:text-3xl">
              {home.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {home.subtitle}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground">
            {fullName}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {home.metrics.map((metric) => (
          <Card key={metric.label} className="boon-surface border-0 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-black leading-none">{metric.value}</p>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="boon-surface p-4">
        <p className="mb-3 text-sm font-black">Next actions</p>
        <div className="grid gap-3 md:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                variant={action.primary ? "default" : "outline"}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`h-auto min-h-20 justify-between rounded-2xl px-4 py-4 text-left ${
                  action.primary ? "boon-primary-action" : "boon-outline-action"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-current/15 bg-current/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{action.label}</span>
                    <span className="mt-1 block whitespace-normal text-xs font-medium opacity-75">
                      {action.description}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            );
          })}
        </div>
      </section>

      <section className="boon-surface p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-secondary p-3 text-foreground">
            {role === "SUPPLIER" ? (
              <Store className="h-5 w-5" />
            ) : role === "WORKER" ? (
              <Users className="h-5 w-5" />
            ) : (
              <BadgeCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-black">How your role works</p>
            <ol className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
              {home.workflow.map((item, index) => (
                <li key={item}>
                  <span className="font-bold text-foreground">{index + 1}.</span> {item}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
