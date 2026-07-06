import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Fuel, Activity, CheckCircle, ChevronLeft, ChevronRight,
  Clock, Calendar, Target, Timer, Play, History, Loader2
} from "lucide-react";
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG
const ITEMS_PER_PAGE = 6;

type Duty = {
  id: string;
  organizationId: string;
  empId: string;
  dutyDate: string;
  productIds: string[];
  gunIds: string[];
  shiftStart: string;
  shiftEnd: string;
  totalHours?: number;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED";
  createdAt?: string;
  updatedAt?: string;
};

type DutyTab = "SCHEDULED" | "ACTIVE" | "COMPLETED";

export default function DailyDuties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const [duties, setDuties] = useState<Duty[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [guns, setGuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<DutyTab>("SCHEDULED");
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Helpers
  const normalizeDate = (d: Date) => { 
    const x = new Date(d); 
    x.setHours(0, 0, 0, 0); 
    return x; 
  };

  const parseLocalDate = (s?: string) => {
    if (!s) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(s);
  };

  const isFutureDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = normalizeDate(new Date());
    const d = parseLocalDate(dateStr);
    if (!d) return false;
    return normalizeDate(d).getTime() > today.getTime();
  };

  const calculateHours = (start?: string, end?: string): string => {
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

  // Get product name by ID
  const getProductName = (productId: string) => {
    const pid = String(productId || "").trim();
    const product = products.find(p => {
      const id = String(p.id || p._id || "").trim();
      const name = String(p.productName || p.name || "").trim();
      return id === pid || name === pid;
    });
    return product?.productName || productId;
  };

  // Get gun name by ID
  const getGunName = (gunId: string) => {
    const gid = String(gunId || "").trim();
    const gun = guns.find(g => {
      const id = String(g.id || g._id || "").trim();
      const name = String(g.guns || g.name || "").trim();
      const serial = String(g.serialNumber || "").trim();
      return id === gid || name === gid || serial === gid;
    });
    return gun?.guns || gunId;
  };

  // Fetch duties, products, and guns
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
      .catch((err) => {
        console.error("Error fetching data:", err);
        toast({
          title: "Error",
          description: "Failed to load duties. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [orgId, empId, toast]);

  // Today key
  const todayKey = useMemo(() => normalizeDate(new Date()).getTime(), []);

  // Build today-only list
  const todayList = useMemo(() => {
    return duties.filter((d) => {
      const dt = parseLocalDate(d.dutyDate);
      if (!dt) return false;
      return normalizeDate(dt).getTime() === todayKey;
    });
  }, [duties, todayKey]);

  // Apply status filter
  const filtered = useMemo(() => {
    return selectedTab === "SCHEDULED"
      ? todayList.filter((d) => d.status === "SCHEDULED" || !d.status)
      : todayList.filter((d) => d.status === selectedTab);
  }, [todayList, selectedTab]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(0);
  }, [filtered.length, selectedTab]);

  // Actions with confirmation and loading states
  const handleDailyDutyAction = async (dutyId: string, newStatus: Duty["status"]) => {
    try {
      if (newStatus === "ACTIVE") {
        const duty = duties.find((d) => d.id === dutyId);
        if (duty && isFutureDate(duty.dutyDate)) {
          toast({
            title: "Cannot Start Duty",
            description: "This duty is scheduled for a future date.",
            variant: "destructive",
          });
          return;
        }
      }

      // Confirmation for completing duty
      if (newStatus === "COMPLETED") {
        const confirmed = window.confirm("Mark this duty as completed?");
        if (!confirmed) return;
      }

      setActionLoading(dutyId);
      await axios.put(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties/${dutyId}`,
        { status: newStatus }
      );

      setDuties((ds) => ds.map((d) => (d.id === dutyId ? { ...d, status: newStatus } : d)));
      
      toast({
        title: "Success",
        description: `Duty ${newStatus.toLowerCase()} successfully!`,
      });
    } catch (err) {
      console.error("Error updating duty:", err);
      toast({
        title: "Error",
        description: "Failed to update duty status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const scheduled = todayList.filter((d) => d.status === "SCHEDULED" || !d.status).length;
    const active = todayList.filter((d) => d.status === "ACTIVE").length;
    const completed = todayList.filter((d) => d.status === "COMPLETED").length;
    return { total: todayList.length, scheduled, active, completed };
  }, [todayList]);

  const statusBadgeClass = (status?: Duty["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "ACTIVE":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <Card className="card-gradient shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Pump Duty</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your scheduled, active, and completed duties for today
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/daily-duties-history")}>
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "Today's Duties", value: stats.total, Icon: Fuel, tint: "bg-blue-500/10", color: "text-blue-600" },
          { title: "Scheduled", value: stats.scheduled, Icon: Calendar, tint: "bg-yellow-500/10", color: "text-yellow-600" },
          { title: "Active", value: stats.active, Icon: Activity, tint: "bg-purple-500/10", color: "text-purple-600" },
          { title: "Completed", value: stats.completed, Icon: CheckCircle, tint: "bg-green-500/10", color: "text-green-600" },
        ].map((tile) => (
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
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "SCHEDULED", label: "Scheduled", icon: Calendar, count: stats.scheduled },
          { key: "ACTIVE", label: "Active", icon: Activity, count: stats.active },
          { key: "COMPLETED", label: "Completed", icon: CheckCircle, count: stats.completed },
        ].map((s) => {
          const Icon = s.icon;
          const active = selectedTab === (s.key as DutyTab);
          return (
            <Button
              key={s.key}
              variant={active ? "default" : "outline"}
              onClick={() => setSelectedTab(s.key as DutyTab)}
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

      {/* Duties List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              {selectedTab === "SCHEDULED" ? (
                <Calendar className="h-5 w-5" />
              ) : selectedTab === "ACTIVE" ? (
                <Activity className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
            </div>
            {selectedTab === "SCHEDULED"
              ? "Scheduled"
              : selectedTab === "ACTIVE"
              ? "Active"
              : "Completed"}
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
                <Fuel className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Duties Found</h3>
              <p className="text-muted-foreground">
                No duties for today in the {selectedTab.toLowerCase()} tab.
              </p>
            </div>
          )}

          {!loading &&
            paginated.map((duty) => {
              const startDisabled = isFutureDate(duty.dutyDate);
              const isActionLoading = actionLoading === duty.id;

              return (
                <div
                  key={duty.id}
                  className="p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Fuel className="h-5 w-5 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          Pump Duty
                        </h4>
                        <Badge className={statusBadgeClass(duty.status)}>
                          {duty.status || "SCHEDULED"}
                        </Badge>
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
                              {duty.shiftStart || "—"} - {duty.shiftEnd || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Hours:</span>
                            <span className="font-medium">
                              {duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h
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

                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                      {duty.status === "SCHEDULED" && (
                        <Button
                          size="sm"
                          disabled={startDisabled || isActionLoading}
                          title={
                            startDisabled
                              ? "Cannot start a duty scheduled for a future date"
                              : undefined
                          }
                          className={`shadow-md transition-all duration-300 w-full sm:w-auto ${
                            startDisabled
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg"
                          }`}
                          onClick={() => handleDailyDutyAction(duty.id, "ACTIVE")}
                        >
                          {isActionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Start Duty
                            </>
                          )}
                        </Button>
                      )}

                      {duty.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          disabled={isActionLoading}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 w-full sm:w-auto"
                          onClick={() => handleDailyDutyAction(duty.id, "COMPLETED")}
                        >
                          {isActionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </>
                          )}
                        </Button>
                      )}

                      {duty.status === "COMPLETED" && (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0 w-full sm:w-auto justify-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm font-medium">
                Page <span className="text-primary">{page + 1}</span> of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}