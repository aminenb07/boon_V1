import {
  BarChart3,
  Briefcase,
  DollarSign,
  Home,
  MessageCircle,
  ReceiptText,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  tabs: BottomTab[];
  onTabChange: (tab: string) => void;
}

export type BottomTabId =
  | "dashboard"
  | "rooms"
  | "boons"
  | "projects"
  | "expenses"
  | "reports"
  | "profile";

export type BottomTab = {
  id: BottomTabId;
  icon: LucideIcon;
  label: string;
};

export const TAB_ICONS: Record<BottomTabId, LucideIcon> = {
  dashboard: Home,
  rooms: MessageCircle,
  boons: ReceiptText,
  projects: Briefcase,
  expenses: DollarSign,
  reports: BarChart3,
  profile: User,
};

export function BottomNav({ activeTab, tabs, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-5 md:left-1/2 md:right-auto md:w-[min(92vw,720px)] md:-translate-x-1/2">
      <div className="border-t border-border bg-card/95 px-2 py-2 backdrop-blur md:rounded-3xl md:border md:shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isActive ? "text-amber-500" : ""}`} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
