import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Fuel, CheckCircle, Activity, Calendar, ChevronLeft, ChevronRight,
  Clock, Timer, Target, Search as SearchIcon, ArrowLeft, LayoutGrid, LayoutList
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG
const ITEMS_PER_PAGE = 10;

type DateFilterKey = "all" | "today" | "week" | "month" | "custom";
type DutyStatusKey = "SCHEDULED" | "ACTIVE" | "COMPLETED";

type Duty = {
  id: string;
  organizationId: string;
  empId: string;
  dutyDate: string;
  productIds: string[];
  gunIds: string[];
  shiftStart: string;
  shiftEnd: string;
  totalHours?: string;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED";
  createdAt?: Date;
  updatedAt?: Date;
};

export default function DailyDutiesHistory() {
  const navigate = useNavigate();  // right-aligned action [memory:9]
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const [duties, setDuties] = useState<Duty[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [guns, setGuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTab, setSelectedTab] = useState<DutyStatusKey>("SCHEDULED");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Helpers
  const normalizeDate = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };  // [memory:11]
  const parseLocalDate = (s?: string) => {
    if (!s) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(s);
  };  // [memory:11]
  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return "0.0";
    const [sh, sm] = (start || "0:0").split(":").map(Number);
    const [eh, em] = (end || "0:0").split(":").map(Number);
    let hours = eh - sh; let minutes = em - sm;
    if (minutes < 0) { minutes += 60; hours -= 1; }
    if (hours < 0) hours += 24;
    return (hours + minutes / 60).toFixed(1);
  };  // [memory:11]
  const isInDateRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = normalizeDate(parseLocalDate(dateStr)!);
    const now = new Date();
    switch (dateFilter) {
      case "all": return true;
      case "today": return d.getTime() === normalizeDate(now).getTime();
      case "week": {
        const weekStart = normalizeDate(new Date(now));
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return d >= weekStart && d <= weekEnd;
      }
      case "month": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case "custom": {
        if (!customStartDate || !customEndDate) return true;
        const start = normalizeDate(parseLocalDate(customStartDate)!);
        const end = normalizeDate(parseLocalDate(customEndDate)!);
        return d >= start && d <= end;
      }
      default: return true;
    }
  };  // [memory:10]

  // Fetch
  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    
    Promise.all([
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties/employee/${empId}`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo`)
    ])
      .then(([dutiesRes, productsRes, gunsRes]) => {
        setDuties(Array.isArray(dutiesRes.data) ? dutiesRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setGuns(Array.isArray(gunsRes.data) ? gunsRes.data : []);
      })
      .finally(() => setLoading(false));
  }, [orgId, empId]);

  // Get product name by ID
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.productName || productId;
  };

  // Get gun name by ID
  const getGunName = (gunId: string) => {
    const gun = guns.find(g => g.id === gunId);
    return gun?.guns || gunId;
  };  // [memory:10]

  // Stats (global)
  const stats = useMemo(() => {
    const total = duties.length;
    const scheduled = duties.filter(d => d.status === "SCHEDULED" || !d.status).length;
    const active = duties.filter(d => d.status === "ACTIVE").length;
    const completed = duties.filter(d => d.status === "COMPLETED").length;
    return { total, scheduled, active, completed };
  }, [duties]);  // [memory:8]

  // Filtered list
  const filtered = useMemo(() => {
    let list =
      selectedTab === "SCHEDULED"
        ? duties.filter(d => d.status === "SCHEDULED" || !d.status)
        : duties.filter(d => d.status === selectedTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => {
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
    list = list.filter(d => isInDateRange(d.dutyDate));
    return list;
  }, [duties, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);  // [memory:3]

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  useEffect(() => { setPage(0); }, [filtered.length, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);  // [memory:8]

  return (
    <div className="space-y-8">
      {/* Header with right-aligned action */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <CardTitle className="text-2xl font-bold tracking-tight break-words">
                Pump Duties — History
              </CardTitle>
              <p className="text-sm text-muted-foreground break-words">
                Filter and review past duties by status and date
              </p>
            </div>

            {/* Below on mobile, vertically centered on sm+ */}
            <div className="row-start-2 sm:row-start-1 sm:col-start-2 sm:self-center">
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-center"
                onClick={() => navigate("/daily-duties")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Pump Duties
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>



      {/* Stats first */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "Total Duties", value: stats.total, Icon: Fuel, tint: "bg-blue-500/10", color: "text-blue-600" },
          { title: "Scheduled", value: stats.scheduled, Icon: Calendar, tint: "bg-yellow-500/10", color: "text-yellow-600" },
          { title: "Active", value: stats.active, Icon: Activity, tint: "bg-purple-500/10", color: "text-purple-600" },
          { title: "Completed", value: stats.completed, Icon: CheckCircle, tint: "bg-green-500/10", color: "text-green-600" },
        ].map(tile => (
          <Card key={tile.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{tile.title}</p>
                  <p className="text-base font-bold text-foreground">{tile.value}</p>
                </div>
                <div className={`${tile.tint} p-2 rounded-lg shrink-0`}>
                  <tile.Icon className={`h-4 w-4 ${tile.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>  {/* clear overview before filters */}

      {/* Filters below cards */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product, date, employee, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search duties"
              />
            </div>
            {["SCHEDULED", "ACTIVE", "COMPLETED"].map(tab => (
              <Button
                key={tab}
                size="sm"
                variant={selectedTab === tab ? "default" : "outline"}
                onClick={() => setSelectedTab(tab as DutyStatusKey)}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
                <Badge variant="secondary" className="ml-2">{duties.filter(d => d.status === tab).length}</Badge>
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Date Filter</Label>
            <div className="flex gap-2 flex-wrap">
              {["all", "today", "week", "month", "custom"].map(df => (
                <Button
                  key={df}
                  size="sm"
                  variant={dateFilter === df ? "default" : "outline"}
                  onClick={() => setDateFilter(df as DateFilterKey)}
                >
                  {df.charAt(0).toUpperCase() + df.slice(1)}
                </Button>
              ))}
            </div>
            {dateFilter === "custom" && (
              <div className="flex gap-2">
                <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>  {/* modern filters placement */}

      {/* List */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                {selectedTab === "SCHEDULED" ? <Calendar className="h-5 w-5" /> : selectedTab === "ACTIVE" ? <Activity className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              </div>
              {selectedTab === "SCHEDULED" ? "Scheduled" : selectedTab === "ACTIVE" ? "Active" : "Completed"}
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
                <Fuel className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">No duties match your current filters.</p>
            </div>
          )}
          {!loading && paginated.length > 0 && (
            viewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Date</TableHead>
                      <TableHead className="font-semibold text-xs">Shift Start</TableHead>
                      <TableHead className="font-semibold text-xs">Shift End</TableHead>
                      <TableHead className="font-semibold text-xs">Total Hours</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Products / Guns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((duty) => (
                      <TableRow key={duty.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-medium">{duty.dutyDate || '—'}</TableCell>
                        <TableCell className="text-xs">{duty.shiftStart || '—'}</TableCell>
                        <TableCell className="text-xs">{duty.shiftEnd || '—'}</TableCell>
                        <TableCell className="text-xs font-semibold">{duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            duty.status === 'COMPLETED' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
                            duty.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                            'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                          }`}>{duty.status || 'SCHEDULED'}</Badge>
                        </TableCell>
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
            {paginated.map((duty) => (
              <div key={duty.id} className="p-5 rounded-xl border border-border/50 hover:border-blue-500/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Fuel className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">Pump Duty</h4>
                      <Badge className={
                        duty.status === "COMPLETED" ? "bg-green-500/10 text-green-700 border-green-500/20" :
                          duty.status === "ACTIVE" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                            "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                      }>{duty.status || "SCHEDULED"}</Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm pt-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /><span className="text-muted-foreground">Date:</span><span className="font-medium">{duty.dutyDate || "—"}</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-600" /><span className="text-muted-foreground">Shift:</span><span className="font-medium">{(duty.shiftStart || "—")} - {(duty.shiftEnd || "—")}</span></div>
                        <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-green-600" /><span className="text-muted-foreground">Hours:</span><span className="font-medium">{duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h</span></div>
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
            ))}
            </div>
            )
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm font-medium">Page <span className="text-primary">{page + 1}</span> of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

