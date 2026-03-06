import { Building2, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface Project {
  id: string;
  name: string;
  client: string;
  totalSpent: number;
  budget: number;
  status: "active" | "completed" | "on-hold";
  lastUpdated: string;
}

interface ProjectsProps {
  onSelectProject: (project: Project) => void;
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Villa Construction - Phase 2",
    client: "Ahmed Al-Rashid",
    totalSpent: 125000,
    budget: 150000,
    status: "active",
    lastUpdated: "2 hours ago"
  },
  {
    id: "2",
    name: "Office Building Renovation",
    client: "Khalid Properties LLC",
    totalSpent: 89000,
    budget: 100000,
    status: "active",
    lastUpdated: "1 day ago"
  },
  {
    id: "3",
    name: "Residential Complex - Unit 5",
    client: "Modern Homes Co.",
    totalSpent: 67000,
    budget: 75000,
    status: "active",
    lastUpdated: "3 days ago"
  },
  {
    id: "4",
    name: "Shopping Mall Expansion",
    client: "Dubai Retail Group",
    totalSpent: 250000,
    budget: 250000,
    status: "completed",
    lastUpdated: "1 week ago"
  },
  {
    id: "5",
    name: "Hotel Lobby Redesign",
    client: "Luxury Hotels Int'l",
    totalSpent: 45000,
    budget: 80000,
    status: "on-hold",
    lastUpdated: "2 weeks ago"
  }
];

export function Projects({ onSelectProject }: ProjectsProps) {
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

  const getProgressPercentage = (spent: number, budget: number) => {
    return Math.min((spent / budget) * 100, 100);
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-gray-600 mt-1">Manage your construction sites</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockProjects.map((project) => (
          <Card 
            key={project.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectProject(project)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-1 truncate">{project.name}</CardTitle>
                    <p className="text-sm text-gray-600 truncate">{project.client}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Badge className={getStatusColor(project.status)} variant="outline">
                  {project.status}
                </Badge>
                <div className="flex items-center text-gray-500">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {project.lastUpdated}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Budget Used</span>
                  <span className="font-semibold">
                    ${(project.totalSpent / 1000).toFixed(1)}K / ${(project.budget / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      getProgressPercentage(project.totalSpent, project.budget) >= 90 
                        ? "bg-red-500" 
                        : getProgressPercentage(project.totalSpent, project.budget) >= 75 
                        ? "bg-amber-500" 
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${getProgressPercentage(project.totalSpent, project.budget)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 h-14">
        <Building2 className="mr-2 h-5 w-5" />
        Create New Project
      </Button>
    </div>
  );
}
