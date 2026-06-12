
import {
  BarChart3,
  Briefcase,
  DollarSign,
  Home,
  MessageCircle,
  ReceiptText,
  User,
} from "lucide-react";

export const TAB_ICONS = {
  dashboard: Home,
  rooms: MessageCircle,
  boons: ReceiptText,
  projects: Briefcase,
  expenses: DollarSign,
  reports: BarChart3,
  profile: User,
};

export function BottomNav({ activeTab, tabs, onTabChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-5 md:left-1/2 md:right-auto md:w-[min(92vw,720px)] md:-translate-x-1/2">
      <div className="border-t border-border bg-card/95 px-2 py-2 backdrop-blur md:rounded-3xl md:border md:shadow-[0_18px_60px_rgba(90,50,8,0.18)]">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-black">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
