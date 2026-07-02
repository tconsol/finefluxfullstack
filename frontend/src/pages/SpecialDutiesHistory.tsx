import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  Search as SearchIcon,
  Calendar,
  Clock,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG
const DEFAULT_PAGE_SIZE = 10;

type SpecialTask = {
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

type DateFilterKey = "all" | "today" | "week" | "month" | "custom";

export default function SpecialDutiesHistory() {
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<SpecialTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);

  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Fetch completed tasks
  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    axios
      .get(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`
      )
      .then((res) => setTasks(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false));
  }, [orgId, empId]);

  // Date helpers
  const normalizeDate = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const inRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = normalizeDate(new Date(dateStr));
    const now = new Date();
    switch (dateFilter) {
      case "all":
        return true;
      case "today":
        return d.getTime() === normalizeDate(now).getTime();
      case "week": {
        const weekStart = normalizeDate(new Date(now));
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return d >= weekStart && d <= weekEnd;
      }
      case "month":
        return (
          d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        );
      case "custom": {
        if (!customStartDate || !customEndDate) return true;
        const start = normalizeDate(new Date(customStartDate));
        const end = normalizeDate(new Date(customEndDate));
        return d >= start && d <= end;
      }
      default:
        return true;
    }
  };

  // Search + date filter + sort
  const filteredSorted = useMemo(() => {
    const bySearch = !searchQuery.trim()
      ? tasks
      : tasks.filter((t) => {
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
        return composite.includes(searchQuery.toLowerCase());
      });

    const byDate = bySearch.filter((t) => inRange(t.dueDate));

    const toTime = (d?: string) => {
      if (!d) return 0;
      const n = new Date(d);
      return isNaN(n.getTime()) ? 0 : n.getTime();
    };

    return [...byDate].sort((a, b) => toTime(b.dueDate) - toTime(a.dueDate));
  }, [tasks, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const paginated = filteredSorted.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [
    searchQuery,
    pageSize,
    dateFilter,
    customStartDate,
    customEndDate,
    filteredSorted.length,
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header (grid ensures button is below text on mobile) */}
      <Card className="card-gradient">
        <CardHeader className="pb-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <CardTitle className="text-2xl font-bold tracking-tight leading-tight break-words">
                Special Duties History
              </CardTitle>
              <p className="text-sm text-muted-foreground break-words">
                Review completed special tasks and their details
              </p>
            </div>

            {/* Below on mobile; vertically centered and right-aligned on sm+ */}
            <div className="row-start-2 sm:row-start-1 sm:col-start-2 sm:self-center">
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-center"
                onClick={() => navigate("/special-duties")}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Go back to Special Duties
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent />
      </Card>


      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-base font-bold">{tasks.length}</p>
              </div>
              <div className="bg-green-500/10 p-2 rounded-lg shrink-0">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Matching Search</p>
                <p className="text-base font-bold">{filteredSorted.length}</p>
              </div>
              <div className="bg-muted p-2 rounded-lg shrink-0">
                <FileText className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Pages</p>
                <p className="text-base font-bold">{totalPages}</p>
              </div>
              <div className="bg-muted p-2 rounded-lg shrink-0">
                <ChevronRight className="h-4 w-4" />
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
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Search + page size */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative min-w-[220px]">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search completed tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
                aria-label="Search completed tasks"
              />
            </div>

            <div className="flex items-center gap-3 lg:justify-end">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Show:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background w-full sm:w-[140px]"
                aria-label="Items per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Filter */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <Label className="text-xs uppercase text-muted-foreground">
              Filter by Date
            </Label>

            {/* Buttons wrap on small screens */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
                { key: "custom", label: "Custom Range" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={
                    dateFilter === (f.key as DateFilterKey) ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setDateFilter(f.key as DateFilterKey)}
                  className={
                    dateFilter === f.key ? "btn-gradient-primary" : "w-full"
                  }
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <CheckCircle className="h-5 w-5" />
              </div>
              Completed Tasks
            </CardTitle>
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/50">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-8 gap-1">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="h-8 gap-1">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 sm:py-12">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}

          {!loading && paginated.length === 0 && (
            <div className="text-center py-10 sm:py-12">
              <div className="h-20 w-20 sm:h-24 sm:w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                No Completed Tasks
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or date filters.
              </p>
            </div>
          )}

          {!loading && paginated.length > 0 && (
            viewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Task Title</TableHead>
                      <TableHead className="font-semibold text-xs">Description</TableHead>
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
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{task.description || '—'}</TableCell>
                        <TableCell className="text-xs">{task.shift || '—'}</TableCell>
                        <TableCell className="text-xs">{task.dueDate || '—'}</TableCell>
                        <TableCell>{task.priority ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">{String(task.priority).toUpperCase()}</Badge> : '—'}</TableCell>
                        <TableCell><Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 text-[10px] px-1.5 py-0"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
            paginated.map((task) => (
              <div
                key={task.id}
                className="p-4 sm:p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors break-words">
                        {task.taskTitle}
                      </h4>
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                      {task.priority && (
                        <Badge variant="outline" className="border-muted-foreground/20">
                          {String(task.priority).toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm pt-2 border-top border-border/30">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Due:</span>
                        <span className="font-medium">{task.dueDate || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="font-medium">{task.shift || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
            )
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center mt-6 pt-6 border-t border-border/50">
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              </div>

              <span className="text-sm font-medium text-center">
                Page <span className="text-primary">{page + 1}</span> of {totalPages}
              </span>

              <div className="sm:justify-self-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 w-full sm:w-auto"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

