import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Fuel, Droplets, Edit2, Plus, Trash2, X, Archive, TrendingUp, TrendingDown, PackageCheck, Database, LayoutGrid, LayoutList } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import PopupClose from "@/components/PopupClose";
import { API_CONFIG } from '@/lib/api-config';
import { useToast } from "@/components/ui/use-toast";

// Removed - using API_CONFIG

const PRODUCT_OPTIONS = ["Petrol", "Diesel", "2T", "Premium Petrol", "CNG"];
const ICONS = {
  Petrol: Fuel,
  Diesel: Droplets,
  "Premium Petrol": Fuel,
  "2T": PackageCheck,
  CNG: Database,
};

function formatDateTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return Number.isNaN(d.getTime())
    ? dt
    : d.toLocaleDateString("en-IN") +
        " " +
        d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY_FORM = {
  id: "",
  productName: "",
  dateTime: "",
  dipReadingProduct: "",
  dipReadingWater: "",
  netStockLiters: "",
  totalOpeningStock: "",
  receiptQuantityInLitres: "",
  closingStockInLitres: "",
  saleAsForTankStock: "",
  actualSalesAsPerMeter: "",
  stockVariation: "",
};

export default function StockRegister() {
  // Get orgId, empId from local storage (as in your design)
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "EMP-AUTH-001";
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, productName: PRODUCT_OPTIONS[0] });
  const [editId, setEditId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [product, setProduct] = useState(PRODUCT_OPTIONS[0]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const { data: stocks = [], isLoading, refetch } = useQuery({
    queryKey: ["stock-register", orgId, product],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/stock-register`;
      const res = await axios.get(url, { timeout: 20000 });
      return (Array.isArray(res.data) ? res.data : []).filter(
        (e) => e.productName === product
      );
    },
  });

  // Stats
  const statCards = useMemo(() => {
    const total = stocks.length;
    const totalReceipt = stocks.reduce((a, s) => a + (+s.receiptQuantityInLitres || 0), 0);
    const totalSale = stocks.reduce((a, s) => a + (+s.actualSalesAsPerMeter || 0), 0);
    const totalVariation = stocks.reduce((a, s) => a + (+s.stockVariation || 0), 0);
    return [
      { title: "Entries", value: total, icon: Archive, bg: "bg-primary-soft", color: "text-primary" },
      { title: "Total Receipt", value: `${totalReceipt.toLocaleString()} L`, icon: PackageCheck, bg: "bg-success-soft", color: "text-success" },
      { title: "Total Sale", value: `${totalSale.toLocaleString()} L`, icon: TrendingDown, bg: "bg-accent-soft", color: "text-accent" },
      { title: "Total Variation", value: `${totalVariation.toLocaleString()}`, icon: TrendingUp, bg: "bg-destructive/10", color: "text-destructive" },
    ];
  }, [stocks]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (body: typeof EMPTY_FORM) => {
      const req = {
        ...body,
        dipReadingProduct: +body.dipReadingProduct,
        dipReadingWater: +body.dipReadingWater,
        netStockLiters: +body.netStockLiters,
        totalOpeningStock: +body.totalOpeningStock,
        receiptQuantityInLitres: +body.receiptQuantityInLitres,
        closingStockInLitres: +body.closingStockInLitres,
        saleAsForTankStock: +body.saleAsForTankStock,
        actualSalesAsPerMeter: +body.actualSalesAsPerMeter,
        organizationId: orgId,
      };
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/stock-register`;
      return (await axios.post(url, req)).data;
    },
    onSuccess: () => { refetch(); handleCloseModal(); toast({ title: "Entry added!", variant: "default" }); },
    onError: () => { toast({ title: "Failed to add entry", variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: typeof EMPTY_FORM & { id: string }) => {
      const req = {
        ...body,
        dipReadingProduct: +body.dipReadingProduct,
        dipReadingWater: +body.dipReadingWater,
        netStockLiters: +body.netStockLiters,
        totalOpeningStock: +body.totalOpeningStock,
        receiptQuantityInLitres: +body.receiptQuantityInLitres,
        closingStockInLitres: +body.closingStockInLitres,
        saleAsForTankStock: +body.saleAsForTankStock,
        actualSalesAsPerMeter: +body.actualSalesAsPerMeter,
        organizationId: orgId,
      };
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/stock-register/${body.id}`;
      return (await axios.put(url, req)).data;
    },
    onSuccess: () => { refetch(); handleCloseModal(); toast({ title: "Entry updated!", variant: "default" }); },
    onError: () => { toast({ title: "Failed to update entry", variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/stock-register/${id}`;
      return (await axios.delete(url)).data;
    },
    onSuccess: () => { refetch(); setDeleteTarget(null); setConfirmOpen(false); toast({ title: "Entry deleted!", variant: "default" }); },
    onError: () => { toast({ title: "Failed to delete entry", variant: "destructive" }); },
  });

  function handleCloseModal() {
    setModalOpen(false);
    setTimeout(() => { setForm({ ...EMPTY_FORM, productName: product }); setEditId(null); }, 200);
  }
  function openCreateModal() {
    setEditId(null); setForm({ ...EMPTY_FORM, productName: product }); setModalOpen(true);
  }
  function openEditModal(entry) {
    setEditId(entry.id);
    setForm({
      ...entry,
      dipReadingProduct: entry.dipReadingProduct ?? "",
      dipReadingWater: entry.dipReadingWater ?? "",
      netStockLiters: entry.netStockLiters ?? "",
      totalOpeningStock: entry.totalOpeningStock ?? "",
      receiptQuantityInLitres: entry.receiptQuantityInLitres ?? "",
      closingStockInLitres: entry.closingStockInLitres ?? "",
      saleAsForTankStock: entry.saleAsForTankStock ?? "",
      actualSalesAsPerMeter: entry.actualSalesAsPerMeter ?? "",
      dateTime: entry.dateTime ? entry.dateTime.slice(0, 16) : "",
    });
    setModalOpen(true);
  }

  // Form Handlers
  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  function handleFormSubmit(e) {
    e.preventDefault();
    if (!form.productName || !form.dateTime) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    (editId ? updateMutation : createMutation).mutate({ ...form, id: editId });
  }
  // Icon
  function getIcon(name) {
    const Ico = ICONS[name] || Archive;
    return <Ico className="h-5 w-5 text-primary" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Stock Register</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage daily tank stock, sales, and variations</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="min-w-[120px] h-10 border-border/50">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="btn-gradient-primary w-full sm:w-auto" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Add New Entry
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-lg shrink-0`}><Icon className={`h-4 w-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="card-gradient border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Archive className="h-5 w-5 text-primary" />
              All Entries
              <Badge variant="secondary" className="ml-2">{stocks.length}</Badge>
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
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading entries...</p>
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <Archive className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">No entries found</p>
            </div>
          ) : (
            viewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table className="[&_td]:py-1.5 [&_th]:py-1.5 [&_td]:px-2 [&_th]:px-2">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Date/Time</TableHead>
                      <TableHead className="font-semibold text-xs">Product</TableHead>
                      <TableHead className="font-semibold text-xs text-right">DIP Prod</TableHead>
                      <TableHead className="font-semibold text-xs text-right">DIP Water</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Net Stock</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Opening</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Receipt</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Closing</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Tank Sale</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Meter Sale</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Variation</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.map((entry, idx) => (
                      <TableRow key={entry.id || idx} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs whitespace-nowrap">{formatDateTime(entry.dateTime)}</TableCell>
                        <TableCell className="text-xs font-medium">{entry.productName}</TableCell>
                        <TableCell className="text-right text-xs">{entry.dipReadingProduct}</TableCell>
                        <TableCell className="text-right text-xs">{entry.dipReadingWater}</TableCell>
                        <TableCell className="text-right text-xs">{entry.netStockLiters} L</TableCell>
                        <TableCell className="text-right text-xs">{entry.totalOpeningStock} L</TableCell>
                        <TableCell className="text-right text-xs">{entry.receiptQuantityInLitres} L</TableCell>
                        <TableCell className="text-right text-xs">{entry.closingStockInLitres} L</TableCell>
                        <TableCell className="text-right text-xs">{entry.saleAsForTankStock} L</TableCell>
                        <TableCell className="text-right text-xs">{entry.actualSalesAsPerMeter} L</TableCell>
                        <TableCell className={`text-right text-xs font-bold ${entry.stockVariation < 0 ? 'text-destructive' : 'text-green-700'}`}>{entry.stockVariation}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEditModal(entry)}><Edit2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 hover:bg-destructive hover:text-white" onClick={() => { setDeleteTarget({ id: entry.id, name: entry.productName }); setConfirmOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
            <div className="space-y-4">
              {stocks.map((entry, idx) => (
                <div key={entry.id || idx} className="group p-3 sm:p-5 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 flex items-center justify-center">
                      {getIcon(entry.productName)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base sm:text-lg">{entry.productName}</h3>
                        <Badge className="bg-slate-100 text-slate-700 border-primary/30">{formatDateTime(entry.dateTime)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs sm:text-sm pt-2">
                        <div><span className="text-muted-foreground">Opening: </span>{entry.totalOpeningStock} L</div>
                        <div><span className="text-muted-foreground">Receipt: </span>{entry.receiptQuantityInLitres} L</div>
                        <div><span className="text-muted-foreground">Closing: </span>{entry.closingStockInLitres} L</div>
                        <div><span className="text-muted-foreground">Meter Sale: </span>{entry.actualSalesAsPerMeter} L</div>
                        <div><span className="text-muted-foreground">Variation: </span>
                          <span className={`font-bold ${entry.stockVariation < 0 ? "text-destructive" : "text-green-700"}`}>
                            {entry.stockVariation}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                        <div>Dip Prod: {entry.dipReadingProduct}</div>
                        <div>Dip Water: {entry.dipReadingWater}</div>
                        <div>Net Stock: {entry.netStockLiters}</div>
                        <div>Tank Sale: {entry.saleAsForTankStock}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <CalendarDays className="h-3 w-3" /> {formatDateTime(entry.dateTime)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[120px]">
                      <Button size="icon" variant="outline" className="hover:bg-primary transition-colors"
                        onClick={() => openEditModal(entry)} aria-label="Edit">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="hover:bg-destructive transition-colors"
                        onClick={() => { setDeleteTarget({ id: entry.id, name: entry.productName }); setConfirmOpen(true); }} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={handleCloseModal}>
          <div className="relative bg-background shadow-2xl rounded-xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-border/50"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {editId ? "Edit Entry" : "Add Stock Entry"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{editId ? "Update" : "Create"} stock register entry</p>
              </div>
              <PopupClose onClick={handleCloseModal} />
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" id="register-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date/Time <span className="text-destructive">*</span></Label>
                  <Input name="dateTime" type="datetime-local" value={form.dateTime} onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Product <span className="text-destructive">*</span></Label>
                  <Select value={form.productName} onValueChange={v => setForm(f => ({ ...f, productName: v }))}>
                    <SelectTrigger className="w-full h-9 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{PRODUCT_OPTIONS.map((opt) =>
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    )}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dip Product <span className="text-destructive">*</span></Label>
                  <Input name="dipReadingProduct" type="number" value={form.dipReadingProduct}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Dip Water <span className="text-destructive">*</span></Label>
                  <Input name="dipReadingWater" type="number" value={form.dipReadingWater}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Net Stock (L) <span className="text-destructive">*</span></Label>
                  <Input name="netStockLiters" type="number" value={form.netStockLiters}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Opening Stock <span className="text-destructive">*</span></Label>
                  <Input name="totalOpeningStock" type="number" value={form.totalOpeningStock}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Receipt Qty <span className="text-destructive">*</span></Label>
                  <Input name="receiptQuantityInLitres" type="number" value={form.receiptQuantityInLitres}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Closing Stock <span className="text-destructive">*</span></Label>
                  <Input name="closingStockInLitres" type="number" value={form.closingStockInLitres}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Tank Sale <span className="text-destructive">*</span></Label>
                  <Input name="saleAsForTankStock" type="number" value={form.saleAsForTankStock}
                    onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Meter Sale <span className="text-destructive">*</span></Label>
                  <Input name="actualSalesAsPerMeter" type="number" value={form.actualSalesAsPerMeter}
                    onChange={handleFormChange} required />
                </div>
              </div>
            </form>
            {/* Modal Footer */}
            <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-3 px-6 py-4 border-t border-border/50 bg-muted/20 rounded-b-xl">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1 h-10 border-border/50 order-2 sm:order-1">Cancel</Button>
              <Button type="submit" form="register-form"
                className="flex-1 h-10 bg-gradient-to-r from-primary to-primary/80 shadow-md hover:shadow-lg order-1 sm:order-2"
                disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? (updateMutation.isPending ? "Updating..." : "Update Entry") : (createMutation.isPending ? "Adding..." : "Add Entry")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setConfirmOpen(false)}>
          <div className="relative bg-background shadow-2xl rounded-xl border max-w-[90vw] sm:max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-destructive/10"><Trash2 className="h-6 w-6 text-destructive" /></div>
                <h3 className="text-xl font-bold">Delete Entry?</h3>
              </div>
              <p className="text-base text-muted-foreground">
                This action cannot be undone.{deleteTarget?.name ? ` "${deleteTarget.name}" will be permanently removed.` : ""}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => { setDeleteTarget(null); setConfirmOpen(false); }} className="flex-1 border-border/50 h-10">Cancel</Button>
                <Button className="flex-1 bg-destructive text-destructive-foreground shadow-lg h-10"
                  onClick={() => { if (deleteTarget?.id) deleteMutation.mutate(deleteTarget.id); }}>Delete Entry</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

