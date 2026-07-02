import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  CheckCircle,
  Timer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Search as SearchIcon,
} from "lucide-react";
import { API_CONFIG } from '@/lib/api-config';
import { useNavigate } from "react-router-dom";

// Removed - using API_CONFIG
const DEFAULT_PAGE_SIZE = 10;

type SpecialTask = {
  id: string;
  taskTitle: string;
  description?: string;
  shift?: string;
  dueDate?: string;
  priority?: string; // "high" | "medium" | "low"
  status: "pending" | "in-progress" | "completed";
  assignedToEmpId?: string;
  assignedToName?: string;
};

export default function SpecialDuties() {
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<SpecialTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTab, setSelectedTab] = useState<SpecialTask["status"]>("pending");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");

  // Helpers
  const normalizeDate = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = normalizeDate(new Date());
    const due = normalizeDate(new Date(dueDate));
    return due.getTime() < today.getTime();
  };

  // Fetch
  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=pending`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=in-progress`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`),
    ])
      .then(([pending, inprogress, completed]) => {
        const p = Array.isArray(pending.data) ? pending.data : [];
        const ip = Array.isArray(inprogress.data) ? inprogress.data : [];
        const c = Array.isArray(completed.data) ? completed.data : [];
        setTasks([
          ...p.map((t: any) => ({ ...t, status: "pending" })),
          ...ip.map((t: any) => ({ ...t, status: "in-progress" })),
          ...c.map((t: any) => ({ ...t, status: "completed" })),
        ]);
      })
      .finally(() => setLoading(false));
  }, [orgId, empId]);

  // Stats
  const stats = useMemo(() => {
    let pending = 0,
      inProgress = 0,
      completed = 0,
      overdue = 0;
    for (const t of tasks) {
      if (t.status === "pending") pending++;
      if (t.status === "in-progress") inProgress++;
      if (t.status === "completed") completed++;
      if (t.status !== "completed" && t.dueDate && isOverdue(t.dueDate)) overdue++;
    }
    return { pending, inProgress, completed, overdue, total: tasks.length };
  }, [tasks]);

  // Search + tab filter
  const filtered = useMemo(() => {
    let list = tasks.filter((t) => t.status === selectedTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const composite = [
          t.taskTitle,
          t.description,
          t.assignedToName,
          t.assignedToEmpId,
          t.shift,
          t.priority,
          t.dueDate,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return composite.includes(q);
      });
    }
    return list;
  }, [tasks, selectedTab, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page on changes
  useEffect(() => {
    setPage(0);
  }, [selectedTab, searchQuery, pageSize, filtered.length]);

  // Actions
  const handleTaskAction = async (taskId: string, newStatus: SpecialTask["status"]) => {
    await axios.put(
      `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/${taskId}/status?status=${encodeURIComponent(newStatus)}`
    );
    setTasks((ds) => ds.map((d) => (d.id === taskId ? { ...d, status: newStatus } : d)));
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (String(priority || "").toLowerCase()) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="card-gradient">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Special Duties</CardTitle>
              <p className="text-sm text-muted-foreground">Track and manage assigned special tasks</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/special-duties-history")}>
                <FileText className="h-4 w-4 mr-2" />
                View History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent />
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Special Tasks</p>
                <p className="text-base font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="bg-muted p-2 rounded-lg shrink-0">
                <FileText className="h-4 w-4 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <p className="text-base font-bold text-foreground">{stats.pending}</p>
              </div>
              <div className="bg-yellow-500/10 p-2 rounded-lg shrink-0">
                <Timer className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                <p className="text-base font-bold text-foreground">{stats.inProgress}</p>
              </div>
              <div className="bg-blue-500/10 p-2 rounded-lg shrink-0">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Completed</p>
                <p className="text-base font-bold text-foreground">{stats.completed}</p>
              </div>
              <div className="bg-green-500/10 p-2 rounded-lg shrink-0">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Controls</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[260px]">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search special tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search special tasks"
              />
            </div>
            {/* Page size */}
            <div className="flex items-center gap-3 lg:ml-auto">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
                  aria-label="Items per page"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "pending", label: "Pending", icon: Timer, count: stats.pending },
              { key: "in-progress", label: "In Progress", icon: FileText, count: stats.inProgress },
              { key: "completed", label: "Completed", icon: CheckCircle, count: stats.completed },
            ].map((s) => {
              const Icon = s.icon as any;
              const active = selectedTab === (s.key as any);
              return (
                <Button
                  key={s.key}
                  variant={active ? "default" : "outline"}
                  onClick={() => setSelectedTab(s.key as any)}
                  size="sm"
                  className={active ? "btn-gradient-primary" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {s.label}
                  <Badge variant="secondary" className="ml-2">
                    {s.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              {selectedTab === "pending" ? (
                <Timer className="h-5 w-5" />
              ) : selectedTab === "in-progress" ? (
                <FileText className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
            </div>
            {selectedTab === "pending" ? "Pending" : selectedTab === "in-progress" ? "In Progress" : "Completed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}

          {!loading && paginated.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">No tasks match your current filters.</p>
            </div>
          )}

          {!loading &&
            paginated.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {task.taskTitle}
                      </h4>
                      {String(task.priority).toLowerCase() === "high" && (
                        <Badge className={getPriorityBadgeClass("high")}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Priority
                        </Badge>
                      )}
                      {isOverdue(task.dueDate) && task.status !== "completed" && (
                        <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-muted-foreground/20">
                        {task.status.replace("-", " ").toUpperCase()}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-sm pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-accent/10">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="font-medium text-foreground">{task.shift || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${isOverdue(task.dueDate) ? "bg-red-500/10" : "bg-green-500/10"}`}>
                          <Calendar
                            className={`h-3.5 w-3.5 ${
                              isOverdue(task.dueDate) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                            }`}
                          />
                        </div>
                        <span className="text-muted-foreground">Due:</span>
                        <span className={`font-medium ${isOverdue(task.dueDate) ? "text-destructive" : "text-foreground"}`}>
                          {task.dueDate || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={() => handleTaskAction(task.id, "in-progress")}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === "in-progress" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={() => handleTaskAction(task.id, "completed")}
                      >
                        Complete
                      </Button>
                    )}
                    {task.status === "completed" && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm font-medium">
                Page <span className="text-primary">{page + 1}</span> of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


