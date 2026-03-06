import { Search, Filter, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useState } from "react";

interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  project: string;
}

interface ExpensesProps {
  onSelectExpense: (expense: Expense) => void;
}

const mockExpenses: Expense[] = [
  {
    id: "1",
    title: "Cement - 50 bags",
    category: "materials",
    amount: 1250,
    date: "2024-12-22",
    project: "Villa Construction - Phase 2"
  },
  {
    id: "2",
    title: "Labor - Day shift team",
    category: "labor",
    amount: 2400,
    date: "2024-12-22",
    project: "Office Building Renovation"
  },
  {
    id: "3",
    title: "Steel rods - 2 tons",
    category: "materials",
    amount: 3800,
    date: "2024-12-21",
    project: "Villa Construction - Phase 2"
  },
  {
    id: "4",
    title: "Equipment rental - Crane",
    category: "equipment",
    amount: 850,
    date: "2024-12-21",
    project: "Residential Complex - Unit 5"
  },
  {
    id: "5",
    title: "Transportation - Material delivery",
    category: "transport",
    amount: 450,
    date: "2024-12-20",
    project: "Office Building Renovation"
  },
  {
    id: "6",
    title: "Electrical wiring supplies",
    category: "materials",
    amount: 680,
    date: "2024-12-20",
    project: "Villa Construction - Phase 2"
  },
  {
    id: "7",
    title: "Plumbing fixtures",
    category: "materials",
    amount: 1150,
    date: "2024-12-19",
    project: "Residential Complex - Unit 5"
  },
  {
    id: "8",
    title: "Labor - Weekend team",
    category: "labor",
    amount: 1800,
    date: "2024-12-19",
    project: "Office Building Renovation"
  }
];

const categoryColors: Record<string, string> = {
  materials: "bg-blue-100 text-blue-700 border-blue-200",
  labor: "bg-amber-100 text-amber-700 border-amber-200",
  transport: "bg-green-100 text-green-700 border-green-200",
  equipment: "bg-purple-100 text-purple-700 border-purple-200",
  other: "bg-gray-100 text-gray-700 border-gray-200"
};

export function Expenses({ onSelectExpense }: ExpensesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredExpenses = mockExpenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.project.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <h2 className="text-2xl font-bold">Expenses</h2>
        <p className="text-gray-600 mt-1">Track all your expenses</p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-blue-600" : ""}
          >
            All
          </Button>
          <Button
            variant={selectedCategory === "materials" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("materials")}
            className={selectedCategory === "materials" ? "bg-blue-600" : ""}
          >
            Materials
          </Button>
          <Button
            variant={selectedCategory === "labor" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("labor")}
            className={selectedCategory === "labor" ? "bg-blue-600" : ""}
          >
            Labor
          </Button>
          <Button
            variant={selectedCategory === "transport" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("transport")}
            className={selectedCategory === "transport" ? "bg-blue-600" : ""}
          >
            Transport
          </Button>
          <Button
            variant={selectedCategory === "equipment" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("equipment")}
            className={selectedCategory === "equipment" ? "bg-blue-600" : ""}
          >
            Equipment
          </Button>
        </div>
      </div>

      {/* Total Summary */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none">
        <CardContent className="pt-6">
          <p className="text-sm opacity-90 mb-1">Total {selectedCategory ? `(${selectedCategory})` : ""}</p>
          <p className="text-3xl font-bold">${totalAmount.toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-1">{filteredExpenses.length} transactions</p>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.map((expense) => (
          <Card 
            key={expense.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectExpense(expense)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{expense.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-2">{expense.project}</p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${categoryColors[expense.category]} text-xs`}
                    >
                      {expense.category}
                    </Badge>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(expense.date)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-lg font-bold">${expense.amount.toLocaleString()}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No expenses found</p>
        </div>
      )}
    </div>
  );
}
