import { X, Building2, Users, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface ProjectDetailsProps {
  project: {
    id: string;
    name: string;
    client: string;
    totalSpent: number;
    budget: number;
    status: "active" | "completed" | "on-hold";
    lastUpdated: string;
  };
  onClose: () => void;
}

export function ProjectDetails({ project, onClose }: ProjectDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "on-hold":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const progressPercentage = Math.min((project.totalSpent / project.budget) * 100, 100);
  const remainingBudget = project.budget - project.totalSpent;

  // Mock recent expenses for this project
  const recentExpenses = [
    { id: "1", title: "Cement - 50 bags", amount: 1250, date: "2024-12-22" },
    { id: "2", title: "Steel rods - 2 tons", amount: 3800, date: "2024-12-21" },
    { id: "3", title: "Electrical wiring supplies", amount: 680, date: "2024-12-20" }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-0 sm:border">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Project Details</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Project Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                <Badge className={getStatusColor(project.status)} variant="outline">
                  {project.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Budget Overview */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm opacity-90 mb-1">Total Spent</p>
                <p className="text-2xl font-bold">${(project.totalSpent / 1000).toFixed(1)}K</p>
              </div>
              <div>
                <p className="text-sm opacity-90 mb-1">Remaining</p>
                <p className="text-2xl font-bold">${(remainingBudget / 1000).toFixed(1)}K</p>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="opacity-90">Budget Progress</span>
                <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-semibold">{project.client}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="font-semibold">${project.budget.toLocaleString()}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-semibold">{project.lastUpdated}</p>
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div>
            <h4 className="font-semibold mb-3">Recent Expenses</h4>
            <div className="space-y-2">
              {recentExpenses.map((expense) => (
                <div 
                  key={expense.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.title}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(expense.date).toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric" 
                      })}
                    </p>
                  </div>
                  <span className="font-semibold ml-3">${expense.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button variant="outline" className="h-12">
              View All Expenses
            </Button>
            <Button className="h-12 bg-blue-600 hover:bg-blue-700">
              Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
