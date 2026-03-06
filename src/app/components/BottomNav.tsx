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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-[#151922] dark:border-white/10 z-50">
      <div className="max-w-lg mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? "fill-blue-100" : ""}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
