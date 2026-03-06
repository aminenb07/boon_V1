import { useState } from "react";
import { X, Camera, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

interface AddExpenseProps {
  onClose: () => void;
  onSave: (expense: ExpenseData) => void;
}

export interface ExpenseData {
  title: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  project: string;
  notes: string;
}

export function AddExpense({ onClose, onSave }: AddExpenseProps) {
  const [formData, setFormData] = useState<ExpenseData>({
    title: "",
    category: "",
    quantity: 1,
    unitPrice: 0,
    total: 0,
    date: new Date().toISOString().split('T')[0],
    project: "",
    notes: ""
  });

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    setFormData({
      ...formData,
      quantity,
      total: quantity * formData.unitPrice
    });
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = parseFloat(value) || 0;
    setFormData({
      ...formData,
      unitPrice,
      total: formData.quantity * unitPrice
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-0 sm:border">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              Add New Expense
            </CardTitle>
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

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Expense Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Expense Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Cement bags, Steel rods..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="h-12"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select 
                value={formData.project}
                onValueChange={(value) => setFormData({ ...formData, project: value })}
                required
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="villa-phase-2">Villa Construction - Phase 2</SelectItem>
                  <SelectItem value="office-renovation">Office Building Renovation</SelectItem>
                  <SelectItem value="residential-unit-5">Residential Complex - Unit 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity & Unit Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.quantity || ""}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.unitPrice || ""}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
            </div>

            {/* Total (Auto-calculated) */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${formData.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="h-12"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Receipt Photo (Optional)</Label>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12"
              >
                <Camera className="mr-2 h-5 w-5" />
                Upload Receipt
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
              >
                Save Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
