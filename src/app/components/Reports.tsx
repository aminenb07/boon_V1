import { BarChart3, PieChart as PieChartIcon, Download, Share2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const dailyData = [
  { day: "Mon", amount: 2400 },
  { day: "Tue", amount: 3200 },
  { day: "Wed", amount: 2800 },
  { day: "Thu", amount: 3800 },
  { day: "Fri", amount: 3400 },
  { day: "Sat", amount: 2200 },
  { day: "Sun", amount: 1800 }
];

const categoryData = [
  { name: "Materials", value: 18000, color: "#3b82f6" },
  { name: "Labor", value: 15000, color: "#f59e0b" },
  { name: "Transport", value: 5000, color: "#10b981" },
  { name: "Equipment", value: 4000, color: "#8b5cf6" },
  { name: "Other", value: 3200, color: "#6b7280" }
];

export function Reports() {
  const totalExpenses = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-gray-600 mt-1">Insights and analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">This Month</span>
            </div>
            <p className="text-2xl font-bold">${(totalExpenses / 1000).toFixed(1)}K</p>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Avg. Daily</span>
            </div>
            <p className="text-2xl font-bold">$2.8K</p>
            <p className="text-xs text-gray-500 mt-1">Based on 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Expenses Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Weekly Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip 
                formatter={(value) => [`$${value}`, "Amount"]}
                contentStyle={{ 
                  backgroundColor: "#fff", 
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-blue-600" />
            Expenses by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, "Amount"]}
                contentStyle={{ 
                  backgroundColor: "#fff", 
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Category List */}
          <div className="space-y-3 mt-6">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${item.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    {((item.value / totalExpenses) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="h-12">
          <Download className="mr-2 h-5 w-5" />
          Export PDF
        </Button>
        <Button variant="outline" className="h-12">
          <Share2 className="mr-2 h-5 w-5" />
          Share Report
        </Button>
      </div>
    </div>
  );
}
