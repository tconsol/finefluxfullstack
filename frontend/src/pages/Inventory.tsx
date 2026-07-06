import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Fuel, Plus, TrendingUp, AlertTriangle, RefreshCw, BarChart3, Calendar, X, Download, Eye, History, PackageOpen, Trash2, Loader2,
} from "lucide-react";
import PopupClose from "@/components/PopupClose";
import { API_CONFIG } from "@/lib/api-config";

// Removed - using API_CONFIG
const LOW_STOCK_PHONE = "9640206605";

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

function useLatestInventories(orgId, products) {
  const queries = products.map(prod => ({
    queryKey: ["inventory-latest", orgId, prod.id],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/inventories/${prod.id}/latest`;
      try {
        const res = await axios.get(url);
        return { ...res.data, productId: prod.id };
      } catch {
        return null;
      }
    },
    enabled: !!orgId && !!prod.id,
  }));
  const results = useQueries({ queries });
  const inventories = results.map(q => q.data).filter(Boolean);
  const isLoading = results.some(q => q.isLoading);
  const refetch = () => results.forEach(q => q.refetch && q.refetch());
  return { inventories, isLoadingInventories: isLoading, refetchInventories: refetch };
}

export default function Inventory() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId");
  const sentAlertRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stockModal, setStockModal] = useState<null | any>(null);
  const [stockValue, setStockValue] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addValue, setAddValue] = useState("");
  const [refillModal, setRefillModal] = useState<null | any>(null);
  const [refillDate, setRefillDate] = useState("");
  const [tankRefillDates, setTankRefillDates] = useState<Record<string, string>>({});
  const [reportModal, setReportModal] = useState(false);
  const [reportProductId, setReportProductId] = useState("");
  const [reportProduct, setReportProduct] = useState<any | null>(null);
  const [lowStockModal, setLowStockModal] = useState(false);
  const [smsState, setSmsState] = useState<{ [id: string]: string }>({});
  const [deleteModal, setDeleteModal] = useState<any | null>(null);

  const { data: products = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`;
      const res = await axios.get(url);
      const productList = Array.isArray(res.data) ? res.data : [];
      return productList;
    }
  });

  const { inventories, isLoadingInventories, refetchInventories } = useLatestInventories(orgId, products);

  const tankList = (inventories || []).map((inv: any) => {
    const prod = products.find((p: any) => p.id === inv.productId);
    const status = prod?.active ?? prod?.status ?? inv.status ?? true;
    
    // Debug logging
    
    return {
      ...inv,
      price: prod?.price ?? "-",
      supplier: prod?.supplier ?? "-",
      productName: inv.productName ?? prod?.productName ?? "—",
      // Get status from product API (prod.active or prod.status)
      status: status
    }
  });

  const activeTanks = tankList.filter(t => {
    const isActive = t.status === true || t.status === "true" || t.status === 1 || t.status === "1";
    return isActive;
  });
  const lowStockTanks = activeTanks.filter(
    tank =>
      tank.tankCapacity &&
      tank.currentLevel &&
      Number(tank.tankCapacity) > 0 &&
      (100 * (Number(tank.currentLevel) / Number(tank.tankCapacity))) < 20
  );
  useEffect(() => {
    lowStockTanks.forEach(async (tank) => {
      const key = String(tank.productId || tank.productName);
      if (!sentAlertRef.current.has(key)) {
        try {
          setSmsState(s => ({ ...s, [key]: "Sending..." }));
          await axios.post(`${API_CONFIG.BASE_URL}/api/send-sms`, {
            phone: LOW_STOCK_PHONE,
            message: `Low Stock Alert: ${tank.productName}, Stock: ${tank.currentLevel}`,
          });
          sentAlertRef.current.add(key);
          setSmsState(s => ({ ...s, [key]: "SMS sent!" }));
        } catch {
          setSmsState(s => ({ ...s, [key]: "SMS failed!" }));
        }
      }
    });
    sentAlertRef.current.forEach(key => {
      if (!lowStockTanks.some(t => String(t.productId || t.productName) === key)) {
        sentAlertRef.current.delete(key);
        setSmsState(s => { const ns = { ...s }; delete ns[key]; return ns; });
      }
    });
  }, [lowStockTanks.map(t => t.productId).join(",")]);

  const putStockMutation = useMutation<
    { productId: string; amount: number },
    unknown,
    { productId: string; amount: number }
  >({
    mutationFn: async ({ productId, amount }) => {
      if (!empId) {
        throw new Error("Employee ID is required to update inventory");
      }
      
      const tank = tankList.find((inv: any) => inv.productId === productId) || {};
      const dto = {
        currentLevel: Number(amount),
        totalCapacity: tank.totalCapacity,
        stockValue: tank.stockValue,
        metric: tank.metric,
        status: tank.status ?? true,
        tankCapacity: tank.tankCapacity,
      };
      
      // Updated URL to match backend: /inventories/{productId}/employees/{empId}
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/inventories/${productId}/employees/${empId}`;
      await axios.put(url, dto);
      return { productId, amount };
    },
    onSuccess: () => {
      refetchAll();
      toast({
        title: "✅ Stock Updated Successfully",
        description: "Inventory has been updated with the new stock level",
        variant: "default",
      });
      setAddModal(false); setStockModal(null);
      setAddProductId(""); setAddValue(""); setStockValue("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Update Failed",
        description: error?.response?.data?.message || error?.message || "Failed to update stock",
        variant: "destructive",
      });
    }
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/inventories/${inventoryId}`;
      await axios.delete(url, {
        headers: {
          "X-Employee-Id": empId || "",
        },
      });
    },
    onSuccess: () => {
      refetchAll();
      setDeleteModal(null);
      toast({
        title: "✅ Deleted",
        description: "Inventory deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Delete Failed",
        description: error?.response?.data?.message || error?.message || "Failed to delete inventory.",
        variant: "destructive",
      });
    },
  });

  const refetchAll = useCallback(() => {
    refetchProducts();
    refetchInventories();
  }, [refetchProducts, refetchInventories]);

  const totalStockValue = activeTanks.reduce(
    (sum, tank) => sum + (Number(tank.currentLevel || 0) * Number(tank.price || 0)),
    0
  );

  const stats = [
    {
      title: "Total Capacity",
      value: activeTanks.length > 0
        ? `${(activeTanks.reduce((sum, tank) => sum + Number(tank.tankCapacity || 0), 0) / 1000).toFixed(1)}K`
        : "-",
      change: "Liters",
      icon: Fuel,
      color: "text-primary",
      bgColor: "bg-primary-soft",
    },
    {
      title: "Current Stock",
      value: activeTanks.length > 0
        ? `${(activeTanks.reduce((sum, tank) => sum + Number(tank.currentLevel || 0), 0) / 1000).toFixed(1)}K`
        : "-",
      change: "Liters available",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success-soft",
    },
    {
      title: "Product Types",
      value: activeTanks.length ? activeTanks.length : "-",
      change: "",
      icon: BarChart3,
      color: "text-accent",
      bgColor: "bg-accent-soft",
    },
    {
      title: "Stock Value",
      value: activeTanks.length > 0 ? `₹${(totalStockValue / 100000).toFixed(2)}L` : "-",
      change: "Current worth",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success-soft",
    },
  ];

  const getStockPercentage = (current, capacity) => capacity ? Math.round((current / capacity) * 100) : 0;

  const getStockStatus = (percentage: number): {
    color: string;
    bg: string;
    label: string;
    variant: "destructive" | "secondary" | "outline" | "default";
  } => {
    if (percentage < 20) return { color: "text-destructive", bg: "bg-destructive-soft", label: "Critical", variant: "destructive" };
    if (percentage < 40) return { color: "text-warning", bg: "bg-warning-soft", label: "Low", variant: "secondary" };
    if (percentage < 70) return { color: "text-primary", bg: "bg-primary-soft", label: "Medium", variant: "outline" };
    return { color: "text-success", bg: "bg-success-soft", label: "Good", variant: "outline" };
  };

  const openStockModal = (tank) => { 
    const isActive = tank.status === true || tank.status === "true" || tank.status === 1 || tank.status === "1";
    if (!isActive) {
      toast({
        title: "⚠️ Cannot Update Stock",
        description: "This product is inactive. Please activate it first to update stock.",
        variant: "destructive",
      });
      return;
    }
    setStockModal(tank); 
    setStockValue("");
    toast({
      title: "📝 Update Stock",
      description: `Updating stock for ${tank.productName}`,
      variant: "default",
    });
  };
  
  const openAddModal = () => { 
    setAddModal(true); 
    setAddProductId(""); 
    setAddValue("");
    toast({
      title: "➕ Record Purchase",
      description: "Add fuel to your inventory",
      variant: "default",
    });
  };
  
  const openRefillModal = (tank) => { 
    const isActive = tank.status === true || tank.status === "true" || tank.status === 1 || tank.status === "1";
    if (!isActive) {
      toast({
        title: "⚠️ Cannot Schedule Refill",
        description: "This product is inactive. Please activate it first to schedule refills.",
        variant: "destructive",
      });
      return;
    }
    setRefillModal(tank); 
    setRefillDate(tankRefillDates[tank.productId || tank.productName] || "");
    toast({
      title: "📅 Schedule Refill",
      description: `Planning refill for ${tank.productName}`,
      variant: "default",
    });
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!addProductId || !addValue || isNaN(Number(addValue))) return;
    
    // Check if the selected product is active
    const selectedTank = tankList.find((t: any) => t.productId === addProductId);
    if (selectedTank) {
      const isActive = selectedTank.status === true || selectedTank.status === "true" || selectedTank.status === 1 || selectedTank.status === "1";
      if (!isActive) {
        toast({
          title: "⚠️ Cannot Add Stock",
          description: "This product is inactive. Please activate it first to add stock.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if adding stock exceeds tank capacity
      const currentLevel = Number(selectedTank.currentLevel || 0);
      const addAmount = Number(addValue);
      const tankCapacity = Number(selectedTank.tankCapacity || 0);
      
      if (tankCapacity > 0 && (currentLevel + addAmount) > tankCapacity) {
        toast({
          title: "❌ Exceeds Tank Capacity",
          description: `Cannot add ${addAmount}L. Current: ${currentLevel}L + New: ${addAmount}L = ${currentLevel + addAmount}L exceeds tank capacity of ${tankCapacity}L.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    putStockMutation.mutate({ productId: addProductId, amount: Number(addValue) });
  };

  const handleStockUpdate = (e) => {
    e.preventDefault();
    if (!stockModal || !stockValue || isNaN(Number(stockValue))) return;
    
    // Check if the product is active
    const isActive = stockModal.status === true || stockModal.status === "true" || stockModal.status === 1 || stockModal.status === "1";
    if (!isActive) {
      toast({
        title: "⚠️ Cannot Update Stock",
        description: "This product is inactive. Please activate it first to update stock.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if updating stock exceeds tank capacity
    const currentLevel = Number(stockModal.currentLevel || 0);
    const addAmount = Number(stockValue);
    const tankCapacity = Number(stockModal.tankCapacity || 0);
    
    if (tankCapacity > 0 && (currentLevel + addAmount) > tankCapacity) {
      toast({
        title: "❌ Exceeds Tank Capacity",
        description: `Cannot add ${addAmount}L. Current: ${currentLevel}L + New: ${addAmount}L = ${currentLevel + addAmount}L exceeds tank capacity of ${tankCapacity}L.`,
        variant: "destructive",
      });
      return;
    }
    
    putStockMutation.mutate({ productId: stockModal.productId, amount: Number(stockValue) });
  };

  const handleRefillSave = (e) => {
    e.preventDefault();
    setTankRefillDates((dates) => ({
      ...dates,
      [refillModal.productId || refillModal.productName]: refillDate,
    }));
    toast({
      title: "✅ Refill Scheduled",
      description: `Refill date set for ${refillModal.productName} on ${new Date(refillDate).toLocaleDateString('en-IN')}`,
      variant: "default",
    });
    setRefillModal(null);
    setRefillDate("");
  };

  const handleReportView = () => {
    const tank = activeTanks.find((p) => p.productId === reportProductId || p.productName === reportProductId);
    setReportProduct(tank || null);
    if (tank) {
      toast({
        title: "📊 Report Generated",
        description: `Viewing stock report for ${tank.productName}`,
        variant: "default",
      });
    }
  };

  const handleReportDownload = () => {
    if (!reportProduct) return;
    const rows = [
      ["Product Name", "Tank Capacity", "Current Level", "Price/Liter", "Supplier", "Status"],
      [reportProduct.productName, reportProduct.tankCapacity, reportProduct.currentLevel, reportProduct.price, reportProduct.supplier, reportProduct.status ? "Active" : "Inactive"],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StockReport-${reportProduct.productName || reportProduct.productId}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast({
      title: "📥 Download Complete",
      description: `Stock report for ${reportProduct.productName} downloaded successfully`,
      variant: "default",
    });
  };

  return (
    <div className="space-y-6 -mt-6 animate-fade-in">
      {/* CSS Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tank Inventory</h1>
          <p className="text-muted-foreground">Monitor fuel levels and manage stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="flex items-center gap-1" onClick={() => navigate("/inventory/history")}>
            <History className="h-4 w-4" /> Inventory History
          </Button>
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Stock
          </Button>
          <Button className="btn-gradient-primary" onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Purchase
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-foreground">{stat.value}</p>
                      {!!stat.change && <p className="text-[10px] text-muted-foreground">{stat.change}</p>}
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-2 rounded-lg shrink-0`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Loading/Empty States */}
      {(isLoadingProducts || isLoadingInventories) ? (
        <div className="text-center py-20 opacity-70 flex items-center justify-center">
          <RefreshCw className="animate-spin h-8 w-8 mr-2" />
          <span className="text-lg">Loading tanks ...</span>
        </div>
      ) : tankList.length === 0 ? (
        <div className="py-20 flex justify-center items-center flex-col opacity-60">
          <PackageOpen size={56} className="mb-2" />
          <div className="font-semibold text-xl">No tank inventories found</div>
          <div className="text-muted-foreground">Add a product and log purchases to begin tracking your inventory.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {tankList.map((tank, idx) => {
            if (!tank) return null;
            // Normalize status: true/"true"/1 is active; everything else is inactive
            const isActive =
              tank.status === true ||
              tank.status === "true" ||
              tank.status === 1 ||
              tank.status === "1";
            const capacity = Number(tank.tankCapacity || 0);
            const currentStock = Number(tank.currentLevel || 0);
            const percentage = getStockPercentage(currentStock, capacity);
            const status = getStockStatus(percentage);

            return (
              <Card
                key={tank.inventoryId || tank.productId || tank.productName || idx}
                className={
                  "card-gradient hover-lift transition-all " +
                  (!isActive 
                    ? "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-2 border-red-300 dark:border-red-700 opacity-75" 
                    : "")
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Fuel className={`h-5 w-5 ${!isActive ? 'text-gray-400' : ''}`} />
                      <CardTitle className={`text-lg ${!isActive ? 'text-gray-500 dark:text-gray-400' : ''}`}>
                        {tank.productName || "—"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isActive ? status.variant : "destructive"}
                        className={!isActive ? "bg-red-500 text-white font-semibold" : percentage < 20 ? "animate-pulse" : ""}
                      >
                        {!isActive ? "🔒 Inactive" : (percentage < 20 && <AlertTriangle className="mr-1 h-3 w-3" />)}
                        {!isActive ? "" : status.label}
                      </Badge>
                      {isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/20"
                          title="Delete Inventory"
                          onClick={() => setDeleteModal(tank)}
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stock Level</span>
                      <span className="font-medium">{capacity ? percentage : 0}%</span>
                    </div>
                    <Progress value={capacity ? percentage : 0} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{currentStock.toLocaleString()}L</span>
                      <span>{capacity.toLocaleString()}L</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price/Liter</p>
                      <p className="font-medium text-foreground">{tank.price ? `₹${tank.price}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Supplier</p>
                      <p className="font-medium text-foreground">{tank.supplier || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className={"font-medium " + (!isActive ? "text-red-700" : "text-foreground")}>{isActive ? "Active" : "Inactive"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Refill</p>
                      <p className="font-medium text-foreground">{formatDateTime(tank.lastUpdated)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openStockModal(tank)}
                      disabled={!isActive}
                      title={!isActive ? "Cannot update: Tank is inactive" : "Update Stock"}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Update Stock
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openRefillModal(tank)} disabled={!isActive}
                      title={!isActive ? "Cannot Schedule Refill: Tank is inactive" : "Schedule Refill"}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Refill
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-center min-h-[88px]">
                    <div className="text-center">
                      <p className="text-[15px] text-muted-foreground uppercase tracking-wide">Stock Value</p>
                      <p className="text-3xl sm:text-4xl font-extrabold text-primary">
                        {Number(tank.price) && Number(tank.currentLevel)
                          ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0
                          }).format(Number(tank.currentLevel) * Number(tank.price))
                          : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="card-gradient">
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="btn-gradient-primary h-auto p-4 flex-col gap-2" onClick={openAddModal}>
              <Plus className="h-6 w-6" /> <span>Record Purchase</span>
            </Button>
            <Button className="btn-gradient-accent h-auto p-4 flex-col gap-2" onClick={() => setReportModal(true)}>
              <BarChart3 className="h-6 w-6" /> <span>Stock Report</span>
            </Button>
            <Button className="btn-gradient-success h-auto p-4 flex-col gap-2 relative" onClick={() => setLowStockModal(true)}>
              <AlertTriangle className="h-6 w-6" /> <span>Low Stock Alerts</span>
              {lowStockTanks.length > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-destructive text-white px-2 py-0.5 text-xs font-bold shadow">
                  {lowStockTanks.length}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ULTRA MODERN Add Purchase Modal */}
      {addModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (addModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setAddModal(false)}
        >

          <div
            className="bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-indigo-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setAddModal(false)} />

            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Record Purchase</h3>
                <p className="text-sm text-muted-foreground">Add fuel to inventory</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleAddStock}>
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-blue-600" />
                  Select Tank <span className="text-red-600">*</span>
                </Label>
                <Select value={addProductId} onValueChange={setAddProductId}>
                  <SelectTrigger className="w-full h-12 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all rounded-xl shadow-sm">
                    <SelectValue placeholder="Choose a tank..." />
                  </SelectTrigger>
                  <SelectContent className="z-[10000] max-h-[300px] rounded-xl border-2">
                    {products.filter(prod => prod.active === true || prod.status === true).map((prod) => (
                      <SelectItem key={prod.id} value={prod.id} className="cursor-pointer rounded-lg my-1">
                        <div className="flex items-center gap-3 py-1">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                            <Fuel className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{prod.productName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Amount to Add ({products.find((p: any) => p.id === addProductId)?.metric || 'Liters'}) <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={addValue}
                    onChange={e => setAddValue(e.target.value)}
                    required
                    min="0"
                    className="h-12 pl-4 pr-16 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-green-200/50 dark:border-green-800/50 hover:border-green-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all rounded-xl shadow-sm text-lg font-semibold"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    {products.find((p: any) => p.id === addProductId)?.metric || 'Liters'}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
                disabled={putStockMutation.isPending}
              >
                {putStockMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Recording...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    <span>Record Purchase</span>
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ULTRA MODERN Update Stock Modal */}
      {stockModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (stockModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setStockModal(null)}
        >

          <div
            className="bg-gradient-to-br from-white/95 via-purple-50/90 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-purple-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setStockModal(null)} />

            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground">Update Stock</h3>
                <p className="text-sm text-muted-foreground">{stockModal.productName}</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleStockUpdate}>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200/50 dark:border-blue-800/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">Current Stock Level</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-foreground">{Number(stockModal.currentLevel || 0).toLocaleString()}</p>
                  <p className="text-lg font-bold text-muted-foreground pb-1">{stockModal.metric || 'Liters'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  Amount to Add ({stockModal.metric || 'Liters'}) <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={stockValue}
                  onChange={e => setStockValue(e.target.value)}
                  required
                  className="h-14 px-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-green-200/50 dark:border-green-800/50 hover:border-green-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all rounded-xl shadow-sm text-2xl font-bold text-center"
                />
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200/50 dark:border-green-800/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">New Total After Update</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {Number(stockModal.currentLevel || 0) + (Number(stockValue) || 0)}
                  </p>
                  <p className="text-lg font-bold text-muted-foreground pb-1">{stockModal.metric || 'Liters'}</p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all"
                disabled={putStockMutation.isPending || Number(stockValue) < 1}
              >
                {putStockMutation.isPending ? "Updating..." : "Confirm Update"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ULTRA MODERN Refill Schedule Modal */}
      {refillModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (refillModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setRefillModal(null)}
        >

          <div
            className="bg-gradient-to-br from-white/95 via-orange-50/90 to-red-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-orange-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setRefillModal(null)} />
            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Schedule Refill</h3>
                <p className="text-sm text-muted-foreground">{refillModal.productName}</p>
              </div>
            </div>
            <form className="space-y-6" onSubmit={handleRefillSave}>
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Select Refill Date <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="date"
                  value={refillDate}
                  onChange={e => setRefillDate(e.target.value)}
                  required
                  className="h-12 px-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-orange-200/50 dark:border-orange-800/50 hover:border-orange-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all rounded-xl shadow-sm text-lg font-semibold"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 hover:from-orange-700 hover:via-red-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Save Refill Date
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ULTRA MODERN Stock Report Modal */}
      {reportModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (reportModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => { setReportModal(false); setReportProductId(""); setReportProduct(null); }}
        >
          <div
            className="bg-gradient-to-br from-white/95 via-violet-50/90 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-indigo-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-lg my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => { setReportModal(false); setReportProductId(""); setReportProduct(null); }} />
            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Product Stock Report</h3>
                <p className="text-sm text-muted-foreground">Download detailed stats</p>
              </div>
            </div>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold">Select Product</Label>
                <Select
                  value={reportProductId}
                  onValueChange={(value) => { setReportProductId(value); setReportProduct(null); }}
                >
                  <SelectTrigger className="w-full h-11 bg-white/80 dark:bg-slate-900/80 border-2 hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl shadow-sm">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  {/* Highest z-index to ensure dropdown is above modal */}
                  <SelectContent className="z-[10100] max-h-[300px] rounded-xl border-2">
                    {activeTanks.map((prod) => (
                      <SelectItem key={prod.productId} value={prod.productId} className="cursor-pointer">
                        {prod.productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleReportView} disabled={!reportProductId} className="mt-auto h-11">
                <Eye className="h-4 w-4 mr-1" />View
              </Button>
            </div>
            {reportProduct && (
              <div>
                <table className="w-full mb-4 border border-muted rounded text-sm">
                  <tbody>
                    <tr><td className="px-3 py-2 font-medium bg-muted/30">Product Name</td><td className="px-3 py-2">{reportProduct.productName}</td></tr>
                    <tr><td className="px-3 py-2 font-medium bg-muted/30">Tank Capacity</td><td className="px-3 py-2">{reportProduct.tankCapacity ?? "—"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium bg-muted/30">Current Level</td><td className="px-3 py-2">{reportProduct.currentLevel ?? "—"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium bg-muted/30">Price per Liter</td><td className="px-3 py-2">{reportProduct.price ?? "—"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium bg-muted/30">Supplier</td><td className="px-3 py-2">{reportProduct.supplier ?? "—"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium bg-muted/30">Metric</td><td className="px-3 py-2">{reportProduct.metric ?? "—"}</td></tr>
                  </tbody>
                </table>
                <div className="flex gap-3 justify-end">
                  <Button onClick={handleReportDownload} className="btn-gradient-primary h-11">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ULTRA MODERN Low Stock Alerts Modal */}
      {lowStockModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (lowStockModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setLowStockModal(false)}
        >

          <div
            className="bg-gradient-to-br from-white/95 via-yellow-50/90 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-yellow-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-lg max-h-[80vh] overflow-y-auto my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setLowStockModal(false)} />
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" /> Low Stock Alerts
            </h3>
            {lowStockTanks.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No products are currently low on stock (below 20%).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded">
                  <thead>
                    <tr className="bg-muted">
                      <th className="py-2 px-3 text-left">Product</th>
                      <th className="py-2 px-3 text-left">Current</th>
                      <th className="py-2 px-3 text-left">Capacity</th>
                      <th className="py-2 px-3 text-left">Status</th>
                      <th className="py-2 px-3 text-left">SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockTanks.map((tank) => (
                      <tr key={tank.productId} className="border-t">
                        <td className="py-2 px-3">{tank.productName}</td>
                        <td className="py-2 px-3">{tank.currentLevel}L</td>
                        <td className="py-2 px-3">{tank.tankCapacity}L</td>
                        <td className="py-2 px-3">
                          <Badge variant="destructive" className="text-xs">Low</Badge>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {smsState[String(tank.productId || tank.productName)] || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ULTRA MODERN Delete Modal */}
      {deleteModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (deleteModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setDeleteModal(null)}
        >

          <div
            className="bg-gradient-to-br from-white/95 via-slate-50/90 to-red-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-red-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setDeleteModal(null)} />
            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 shadow-lg shadow-red-500/30">
                <Trash2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-2xl text-foreground">Delete Inventory</h2>
                <p className="text-sm text-muted-foreground">This action is permanent</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200/50 dark:border-red-800/50">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete inventory for <b>{deleteModal.productName}</b>?
              </p>
              <p className="text-sm font-bold text-destructive mt-2">
                ⚠️ This will remove all tank data from the system (product definition will remain).
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDeleteModal(null)} 
                className="h-11 px-6"
                disabled={deleteInventoryMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteInventoryMutation.mutate(deleteModal._id || deleteModal.inventoryId)} 
                disabled={deleteInventoryMutation.isPending} 
                className="h-11 px-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
              >
                {deleteInventoryMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Inventory</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


