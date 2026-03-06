import { X, Building2, Calendar, DollarSign, Tag, FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface ExpenseDetailsProps {
  expense: {
    id: string;
    title: string;
    category: string;
    amount: number;
    date: string;
    project: string;
  };
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  materials: "bg-blue-100 text-blue-700 border-blue-200",
  labor: "bg-amber-100 text-amber-700 border-amber-200",
  transport: "bg-green-100 text-green-700 border-green-200",
  equipment: "bg-purple-100 text-purple-700 border-purple-200",
  other: "bg-gray-100 text-gray-700 border-gray-200"
};

export function ExpenseDetails({ expense, onClose }: ExpenseDetailsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-0 sm:border">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Expense Details</CardTitle>
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
          {/* Amount Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-xl">
            <p className="text-sm opacity-90 mb-2">Total Amount</p>
            <p className="text-4xl font-bold">${expense.amount.toLocaleString()}</p>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Title */}
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="font-semibold">{expense.title}</p>
              </div>
            </div>

            <Separator />

            {/* Category */}
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <Badge 
                  variant="outline" 
                  className={`${categoryColors[expense.category]} capitalize`}
                >
                  {expense.category}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Project */}
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Project</p>
                <p className="font-semibold">{expense.project}</p>
              </div>
            </div>

            <Separator />

            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="font-semibold">{formatDate(expense.date)}</p>
              </div>
            </div>

            <Separator />

            {/* Receipt Photo Placeholder */}
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">Receipt</p>
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No receipt attached</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button variant="outline" className="h-12">
              Edit
            </Button>
            <Button variant="destructive" className="h-12">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
