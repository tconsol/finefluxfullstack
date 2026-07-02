import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Box, Archive, Barcode, Fuel, Activity, TrendingUp, AlertCircle, ChevronDown, ChevronUp, X, Zap, LayoutGrid, LayoutList } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import PopupClose from "@/components/PopupClose";
import { useToast } from "@/components/ui/use-toast";
import { API_CONFIG } from "@/lib/api-config";

const GUNS_PER_PAGE = 4;
const ALL_GUN_OPTIONS = Array.from({ length: 20 }, (_, i) => `G${i + 1}`);

const getProductColor = (productName: string) => {
  const colors = [
    { bg: "bg-blue-500", text: "text-white", border: "border-blue-500" },
    { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-500" },
    { bg: "bg-purple-500", text: "text-white", border: "border-purple-500" },
    { bg: "bg-orange-500", text: "text-white", border: "border-orange-500" },
    { bg: "bg-pink-500", text: "text-white", border: "border-pink-500" },
    { bg: "bg-cyan-500", text: "text-white", border: "border-cyan-500" },
    { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-500" },
    { bg: "bg-rose-500", text: "text-white", border: "border-rose-500" },
    { bg: "bg-teal-500", text: "text-white", border: "border-teal-500" },
    { bg: "bg-amber-500", text: "text-white", border: "border-amber-500" },
  ];
  const hash = productName?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const GUN_COLORS_ARRAY = [
  "bg-blue-500 text-white",
  "bg-green-500 text-white",
  "bg-purple-500 text-white",
  "bg-rose-500 text-white",
  "bg-amber-500 text-white",
  "bg-orange-500 text-white",
  "bg-cyan-500 text-white",
  "bg-indigo-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
  "bg-red-500 text-white",
  "bg-sky-500 text-white",
  "bg-lime-500 text-black",
  "bg-violet-500 text-white",
  "bg-emerald-500 text-white",
  "bg-yellow-500 text-black",
  "bg-fuchsia-500 text-white",
  "bg-blue-800 text-white",
  "bg-slate-500 text-white",
  "bg-orange-700 text-white",
];

const getGunColor = (gunName: string) => {
  const gunNum = parseInt(gunName.replace("G", ""));
  return GUN_COLORS_ARRAY[(gunNum - 1) % GUN_COLORS_ARRAY.length];
};


const GunInfo = () => {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // PRODUCTS Query
  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // GUNS Query
  const { data: guns = [], isLoading } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // FORM STATES
  const [addForm, setAddForm] = useState({ productName: "", guns: "", serialNumber: "", currentReading: "" });
  const [editForm, setEditForm] = useState({ productName: "", guns: "", serialNumber: "", currentReading: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [gunDropdownLimit, setGunDropdownLimit] = useState(4);

  // Toggle gun dropdown expansion
  const handleGunDropdownExpansion = () => {
    setGunDropdownLimit((limit) => {
      if (limit === 4) return 10;
      if (limit === 10) return 20;
      return 4;
    });
  };

  // ---- Computeds for gun name and serial number validation ----
  const usedGunNamesAdd = useMemo(
    () => {
      const prod = String(addForm.productName || "").trim().toLowerCase();
      return guns
        .filter((g) => String(g.productName || "").trim().toLowerCase() === prod)
        .map((g) => String(g.guns || "").trim().toLowerCase());
    },
    [guns, addForm.productName]
  );
  const availableGunNamesAdd = useMemo(
    () => ALL_GUN_OPTIONS.filter((g) => !usedGunNamesAdd.includes(String(g).trim().toLowerCase())),
    [usedGunNamesAdd]
  );
  const visibleGunOptionsAdd = useMemo(
    () => availableGunNamesAdd.slice(0, gunDropdownLimit),
    [availableGunNamesAdd, gunDropdownLimit]
  );
  const usedSerialsAdd = useMemo(
    () => {
      const prod = String(addForm.productName || "").trim().toLowerCase();
      return guns
        .filter((g) => String(g.productName || "").trim().toLowerCase() === prod)
        .map((g) => String(g.serialNumber || "").trim().toLowerCase());
    },
    [guns, addForm.productName]
  );

  const usedGunNamesEdit = useMemo(
    () =>
      guns
        .filter(
          (g) =>
            String(g.productName || "").trim().toLowerCase() === String(editForm.productName || "").trim().toLowerCase() &&
            String(g.id || g._id) !== editId
        )
        .map((g) => String(g.guns || "").trim().toLowerCase()),
    [guns, editForm.productName, editId]
  );
  const availableGunNamesEdit = useMemo(
    () => ALL_GUN_OPTIONS.filter((g) => !usedGunNamesEdit.includes(g)),
    [usedGunNamesEdit]
  );
  const visibleGunOptionsEdit = useMemo(
    () => availableGunNamesEdit.slice(0, gunDropdownLimit),
    [availableGunNamesEdit, gunDropdownLimit]
  );
  const usedSerialsEdit = useMemo(
    () =>
      guns
        .filter(
          (g) =>
            String(g.productName || "").trim().toLowerCase() === String(editForm.productName || "").trim().toLowerCase() &&
            String(g.id || g._id) !== editId
        )
        .map((g) => String(g.serialNumber || "").trim().toLowerCase()),
    [guns, editForm.productName, editId]
  );

  // Mutation Handlers
  const createMutation = useMutation({
    mutationFn: async (payload: typeof addForm) => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo`;
      return (await axios.post(url, {
        organizationId: orgId,
        empId,
        ...payload,
        currentReading: Number(payload.currentReading),
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setAddForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
      toast({ title: "Success", description: "Gun added successfully!", variant: "default" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add gun info.", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editForm & { id: string }) => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo/${payload.id}`;
      return (await axios.put(url, {
        empId,
        ...payload,
        currentReading: Number(payload.currentReading),
        organizationId: orgId,
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setEditForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
      setEditId(null);
      setEditModalOpen(false);
      toast({ title: "Success", description: "Gun updated successfully!", variant: "default" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update gun info.", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo/${id}`;
      await axios.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setCurrentPage((p) => {
        const newTotal = guns.length - 1;
        const newPages = Math.max(1, Math.ceil(newTotal / GUNS_PER_PAGE));
        return Math.min(p, newPages);
      });
      toast({ title: "Success", description: "Gun deleted successfully!", variant: "default" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete gun info.", variant: "destructive" }),
  });

  // ------- STRONG VALIDATION -------
  const handleAddSubmit = (e: any) => {
    e.preventDefault();
    if (!addForm.productName || !addForm.guns || !addForm.serialNumber || addForm.currentReading === "") {
      toast({ title: "Validation Error", description: "All fields are required!", variant: "destructive" });
      return;
    }
    // Normalize values for robust comparison
    const newProd = String(addForm.productName || "").trim().toLowerCase();
    const newGun = String(addForm.guns || "").trim().toLowerCase();
    const newSerial = String(addForm.serialNumber || "").trim().toLowerCase();

    // Gun name per product (prevent duplicate gun-product links)
    if (usedGunNamesAdd.includes(newGun)) {
      toast({ title: "Validation Error", description: "Gun already linked to this product!", variant: "destructive" });
      return;
    }
    // Serial per product
    if (usedSerialsAdd.includes(newSerial)) {
      toast({ title: "Validation Error", description: "Serial number already exists for this product!", variant: "destructive" });
      return;
    }
    // Additionally, ensure the gun isn't already linked to the same product elsewhere (defensive)
    const exists = guns.some((g: any) =>
      String(g.productName || "").trim().toLowerCase() === newProd &&
      String(g.guns || "").trim().toLowerCase() === newGun
    );
    if (exists) {
      toast({ title: "Validation Error", description: "This gun is already assigned to the selected product.", variant: "destructive" });
      return;
    }
    createMutation.mutate(addForm);
  };

  const handleEditSubmit = (e: any) => {
    e.preventDefault();
    if (!editForm.productName || !editForm.guns || !editForm.serialNumber || editForm.currentReading === "") {
      toast({ title: "Validation Error", description: "All fields are required!", variant: "destructive" });
      return;
    }
    const editProd = String(editForm.productName || "").trim().toLowerCase();
    const editGun = String(editForm.guns || "").trim().toLowerCase();
    const editSerial = String(editForm.serialNumber || "").trim().toLowerCase();

    if (usedGunNamesEdit.includes(editGun)) {
      toast({ title: "Validation Error", description: "Gun already linked to this product!", variant: "destructive" });
      return;
    }
    if (usedSerialsEdit.includes(editSerial)) {
      toast({ title: "Validation Error", description: "Serial number already exists for this product!", variant: "destructive" });
      return;
    }
    // Defensive check: ensure no other record (excluding current) has same product+gun
    const conflict = guns.some((g: any) => {
      const gid = String(g.id || g._id || "");
      return gid !== String(editId || "") &&
        String(g.productName || "").trim().toLowerCase() === editProd &&
        String(g.guns || "").trim().toLowerCase() === editGun;
    });
    if (conflict) {
      toast({ title: "Validation Error", description: "Another record already links this gun to the selected product.", variant: "destructive" });
      return;
    }
    if (editId) updateMutation.mutate({ ...editForm, id: editId });
  };

  const handleAddFormChange = (e: any) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleEditFormChange = (e: any) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (gun: any) => {
    setEditForm({
      productName: gun.productName || "",
      guns: gun.guns,
      serialNumber: gun.serialNumber,
      currentReading: String(gun.currentReading ?? ""),
    });
    setEditId(String(gun.id || gun._id));
    setEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
    setEditId(null);
    setEditModalOpen(false);
  };

  // FILTERING/UI logic
  const filteredGuns = useMemo(() => {
    if (!searchQuery.trim()) return guns;
    const q = searchQuery.toLowerCase();
    return guns.filter(
      (gun: any) =>
        gun.guns?.toLowerCase().includes(q) ||
        gun.productName?.toLowerCase().includes(q) ||
        gun.serialNumber?.toLowerCase().includes(q)
    );
  }, [guns, searchQuery]);
  const totalPages = Math.ceil(filteredGuns.length / GUNS_PER_PAGE) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (filteredGuns.length === 0 && currentPage !== 1) setCurrentPage(1);
  }, [filteredGuns.length, totalPages, currentPage]);
  const pagedGuns = filteredGuns.slice(
    (currentPage - 1) * GUNS_PER_PAGE,
    currentPage * GUNS_PER_PAGE
  );

  // Stat cards (unchanged)
  const statCards = useMemo(() => {
    const totalProducts = products.length;
    const totalGuns = guns.length;
    const totalReading = guns.reduce((sum: number, g: any) => sum + (g.currentReading || 0), 0);
    const avgReading = totalGuns ? totalReading / totalGuns : 0;
    return [
      { title: "Total Products", value: totalProducts, change: "Available fuel types", icon: Box, bg: "bg-primary-soft", color: "text-primary" },
      { title: "Active Guns", value: totalGuns, change: "Registered dispensers", icon: Fuel, bg: "bg-success-soft", color: "text-success" },
      { title: "Total Reading", value: totalReading.toLocaleString(), change: "Cumulative liters", icon: Activity, bg: "bg-accent-soft", color: "text-accent" },
      { title: "Avg Reading", value: avgReading.toFixed(2), change: "Per gun average", icon: TrendingUp, bg: "bg-warning-soft", color: "text-warning" },
    ];
  }, [products, guns]);

  // -- COMPONENT UI --
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gun Information Management</h1>
        <p className="text-muted-foreground">Manage and monitor petrol pump dispensers</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div>
                      <p className="text-base font-bold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-lg shrink-0`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Gun Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Add New Gun
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAddSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="empId" className="text-xs uppercase text-muted-foreground">
                    Employee ID
                  </Label>
                  <Input id="empId" name="empId" value={empId} readOnly disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName" className="text-xs uppercase text-muted-foreground">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={addForm.productName}
                    onValueChange={(value) => setAddForm((prev) => ({ ...prev, productName: value, guns: "", serialNumber: "" }))}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {products.map((p: any) => (
                        <SelectItem key={p.productName} value={p.productName}>
                          {p.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guns" className="text-xs uppercase text-muted-foreground">
                    Gun Name/Number <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={addForm.guns}
                    onValueChange={(value) => setAddForm((prev) => ({ ...prev, guns: value }))}
                    disabled={createMutation.isPending || !addForm.productName}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gun (G1-G20)" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <div className="max-h-[240px] overflow-y-auto">
                        {visibleGunOptionsAdd.map((gunName) => (
                          <SelectItem key={gunName} value={gunName}>
                            {gunName}
                          </SelectItem>
                        ))}
                      </div>
                      <div className="sticky bottom-0 bg-popover border-t border-border mt-1 pt-2 pb-1 px-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGunDropdownExpansion(); }}
                        >
                          {gunDropdownLimit === 20 ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1.5" />
                              <span>Close</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1.5" />
                              <span>Show More ({gunDropdownLimit === 4 ? "10" : "20"} guns)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-xs uppercase text-muted-foreground">
                    Serial Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serialNumber"
                    name="serialNumber"
                    value={addForm.serialNumber}
                    onChange={handleAddFormChange}
                    placeholder="e.g. SN123456"
                    required
                    disabled={createMutation.isPending || !addForm.productName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentReading" className="text-xs uppercase text-muted-foreground">
                    Current Reading (Liters) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="currentReading"
                    name="currentReading"
                    type="number"
                    value={addForm.currentReading}
                    onChange={handleAddFormChange}
                    min={0}
                    placeholder="e.g. 1000"
                    step="0.01"
                    required
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="btn-gradient-primary flex-1"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Adding..." : "Add Gun"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        {/* Gun list and Edit modal */}
        <div className="lg:col-span-2">
          {editModalOpen && (
            <div
              className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
              style={{ margin: 0, padding: "1rem", minHeight: "100vh", minWidth: "100vw" }}
              onClick={handleCancelEdit}
            >
              <div
                className="relative bg-background shadow-2xl rounded-xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-border/50 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
              >
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      Edit Gun Info
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Update dispenser/gun details
                    </p>
                  </div>
                  <PopupClose onClick={handleCancelEdit} />
                </div>
                <form className="space-y-4 p-5" onSubmit={handleEditSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="empId" className="text-xs uppercase text-muted-foreground">
                      Employee ID
                    </Label>
                    <Input id="empId" name="empId" value={empId} readOnly disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productName" className="text-xs uppercase text-muted-foreground">
                      Product Name <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editForm.productName}
                      onValueChange={(value) => setEditForm((prev) => ({ ...prev, productName: value, guns: "", serialNumber: "" }))}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        {products.map((p: any) => (
                          <SelectItem key={p.productName} value={p.productName}>
                            {p.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guns" className="text-xs uppercase text-muted-foreground">
                      Gun Name/Number <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editForm.guns}
                      onValueChange={(value) => setEditForm((prev) => ({ ...prev, guns: value }))}
                      disabled={updateMutation.isPending || !editForm.productName}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gun (G1-G20)" />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        <div className="max-h-[240px] overflow-y-auto">
                          {visibleGunOptionsEdit.map((gunName) => (
                            <SelectItem key={gunName} value={gunName}>
                              {gunName}
                            </SelectItem>
                          ))}
                        </div>
                        <div className="sticky bottom-0 bg-popover border-t border-border mt-1 pt-2 pb-1 px-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGunDropdownExpansion(); }}
                          >
                            {gunDropdownLimit === 20 ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1.5" />
                                <span>Close</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1.5" />
                                <span>Show More ({gunDropdownLimit === 4 ? "10" : "20"} guns)</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber" className="text-xs uppercase text-muted-foreground">
                      Serial Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="serialNumber"
                      name="serialNumber"
                      value={editForm.serialNumber}
                      onChange={handleEditFormChange}
                      placeholder="e.g. SN123456"
                      required
                      disabled={updateMutation.isPending || !editForm.productName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentReading" className="text-xs uppercase text-muted-foreground">
                      Current Reading (Liters) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="currentReading"
                      name="currentReading"
                      type="number"
                      value={editForm.currentReading}
                      onChange={handleEditFormChange}
                      min={0}
                      placeholder="e.g. 1000"
                      step="0.01"
                      required
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      className="btn-gradient-primary flex-1"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Updating..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  All Guns ({filteredGuns.length})
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search guns..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-64"
                  />
                  <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/50 shrink-0">
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
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mb-3 opacity-50 animate-pulse mx-auto" />
                    <p>Loading guns...</p>
                  </div>
                </div>
              ) : filteredGuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm">Try a different search term</p>
                    </>
                  ) : (
                    <>
                      <Archive className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">No guns registered</p>
                      <p className="text-sm">Add your first gun using the form</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {viewMode === 'table' ? (
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold text-xs">Gun</TableHead>
                            <TableHead className="font-semibold text-xs">Product</TableHead>
                            <TableHead className="font-semibold text-xs">Serial Number</TableHead>
                            <TableHead className="font-semibold text-xs text-right">Current Reading</TableHead>
                            <TableHead className="font-semibold text-xs">Employee</TableHead>
                            <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedGuns.map((gun: any) => {
                            const productColor = getProductColor(gun.productName);
                            return (
                              <TableRow key={String(gun.id || gun._id)} className="hover:bg-muted/30 transition-colors">
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 ${getGunColor(gun.guns)}`}>{gun.guns}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 ${productColor.bg} ${productColor.text}`}>{gun.productName}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{gun.serialNumber}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-green-600">{gun.currentReading.toLocaleString()} L</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{gun.empId || '—'}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground" onClick={() => handleEdit(gun)}><Edit className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteMutation.mutate(gun.id || gun._id)} disabled={deleteMutation.isPending}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pagedGuns.map((gun: any) => {
                      const productColor = getProductColor(gun.productName);
                      return (
                        <div
                          key={String(gun.id || gun._id)}
                          className="group p-5 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 transition-all duration-300 border border-border hover:border-primary/50 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-4">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-0 shadow-md ${getGunColor(gun.guns)}`}>
                                  <Zap className="h-4 w-4" />
                                  <span className="font-bold">{gun.guns}</span>
                                </Badge>
                                <Badge
                                  className={`flex items-center gap-2 ${productColor.bg} ${productColor.text} px-3 py-1.5 rounded-full border-0 shadow-md`}
                                >
                                  <Fuel className="h-4 w-4" />
                                  <span className="font-medium">{gun.productName}</span>
                                </Badge>
                                <span className="ml-2 text-xs px-2 py-1 bg-muted rounded">
                                  <b>EmpID:</b> {gun.empId || "—"}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-accent-soft rounded-lg">
                                    <Barcode className="h-4 w-4 text-accent" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Serial Number</p>
                                    <p className="font-mono font-semibold truncate text-foreground">{gun.serialNumber}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-success-soft rounded-lg">
                                    <Activity className="h-4 w-4 text-success" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Reading</p>
                                    <p className="font-bold text-lg text-success">
                                      {gun.currentReading.toLocaleString()}{" "}
                                      <span className="text-sm font-normal">L</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(gun)}
                                className="h-9 w-9 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                                title="Edit Gun"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(gun.id || gun._id)}
                                className="h-9 w-9 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                disabled={deleteMutation.isPending}
                                title="Delete Gun"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                  {filteredGuns.length > GUNS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Showing{" "}
                        <span className="font-semibold text-foreground">
                          {(currentPage - 1) * GUNS_PER_PAGE + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold text-foreground">
                          {Math.min(currentPage * GUNS_PER_PAGE, filteredGuns.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-foreground">
                          {filteredGuns.length}
                        </span>{" "}
                        guns
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={currentPage === pageNum ? "default" : "outline"}
                                onClick={() => setCurrentPage(pageNum)}
                                className="h-9 min-w-[36px]"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GunInfo;
