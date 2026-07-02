import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Banknote, Download, Pencil, Trash2, UploadCloud,
  Calendar, Building2, Clock, X, Loader2,
  Search, AlertCircle, Receipt, DollarSign, TrendingUp, Wallet, LayoutGrid, LayoutList
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { API_CONFIG } from '@/lib/api-config';
import { useAuth } from '@/contexts/AuthContext';
import dayjs from "dayjs";

function safeArray(v: any) {
  return Array.isArray(v) ? v : Array.isArray(v?.content) ? v.content : [];
}

function normalizeSignedUrl(urlStr: string | null) {
  if (!urlStr) return urlStr;
  try {
    const u = new URL(urlStr);
    let p = u.pathname;
    while (p.includes('%25')) p = p.replace(/%25/g, '%');
    const params = u.searchParams;
    const signedHeaders = params.get('X-Goog-SignedHeaders') || params.get('x-goog-signedheaders');
    if (signedHeaders && /hosthost|UNSIGNED-PAYLOAD/.test(signedHeaders)) {
      params.set('X-Goog-SignedHeaders', 'host');
    }
    u.pathname = p;
    u.search = params.toString();
    return u.toString();
  } catch (e) {
    return urlStr;
  }
}

export default function BankDeposits() {
  const orgId = typeof window !== "undefined" ? (localStorage.getItem("organizationId") || "") : "";
  const { user } = useAuth();
  const userRole = user?.role || (typeof window !== "undefined" ? (localStorage.getItem("role") || "") : "");
  const { toast } = useToast();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    depositDate: dayjs().format("YYYY-MM-DD"),
    amount: "",
    bankName: "",
    accountNumber: "",
    referenceNumber: "",
    depositedBy: "",
    notes: "",
    file: null as File | null,
    receiptUrl: ""
  });
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Check if user has access (only manager and owner)
  const hasAccess = useMemo(() => {
    const role = String(userRole || '').toLowerCase();
    // tolerate variations like 'Manager', 'ROLE_MANAGER', etc.
    return role.includes('manager') || role.includes('owner');
  }, [userRole]);

  useEffect(() => {
    if (open || deleteDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, deleteDialogOpen]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ title: 'File Too Large', description: 'File size exceeds 10MB limit.', variant: 'destructive' });
      return;
    }

    setForm(f => ({ ...f, file }));
    try {
      const blob = URL.createObjectURL(file);
      setLocalPreviewUrl(blob);
    } catch (err) {
      setLocalPreviewUrl(null);
    }
  };

  useEffect(() => {
    if (!open && localPreviewUrl) {
      try { URL.revokeObjectURL(localPreviewUrl); } catch (e) { /* ignore */ }
      setLocalPreviewUrl(null);
      setForm(f => ({ ...f, file: null }));
    }
    return () => {
      if (localPreviewUrl) {
        try { URL.revokeObjectURL(localPreviewUrl); } catch (e) { /* ignore */ }
      }
    };
  }, [open, localPreviewUrl]);

  const stats = useMemo(() => {
    const total = deposits.length;
    const totalAmount = deposits.reduce((sum: number, dep: any) => sum + (dep.amount || 0), 0);
    const today = dayjs().format("YYYY-MM-DD");
    const todayDeposits = deposits.filter((dep: any) => dep.depositDate === today);
    const todayAmount = todayDeposits.reduce((sum: number, dep: any) => sum + (dep.amount || 0), 0);
    const thisMonth = dayjs().format("YYYY-MM");
    const monthDeposits = deposits.filter((dep: any) => dep.depositDate?.startsWith(thisMonth));
    const monthAmount = monthDeposits.reduce((sum: number, dep: any) => sum + (dep.amount || 0), 0);

    return [
      { title: "Total Deposits", value: total, change: "All time", icon: Banknote, bg: "bg-primary-soft", color: "text-primary" },
      { title: "Total Amount", value: formatCurrency(totalAmount), change: "All deposits", icon: DollarSign, bg: "bg-success-soft", color: "text-success" },
      { title: "Today's Deposits", value: todayDeposits.length, change: formatCurrency(todayAmount), icon: TrendingUp, bg: "bg-warning-soft", color: "text-warning" },
      { title: "This Month", value: monthDeposits.length, change: formatCurrency(monthAmount), icon: Wallet, bg: "bg-accent-soft", color: "text-accent" },
    ];
  }, [deposits]);

  const filteredDeposits = useMemo(() => {
    if (!searchQuery.trim()) return deposits;
    const q = searchQuery.toLowerCase();
    return deposits.filter((dep: any) =>
      dep.bankName?.toLowerCase().includes(q) ||
      dep.accountNumber?.toLowerCase().includes(q) ||
      dep.referenceNumber?.toLowerCase().includes(q) ||
      dep.depositedBy?.toLowerCase().includes(q)
    );
  }, [deposits, searchQuery]);

  const fetchDeposits = async () => {
    if (!orgId) {
      setLoading(false);
      setError("No organization selected.");
      return;
    }
    if (!hasAccess) {
      setLoading(false);
      setError("Access denied. Only managers and owners can view bank deposits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/bank-deposits?page=0&size=50`);
      setDeposits(safeArray(res.data));
    } catch (err: any) {
      setError(err?.message || "Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeposits(); }, [orgId, hasAccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: "Validation", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    if (!form.depositDate) {
      toast({ title: "Validation", description: "Deposit date is required.", variant: "destructive" });
      return;
    }
    if (!hasAccess) {
      toast({ title: 'Access Denied', description: 'Only managers and owners can add deposits.', variant: 'destructive' });
      return;
    }
    if (!orgId) {
      toast({ title: 'No Organization', description: 'Please select an organization.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);

      let finalReceiptUrl = form.receiptUrl;
      if (form.file) {
        setUploading(true);
        try {
          const data = new FormData();
          data.append('file', form.file);
          const r = await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/bank-deposits/upload`, data, { timeout: 60000, withCredentials: true });
          finalReceiptUrl = typeof r.data === 'string' ? r.data : r.data?.fileUrl || r.data;
          setForm(f => ({ ...f, receiptUrl: finalReceiptUrl }));
        } finally {
          setUploading(false);
        }
      }

      const payload = {
        organizationId: orgId,
        depositDate: form.depositDate,
        amount: parseFloat(form.amount),
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        referenceNumber: form.referenceNumber,
        depositedBy: form.depositedBy,
        receiptUrl: finalReceiptUrl,
        notes: form.notes,
      };

      if (editId) {
        await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/bank-deposits/${editId}`, payload, { withCredentials: true });
        toast({ title: 'Success', description: 'Deposit updated successfully!' });
      } else {
        await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/bank-deposits`, payload, { withCredentials: true });
        toast({ title: 'Success', description: 'Deposit added successfully!' });
      }
      setOpen(false);
      setEditId(null);
      setForm({ depositDate: dayjs().format("YYYY-MM-DD"), amount: '', bankName: '', accountNumber: '', referenceNumber: '', depositedBy: '', notes: '', file: null, receiptUrl: '' });
      if (localPreviewUrl) { URL.revokeObjectURL(localPreviewUrl); setLocalPreviewUrl(null); }
      fetchDeposits();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to save deposit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dep: any) => {
    setEditId(dep.id);
    setForm({
      depositDate: dep.depositDate || dayjs().format("YYYY-MM-DD"),
      amount: dep.amount?.toString() || "",
      bankName: dep.bankName || "",
      accountNumber: dep.accountNumber || "",
      referenceNumber: dep.referenceNumber || "",
      depositedBy: dep.depositedBy || "",
      notes: dep.notes || "",
      file: null,
      receiptUrl: dep.receiptUrl || ""
    });
    setLocalPreviewUrl(null);
    setOpen(true);
  };

  const confirmDelete = (dep: any) => { setDeleteTarget(dep); setDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/bank-deposits/${deleteTarget.id}`, { withCredentials: true });
      fetchDeposits();
      toast({ title: "Success", description: "Deposit deleted successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false); setDeleteTarget(null);
    }
  };

  const handleDownload = async (dep: any) => {
    let targetUrl = dep.receiptUrl;
    try {
      if (dep?.id && orgId) {
        try {
          const resp = await axios.get(
            `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/bank-deposits/${dep.id}/download-url`,
            { params: { durationSeconds: 60 }, timeout: 10000, withCredentials: true }
          );
          const maybeUrl = typeof resp.data === 'string' ? resp.data : resp.data?.url || resp.data;
          if (maybeUrl) {
            const norm = normalizeSignedUrl(maybeUrl);
            targetUrl = norm || maybeUrl;
          }
        } catch (innerErr) {
          console.warn('Signed URL request failed, falling back to receiptUrl', innerErr);
        }
      }

      if (!targetUrl) throw new Error('No download URL available');

      window.location.href = targetUrl;
      toast({ title: 'Download started', description: 'Opening the receipt...' });
      return;
    } catch (err: any) {
      console.error('Download failed, falling back to blob fetch', err);

      try {
        const fallbackUrl = targetUrl || dep.receiptUrl;
        if (!fallbackUrl) throw new Error('No URL available');
        const response = await fetch(fallbackUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `deposit_receipt_${dep.depositDate}_${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({ title: 'Success', description: 'Receipt downloaded successfully!' });
      } catch (finalErr: any) {
        console.error('Final download attempt failed', finalErr);
        toast({ title: 'Error', description: finalErr?.message || 'Failed to download receipt', variant: 'destructive' });
      }
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Only managers and owners have access to bank deposits. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bank Deposits</h1>
          <p className="text-muted-foreground">Track daily bank deposits and receipts</p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => { setOpen(true); setEditId(null); }} disabled={!orgId}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Add Deposit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
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

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deposits by bank, account, reference, or depositor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-muted/50">
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
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading deposits...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-destructive">
          <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
          <p>{error}</p>
        </div>
      ) : filteredDeposits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          {searchQuery ? (
            <>
              <Search className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No deposits found</p>
              <p className="text-sm">Try adjusting your search</p>
            </>
          ) : (
            <>
              <Banknote className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No deposits yet</p>
              <p className="text-sm">Add your first deposit to get started</p>
            </>
          )}
        </div>
      ) : (
        viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
            <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-xs">Date</TableHead>
                  <TableHead className="font-semibold text-xs">Amount</TableHead>
                  <TableHead className="font-semibold text-xs">Bank</TableHead>
                  <TableHead className="font-semibold text-xs">Account No.</TableHead>
                  <TableHead className="font-semibold text-xs">Reference</TableHead>
                  <TableHead className="font-semibold text-xs">Deposited By</TableHead>
                  <TableHead className="font-semibold text-xs">Notes</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.map((dep: any) => (
                  <TableRow key={dep.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs">{dayjs(dep.depositDate).format('DD MMM YYYY')}</TableCell>
                    <TableCell className="text-xs font-semibold text-green-600">{formatCurrency(dep.amount)}</TableCell>
                    <TableCell className="text-xs">{dep.bankName || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{dep.accountNumber || '—'}</TableCell>
                    <TableCell className="text-xs">{dep.referenceNumber || '—'}</TableCell>
                    <TableCell className="text-xs">{dep.depositedBy || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{dep.notes || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {dep.receiptUrl && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload(dep)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleEdit(dep)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600" onClick={() => confirmDelete(dep)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeposits.map((dep: any) => {
            return (
              <Card key={dep.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 shrink-0">
                        <Banknote className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-2xl text-green-600">{formatCurrency(dep.amount)}</h3>
                        <p className="text-sm text-muted-foreground truncate">{dep.bankName}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="font-medium">
                        {dayjs(dep.depositDate).format("DD MMM YYYY")}
                      </span>
                    </div>
                    {dep.accountNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">A/C: {dep.accountNumber}</span>
                      </div>
                    )}
                    {dep.referenceNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Receipt className="h-4 w-4 shrink-0" />
                        <span className="truncate">Ref: {dep.referenceNumber}</span>
                      </div>
                    )}
                    {dep.depositedBy && (
                      <div className="p-2 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground">Deposited By</p>
                        <p className="font-medium truncate">{dep.depositedBy}</p>
                      </div>
                    )}
                  </div>
                  {dep.receiptUrl && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-600"
                        onClick={() => handleDownload(dep)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 hover:bg-orange-50 hover:text-orange-600"
                      onClick={() => handleEdit(dep)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 hover:bg-red-50 hover:text-red-600"
                      onClick={() => confirmDelete(dep)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )
      )}

      {/* Add/Edit Modal */}
      {open && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-background shadow-2xl rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">{editId ? "Edit Deposit" : "Add New Deposit"}</h2>
                <p className="text-sm text-muted-foreground">Enter deposit details</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="deposit-form" onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Deposit Date *</Label>
                      <Input
                        type="date"
                        value={form.depositDate}
                        max={dayjs().format("YYYY-MM-DD")}
                        onChange={e => setForm(f => ({ ...f, depositDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Amount (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Bank Name *</Label>
                      <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Account Number</Label>
                      <Input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Reference Number</Label>
                      <Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Transaction/Check #" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Deposited By</Label>
                      <Input value={form.depositedBy} onChange={e => setForm(f => ({ ...f, depositedBy: e.target.value }))} placeholder="Employee name" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase text-muted-foreground">Upload Receipt (Optional)</Label>
                      <input
                        ref={(el) => { fileInputRef.current = el; }}
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'copy'; }}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0] || null; handleFileSelect(f); }}
                        role="button"
                        tabIndex={0}
                        className="mt-2 rounded-md border-2 border-dashed border-border px-4 py-6 flex items-center justify-center cursor-pointer hover:border-primary transition text-sm bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <UploadCloud className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-medium">Click or drag receipt to upload</div>
                            <div className="text-xs text-muted-foreground">PDF or image (max 10MB)</div>
                          </div>
                        </div>
                      </div>

                      {form.file ? (
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <div className="min-w-0 break-words">
                            <div className="font-medium">{form.file.name}</div>
                            <div className="text-xs text-muted-foreground">{formatBytes(form.file.size)}</div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-destructive underline ml-4"
                            onClick={() => {
                              if (localPreviewUrl) { try { URL.revokeObjectURL(localPreviewUrl); } catch (e) { /* ignore */ } }
                              setLocalPreviewUrl(null);
                              setForm(f => ({ ...f, file: null }));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >Remove</button>
                        </div>
                      ) : form.receiptUrl ? (
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <div className="min-w-0 break-words">
                            <div className="font-medium">{decodeURIComponent(String(form.receiptUrl).split('/').pop() || '')}</div>
                            <div className="text-xs text-muted-foreground">Existing receipt</div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-primary underline ml-4"
                            onClick={() => { try { fileInputRef.current?.click(); } catch (e) { /* ignore */ } }}
                          >Replace</button>
                        </div>
                      ) : null}

                      {uploading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase text-muted-foreground">Notes</Label>
                      <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes (optional)" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="sticky bottom-0 left-0 w-full px-6 py-4 border-t border-border bg-background flex justify-end gap-4 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                form="deposit-form"
                type="submit"
                className="btn-gradient-primary"
                disabled={submitting || uploading}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editId ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editId ? "Save Changes" : "Add Deposit"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setDeleteDialogOpen(false)}
        >
          <div className="bg-background p-8 rounded-2xl shadow-2xl relative w-full max-w-md">
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold">Delete Deposit</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete this deposit of <span className="font-semibold text-foreground">{formatCurrency(deleteTarget?.amount || 0)}</span>?
              <br />
              <span className="text-sm">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete Deposit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
