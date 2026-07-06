// AllEmployeeTasks.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Fuel,
  Target,
  Activity,
  RefreshCw,
  Sparkles,
  UserCheck,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG

type DateFilterKey = "all" | "today" | "week" | "month" | "custom";

type Task = {
  id: string;
  taskTitle: string;
  description?: string;
  shift?: string;
  dueDate?: string;
  priority?: string;
  status: "pending" | "in-progress" | "completed";
  assignedToEmpId?: string;
  assignedToName?: string;
};

type Duty = {
  id: string;
  organizationId: string;
  empId: string;
  dutyDate: string;
  productIds: string[];
  gunIds: string[];
  shiftStart: string;
  shiftEnd: string;
  totalHours: number;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED";
  createdAt: Date;
  updatedAt: Date;
};

// ---------- IST utilities ----------
const IST_OFFSET_MIN = 330; // UTC+5:30

// Convert an instant to IST wall-clock time
const toIST = (d: Date) => {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const istMs = utcMs + IST_OFFSET_MIN * 60000;
  return new Date(istMs);
};

// Start of IST day (returned as UTC instant)
const startOfISTDay = (d: Date) => {
  const ist = toIST(d);
  const y = ist.getFullYear();
  const m = ist.getMonth();
  const day = ist.getDate();
  const istMidnightUtcMs = Date.UTC(y, m, day) - IST_OFFSET_MIN * 60000;
  return new Date(istMidnightUtcMs);
};

// Parse YYYY-MM-DD as IST midnight (UTC instant); other formats via native Date
const parseISTYMD = (ymd: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const istMidnightUtcMs = Date.UTC(y, mo, d) - IST_OFFSET_MIN * 60000;
  return new Date(istMidnightUtcMs);
};

const parseISTDate = (s?: string): Date | null => {
  if (!s) return null;
  const ymd = parseISTYMD(s);
  if (ymd) return ymd;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// ---------- Status normalization ----------
const normalizeTaskStatus = (value?: string): Task["status"] => {
  const s = String(value || "pending").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (s === "in-progress" || s === "inprogress") return "in-progress";
  if (s === "completed" || s === "complete" || s === "done") return "completed";
  return "pending";
};

const AllEmployeeTasks: React.FC = () => {
  const orgId = localStorage.getItem("organizationId") || "";
  const [viewMode, setViewMode] = useState<"daily" | "special" | "both">("daily");

  // Org-wide tasks (no employeeId)
  const {
    data: orgTasks = [],
    refetch: refetchTasks,
    isFetching: fetchingTasks,
  } = useQuery({
    queryKey: ["org-tasks", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Normalize shape and status for reliable filters
  const tasks: Task[] = useMemo(() => {
    return (orgTasks as any[]).map((t) => ({
      id: t.id,
      taskTitle: t.taskTitle || t.title || "Untitled Task",
      description: t.description || "",
      shift: t.shift || "",
      dueDate: t.dueDate || "",
      priority: t.priority || "low",
      status: normalizeTaskStatus(t.status),
      assignedToEmpId: t.assignedToEmpId || t.empId || "",
      assignedToName: t.assignedToName || t.assigneeName || "",
    }));
  }, [orgTasks]);

  const handleRefreshAll = () => {
    refetchTasks();
    window.dispatchEvent(new CustomEvent("refresh-duties"));
  };

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return "0.0";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let hours = eh - sh;
    let minutes = em - sm;
    if (minutes < 0) {
      minutes += 60;
      hours -= 1;
    }
    if (hours < 0) hours += 24;
    return (hours + minutes / 60).toFixed(1);
  };

  return (
    <div className="space-y-8 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">
            All Employee Tasks & Duties
          </h1>
          <p className="text-muted-foreground mt-1">Org-wide view with live updates every 30s.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefreshAll} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Toggle Buttons */}
      <Card className="card-gradient">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={viewMode === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("daily")}
                className={viewMode === "daily" ? "bg-gradient-to-r from-blue-600 to-blue-500" : ""}
              >
                <Fuel className="h-4 w-4 mr-2" />
                Daily Duties
              </Button>
              <Button
                variant={viewMode === "special" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("special")}
                className={viewMode === "special" ? "bg-gradient-to-r from-purple-600 to-purple-500" : ""}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Special Tasks
              </Button>
              <Button
                variant={viewMode === "both" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("both")}
                className={viewMode === "both" ? "bg-gradient-to-r from-primary to-primary/80" : ""}
              >
                <Target className="h-4 w-4 mr-2" />
                Show Both
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Duties (shown first when viewMode is "daily" or "both") */}
      {(viewMode === "daily" || viewMode === "both") && (
        <DailySection
          title="Daily Duties"
          orgId={orgId}
          calculateHours={calculateHours}
        />
      )}

      {/* Special Tasks */}
      {(viewMode === "special" || viewMode === "both") && (
        <SpecialSection
          title="Special Tasks"
          tasks={tasks}
          calculateHours={calculateHours}
          loading={fetchingTasks}
        />
      )}
    </div>
  );
};

/* ================= Special Tasks Section (IST-safe, counts synced) ================= */

const SpecialSection: React.FC<{
  title: string;
  tasks: Task[];
  calculateHours: (s?: string, e?: string) => string;
  loading: boolean;
}> = ({ title, tasks, calculateHours, loading }) => {
  const [selectedTab, setSelectedTab] = useState<"pending" | "in-progress" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [listViewMode, setListViewMode] = useState<'table' | 'card'>('table');

  // IST-aware comparisons
  const isInDateWindowIST = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = parseISTDate(dateStr);
    if (!d) return false;
    const todayIST = startOfISTDay(new Date());

    if (dateFilter === "all") return true;

    if (dateFilter === "today") {
      return startOfISTDay(d).getTime() === todayIST.getTime();
    }

    if (dateFilter === "week") {
      // IST week starting Sunday; change base to Monday by adjusting .getDay() handling if needed
      const now = new Date();
      const today = startOfISTDay(now);
      const dayOfWeek = toIST(now).getDay(); // 0-6 in IST
      const weekStartIST = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      const weekEndIST = new Date(weekStartIST.getTime() + 6 * 24 * 60 * 60 * 1000);
      const x = startOfISTDay(d);
      return x >= weekStartIST && x <= weekEndIST;
    }

    if (dateFilter === "month") {
      const x = toIST(d);
      const nowIST = toIST(new Date());
      return x.getFullYear() === nowIST.getFullYear() && x.getMonth() === nowIST.getMonth();
    }

    if (dateFilter === "custom") {
      if (!customStartDate || !customEndDate) return true; // UX: allow selecting bounds without hiding items
      const s = parseISTYMD(customStartDate);
      const e = parseISTYMD(customEndDate);
      if (!s || !e) return true;
      const x = startOfISTDay(d);
      const S = startOfISTDay(s);
      const E = startOfISTDay(e);
      return x >= S && x <= E;
    }

    return true;
  };

  // Base filters (search + date) applied first
  const baseFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!isInDateWindowIST(t.dueDate)) return false;
      if (!q) return true;
      const composite = [
        t.taskTitle,
        t.description,
        t.assignedToName,
        t.assignedToEmpId,
        t.shift,
        t.priority,
        t.dueDate,
        t.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return composite.includes(q);
    });
  }, [tasks, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Counts for buttons reflect current base filters (keeps counts in sync with search/date)
  const counts = useMemo(
    () => ({
      pending: baseFiltered.filter((t) => t.status === "pending").length,
      inProgress: baseFiltered.filter((t) => t.status === "in-progress").length,
      completed: baseFiltered.filter((t) => t.status === "completed").length,
    }),
    [baseFiltered]
  );

  // Apply status tab last
  const filtered = useMemo(
    () => baseFiltered.filter((t) => t.status === selectedTab),
    [baseFiltered, selectedTab]
  );

  React.useEffect(() => {
    setPage(0);
  }, [selectedTab, searchQuery, dateFilter, customStartDate, customEndDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const isOverdueIST = (dueDate?: string) => {
    if (!dueDate) return false;
    const d = parseISTDate(dueDate);
    if (!d) return false;
    return startOfISTDay(d).getTime() < startOfISTDay(new Date()).getTime();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      {/* Top stats (from entire tasks, not just filtered) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Pending", value: tasks.filter((t) => t.status === "pending").length, icon: Timer, color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
          { label: "In Progress", value: tasks.filter((t) => t.status === "in-progress").length, icon: FileText, color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
          { label: "Completed", value: tasks.filter((t) => t.status === "completed").length, icon: CheckCircle, color: "bg-green-500/10 text-green-700 border-green-500/20" },
          { label: "Overdue (IST)", value: tasks.filter((t) => isOverdueIST(t.dueDate)).length, icon: AlertTriangle, color: "bg-red-500/10 text-red-700 border-red-500/20" },
        ].map((stat) => {
          const Icon = stat.icon as any;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-base font-bold mt-0.5">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "pending", label: "Pending", icon: Timer, count: counts.pending },
              { key: "in-progress", label: "In Progress", icon: FileText, count: counts.inProgress },
              { key: "completed", label: "Completed", icon: CheckCircle, count: counts.completed },
            ] as const).map((tab) => {
              const Icon = tab.icon as any;
              const active = selectedTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTab(tab.key as any);
                    setPage(0);
                  }}
                  className={active ? "bg-gradient-to-r from-primary to-primary/80" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  <Badge variant="secondary" className="ml-2">{tab.count}</Badge>
                </Button>
              );
            })}
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search special tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Date (IST)</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
                { key: "custom", label: "Custom Range" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={dateFilter === (f.key as DateFilterKey) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(f.key as DateFilterKey)}
                  className={dateFilter === f.key ? "btn-gradient-primary" : ""}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle>Tasks ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/50">
              <Button variant={listViewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setListViewMode('table')} className="h-8 gap-1">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button variant={listViewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setListViewMode('card')} className="h-8 gap-1">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No tasks found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          )}

          {!loading && paginated.length > 0 && (
            listViewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Title</TableHead>
                      <TableHead className="font-semibold text-xs">Assigned To</TableHead>
                      <TableHead className="font-semibold text-xs">Shift</TableHead>
                      <TableHead className="font-semibold text-xs">Due Date</TableHead>
                      <TableHead className="font-semibold text-xs">Priority</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((task) => (
                      <TableRow key={task.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-medium">{task.taskTitle}</TableCell>
                        <TableCell className="text-xs">{task.assignedToName || '—'} {task.assignedToEmpId ? `(${task.assignedToEmpId})` : ''}</TableCell>
                        <TableCell className="text-xs">{task.shift || '—'}</TableCell>
                        <TableCell className={`text-xs ${isOverdueIST(task.dueDate) && task.status !== 'completed' ? 'text-destructive font-semibold' : ''}`}>{task.dueDate || '—'}</TableCell>
                        <TableCell>{task.priority ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">{String(task.priority).toUpperCase()}</Badge> : '—'}</TableCell>
                        <TableCell><Badge className="bg-muted text-foreground border-border text-[10px] px-1.5 py-0">{String(task.status || '').replace('-', ' ').toUpperCase()}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
            <div className="space-y-4">
          {!loading &&
            paginated.map((task) => (
              <div
                key={task.id}
                className="p-4 sm:p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{task.taskTitle}</h4>
                      {String(task.priority).toLowerCase() === "high" && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Priority
                        </Badge>
                      )}
                      {isOverdueIST(task.dueDate) && task.status !== "completed" && (
                        <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {/* Assignee row */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-medium text-foreground">
                        {task.assignedToName || "Unknown"}
                      </span>
                      <span>({task.assignedToEmpId || "N/A"})</span>
                    </div>

                    {task.description && <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>}

                    <div className="flex items-center gap-4 flex-wrap text-sm pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-accent/10">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="font-medium text-foreground">{task.shift || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${isOverdueIST(task.dueDate) ? "bg-red-500/10" : "bg-green-500/10"}`}>
                          <Calendar
                            className={`h-3.5 w-3.5 ${
                              isOverdueIST(task.dueDate) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                            }`}
                          />
                        </div>
                        <span className="text-muted-foreground">Due (IST):</span>
                        <span className={`font-medium ${isOverdueIST(task.dueDate) ? "text-destructive" : "text-foreground"}`}>
                          {task.dueDate || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge className="bg-muted text-foreground border-border">{String(task.status || "").replace("-", " ").toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
            ))}
            </div>
            )
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm font-medium">
                Page <span className="text-primary">{page + 1}</span> of {totalPages}
              </span>

              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ================= Daily Duties Section (org-wide, server time filters + counts) ================= */

const DailySection: React.FC<{
  title: string;
  orgId: string;
  calculateHours: (s?: string, e?: string) => string;
}> = ({ title, orgId, calculateHours }) => {
  const [selectedTab, setSelectedTab] = useState<"SCHEDULED" | "ACTIVE" | "COMPLETED">("SCHEDULED");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [listViewMode, setListViewMode] = useState<'table' | 'card'>('table');

  const {
    data: duties = [],
    isFetching: fetchingDuties,
    refetch: refetchDuties,
  } = useQuery({
    queryKey: ["org-duties", orgId, dateFilter, customStartDate, customEndDate],
    queryFn: async () => {
      if (!orgId) return [];
      let url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties`;
      if (dateFilter === "today") url += "/today";
      else if (dateFilter === "week") url += "/week";
      else if (dateFilter === "month") url += "/month";
      else if (dateFilter === "custom") {
        if (customStartDate && customEndDate) {
          url += `/custom-range?startDate=${customStartDate}&endDate=${customEndDate}`;
        }
      }
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch products and guns
  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const { data: guns = [] } = useQuery({
    queryKey: ["guns", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  // Get product name by ID
  const getProductName = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    return product?.productName || productId;
  };

  // Get gun name by ID
  const getGunName = (gunId: string) => {
    const gun = guns.find((g: any) => g.id === gunId);
    return gun?.guns || gunId;
  };

  React.useEffect(() => {
    const handler = () => refetchDuties();
    window.addEventListener("refresh-duties", handler);
    return () => window.removeEventListener("refresh-duties", handler);
  }, [refetchDuties]);

  const dutyCounts = useMemo(
    () => ({
      scheduled: duties.filter((d: Duty) => d.status === "SCHEDULED" || !d.status).length,
      active: duties.filter((d: Duty) => d.status === "ACTIVE").length,
      completed: duties.filter((d: Duty) => d.status === "COMPLETED").length,
    }),
    [duties]
  );

  const filtered = useMemo(() => {
    let list =
      selectedTab === "SCHEDULED"
        ? duties.filter((d: Duty) => d.status === "SCHEDULED" || !d.status)
        : duties.filter((d: Duty) => d.status === selectedTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d: Duty) => {
        const productsText = Array.isArray(d.productIds) ? d.productIds.join(" ").toLowerCase() : "";
        const gunsText = Array.isArray(d.gunIds) ? d.gunIds.join(" ").toLowerCase() : "";
        return (
          productsText.includes(q) ||
          String(d.empId || "").toLowerCase().includes(q) ||
          String(d.dutyDate || "").toLowerCase().includes(q) ||
          gunsText.includes(q) ||
          String(d.status || "").toLowerCase().includes(q) ||
          String(d.shiftStart || "").toLowerCase().includes(q) ||
          String(d.shiftEnd || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [duties, selectedTab, searchQuery]);

  const stats = useMemo(() => {
    const scheduled = dutyCounts.scheduled;
    const active = dutyCounts.active;
    const completed = dutyCounts.completed;
    return { scheduled, active, completed, total: duties.length };
  }, [dutyCounts, duties.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const statusBadgeClass = (status?: Duty["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "ACTIVE":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <Fuel className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Scheduled", value: stats.scheduled, icon: Calendar, color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
          { label: "Active", value: stats.active, icon: Activity, color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "bg-green-500/10 text-green-700 border-green-500/20" },
        ].map((stat) => {
          const Icon = stat.icon as any;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "SCHEDULED", label: "Scheduled", icon: Calendar, count: dutyCounts.scheduled },
              { key: "ACTIVE", label: "Active", icon: Activity, count: dutyCounts.active },
              { key: "COMPLETED", label: "Completed", icon: CheckCircle, count: dutyCounts.completed },
            ] as const).map((tab) => {
              const Icon = tab.icon as any;
              const active = selectedTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTab(tab.key as any);
                    setPage(0);
                  }}
                  className={active ? "bg-gradient-to-r from-primary to-primary/80" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  <Badge variant="secondary" className="ml-2">{tab.count}</Badge>
                </Button>
              );
            })}
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search daily duties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Date</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
                { key: "custom", label: "Custom Range" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={dateFilter === (f.key as DateFilterKey) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(f.key as DateFilterKey)}
                  className={dateFilter === f.key ? "btn-gradient-primary" : ""}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Duty List */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>List</CardTitle>
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/50">
              <Button variant={listViewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setListViewMode('table')} className="h-8 gap-1">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button variant={listViewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setListViewMode('card')} className="h-8 gap-1">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {fetchingDuties && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading duties...</p>
            </div>
          )}

          {!fetchingDuties && paginated.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Fuel className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">No duties match your current filters.</p>
            </div>
          )}

          {!fetchingDuties && paginated.length > 0 && (
            listViewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Date</TableHead>
                      <TableHead className="font-semibold text-xs">Employee ID</TableHead>
                      <TableHead className="font-semibold text-xs">Shift Start</TableHead>
                      <TableHead className="font-semibold text-xs">Shift End</TableHead>
                      <TableHead className="font-semibold text-xs">Hours</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Products</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((duty: Duty) => (
                      <TableRow key={duty.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-medium">{duty.dutyDate || '—'}</TableCell>
                        <TableCell className="text-xs">{duty.empId || '—'}</TableCell>
                        <TableCell className="text-xs">{duty.shiftStart || '—'}</TableCell>
                        <TableCell className="text-xs">{duty.shiftEnd || '—'}</TableCell>
                        <TableCell className="text-xs font-semibold">{typeof duty.totalHours === 'number' ? duty.totalHours.toFixed(1) : calculateHours(duty.shiftStart, duty.shiftEnd)}h</TableCell>
                        <TableCell><Badge className={`text-[10px] px-1.5 py-0 ${statusBadgeClass(duty.status)}`}>{duty.status || 'SCHEDULED'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(duty.productIds || []).map((pid, idx) => (
                              <span key={idx} className="text-[10px] bg-purple-500/10 text-purple-700 border border-purple-500/20 rounded px-1">{getProductName(pid)}</span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
            <div className="space-y-4">
          {!fetchingDuties &&
            paginated.map((duty: Duty) => {
              return (
                <div
                  key={duty.id}
                  className="p-5 rounded-xl border border-border/50 hover:border-blue-500/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Fuel className="h-5 w-5 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          Pump Duty
                        </h4>
                        <Badge className={statusBadgeClass(duty.status)}>{duty.status || "SCHEDULED"}</Badge>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm pt-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{duty.dutyDate || "—"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-muted-foreground">Shift:</span>
                            <span className="font-medium">
                              {(duty.shiftStart || "—")} - {(duty.shiftEnd || "—")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Hours:</span>
                            <span className="font-medium">
                              {typeof duty.totalHours === "number"
                                ? duty.totalHours.toFixed(1)
                                : calculateHours(duty.shiftStart, duty.shiftEnd)}h
                            </span>
                          </div>
                        </div>

                        {/* Products & Guns Assignment */}
                        {duty.productIds && duty.productIds.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-purple-600" />
                              <span className="text-muted-foreground">Assigned Products & Guns:</span>
                            </div>
                            <div className="space-y-1.5 pl-6">
                              {duty.productIds.map((productId, index) => {
                                const gunId = duty.gunIds[index];
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">
                                      {getProductName(productId)}
                                    </Badge>
                                    <span className="text-muted-foreground text-xs">→</span>
                                    <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">
                                      <Fuel className="h-3 w-3 mr-1" />
                                      {getGunName(gunId)}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            )
          )}
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
};

export default AllEmployeeTasks;

