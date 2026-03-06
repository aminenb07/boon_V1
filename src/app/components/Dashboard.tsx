import { ArrowRight, Building2, MessageCircle, ReceiptText } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type DashboardProps = {
  onAddExpense: () => void;
  onCreateProject: () => void;
  canAddExpense?: boolean;
  canCreateProject?: boolean;
  addExpenseLabel?: string;
  createProjectLabel?: string;
};

export function Dashboard({
  onAddExpense,
  onCreateProject,
  canAddExpense = true,
  canCreateProject = true,
  addExpenseLabel = "Send Boon",
  createProjectLabel = "Open Rooms",
}: DashboardProps) {
  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="boon-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          BOON
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight">Mobile Control Center</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create boons fast, follow room activity, and share documents instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="boon-surface border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Quick Boons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">Fast</p>
            <p className="text-xs text-muted-foreground">Receipt / Invoice / Quote</p>
          </CardContent>
        </Card>

        <Card className="boon-surface border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Room Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">Live</p>
            <p className="text-xs text-muted-foreground">Chat-style visibility</p>
          </CardContent>
        </Card>
      </div>

      <Card className="boon-surface border-0 shadow-none">
        <CardContent className="pt-5">
          <div className="space-y-3">
            <Button
              type="button"
              onClick={onAddExpense}
              disabled={!canAddExpense}
              className="h-12 w-full justify-between bg-blue-600 hover:bg-blue-700"
            >
              <span className="inline-flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                {addExpenseLabel}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCreateProject}
              disabled={!canCreateProject}
              className="h-12 w-full justify-between border-border bg-background text-foreground hover:bg-muted"
            >
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {createProjectLabel}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="boon-surface border-0 shadow-none">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 p-2 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Rooms + Boons Workflow</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Owner creates rooms, worker links suppliers, supplier sends immutable boons.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
