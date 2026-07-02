import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Download, Pencil, Trash2, UploadCloud,
  Calendar, User, Building2, Clock, FileCheck, X, Loader2,
  Search, AlertCircle, File, LayoutGrid, LayoutList
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG

function safeArray(v: any) {
  return Array.isArray(v) ? v : Array.isArray(v?.content) ? v.content : [];
}

// Attempt to repair common signed-url encoding/signature-parameter issues
function normalizeSignedUrl(urlStr: string | null) {
  if (!urlStr) return urlStr;
  try {
    const u = new URL(urlStr);
    // Fix double-encoding in the pathname: convert %25 -> % repeatedly until stable
    let p = u.pathname;
    while (p.includes('%25')) p = p.replace(/%25/g, '%');
    // Some signers accidentally inject malformed X-Goog-SignedHeaders; if detected,
    // try resetting it to the common 'host' value so the signature may match pre-signed canonical.
    const params = u.searchParams;
    const signedHeaders = params.get('X-Goog-SignedHeaders') || params.get('x-goog-signedheaders');
    if (signedHeaders && /hosthost|UNSIGNED-PAYLOAD/.test(signedHeaders)) {
      params.set('X-Goog-SignedHeaders', 'host');
    }
    u.pathname = p;
    // Rebuild search from params (ensures modifications persist)
    u.search = params.toString();
    return u.toString();
  } catch (e) {
    return urlStr;
  }
}

// Build a set of candidate signed URLs by applying reasonable repairs.
function buildSignedUrlCandidates(urlStr: string | null) {
  if (!urlStr) return [] as string[];
  const set = new Set<string>();
  try {
    const orig = urlStr;
    set.add(orig);

    const norm = normalizeSignedUrl(orig);
    if (norm) set.add(norm);

    // Remove X-Goog-SignedHeaders entirely (some signers include malformed value)
    try {
      const u = new URL(norm || orig);
      const params = u.searchParams;
      if (params.has('X-Goog-SignedHeaders') || params.has('x-goog-signedheaders')) {
        params.delete('X-Goog-SignedHeaders');
        params.delete('x-goog-signedheaders');
        u.search = params.toString();
        set.add(u.toString());
      }
    } catch (e) { /* ignore */ }

    // Try progressively decoding percent-encoded sequences in the path
    try {
      const u2 = new URL(norm || orig);
      let p = u2.pathname;
      // decode up to 2 times
      for (let i = 0; i < 2; i++) {
        try {
          const dec = decodeURIComponent(p);
          if (dec === p) break;
          p = dec;
          u2.pathname = p;
          set.add(u2.toString());
        } catch (e) { break; }
      }
    } catch (e) { /* ignore */ }

    return Array.from(set.values());
  } catch (e) {
    return [urlStr];
  }
}

export default function Documents() {
  const orgId = typeof window !== "undefined" ? (localStorage.getItem("organizationId") || "") : "";
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [activeTab, setActiveTab] = useState<"general" | "gst" | "fuel">("general");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    documentType: "",
    issuingAuthority: "",
    issuedDate: "",
    expiryDate: "",
    renewalPeriodDays: "",
    responsibleParty: "",
    notes: "",
    file: null as File | null,
    fileUrl: "",
    category: "general" as "general" | "gst" | "fuel"
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  

  useEffect(() => {
    if (open || deleteDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, deleteDialogOpen]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Accept a File directly (used by drag/drop and hidden input change)
  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ title: 'File Too Large', description: 'File size exceeds 10MB limit. Please choose a smaller file.', variant: 'destructive' });
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

  // Revoke any created object URL when modal closes or component unmounts
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
    const total = documents.length;
    const now = new Date();
    const expiringSoon = documents.filter((doc: any) => {
      if (!doc.expiryDate) return false;
      const expiry = new Date(doc.expiryDate);
      const diff = expiry.getTime() - now.getTime();
      const daysUntilExpiry = diff / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;
    const expired = documents.filter((doc: any) => {
      if (!doc.expiryDate) return false;
      return new Date(doc.expiryDate) < now;
    }).length;
    return [
      { title: "Total Documents", value: total, change: "All documents", icon: FileText, bg: "bg-primary-soft", color: "text-primary" },
      { title: "Expiring Soon", value: expiringSoon, change: "Within 30 days", icon: Clock, bg: "bg-warning-soft", color: "text-warning" },
      { title: "Expired", value: expired, change: "Need renewal", icon: AlertCircle, bg: "bg-destructive/10", color: "text-destructive" },
      { title: "Valid", value: total - expired, change: "Currently active", icon: FileCheck, bg: "bg-success-soft", color: "text-success" },
    ];
  }, [documents]);

  const filteredDocs = useMemo(() => {
    // First filter by category
    let categoryFiltered = documents;
    if (activeTab === "gst") {
      categoryFiltered = documents.filter((doc: any) => 
        doc.documentType?.toLowerCase().includes("gst") ||
        doc.documentType?.toLowerCase().includes("tax") ||
        doc.category === "gst"
      );
    } else if (activeTab === "fuel") {
      categoryFiltered = documents.filter((doc: any) => 
        doc.documentType?.toLowerCase().includes("fuel") ||
        doc.documentType?.toLowerCase().includes("invoice") ||
        doc.documentType?.toLowerCase().includes("purchase") ||
        doc.category === "fuel"
      );
    } else {
      categoryFiltered = documents.filter((doc: any) => 
        doc.category !== "gst" && doc.category !== "fuel"
      );
    }

    // Then apply search filter
    if (!searchQuery.trim()) return categoryFiltered;
    const q = searchQuery.toLowerCase();
    return categoryFiltered.filter((doc: any) =>
      doc.documentType?.toLowerCase().includes(q) ||
      doc.issuingAuthority?.toLowerCase().includes(q) ||
      doc.responsibleParty?.toLowerCase().includes(q)
    );
  }, [documents, searchQuery, activeTab]);

  const fetchDocs = async () => {
    if (!orgId) {
      setLoading(false);
      setError("No organization selected. Please select an organization to load documents.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/documents?page=0&size=50`);
      setDocuments(safeArray(res.data));
    } catch (err: any) {
      setError(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchDocs(); }, [orgId]);

  const calculatedRenewalDays = useMemo(() => {
    if (!form.issuedDate || !form.expiryDate) return "";
    const d1 = new Date(form.issuedDate); const d2 = new Date(form.expiryDate);
    const diff = d2.getTime() - d1.getTime();
    const days = Math.max(Math.round(diff / (1000 * 60 * 60 * 24)), 0);
    return isNaN(days) ? "" : days.toString();
  }, [form.issuedDate, form.expiryDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date();
    const issued = form.issuedDate ? new Date(form.issuedDate) : null;
    const expired = form.expiryDate ? new Date(form.expiryDate) : null;
    if (issued && issued > today) {
      toast({ title: "Validation", description: "Issued date cannot be in the future.", variant: "destructive" });
      return;
    }
    if (issued && expired && expired < issued) {
      toast({ title: "Validation", description: "Expiry date cannot be before issued date.", variant: "destructive" });
      return;
    }
    if (!form.file && !form.fileUrl) {
      toast({ title: 'Validation', description: 'Please choose a file to upload before submitting.', variant: 'destructive' });
      return;
    }
    if (!orgId) {
      toast({ title: 'No Organization', description: 'Please select an organization before uploading documents.', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);

      // If user selected a new file, upload it now and get the remote fileUrl
      let finalFileUrl = form.fileUrl;
      if (form.file) {
        setUploading(true);
        try {
          const data = new FormData();
          data.append('file', form.file);
          const r = await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/documents/upload`, data, { timeout: 60000, withCredentials: true });
          finalFileUrl = typeof r.data === 'string' ? r.data : r.data?.fileUrl || r.data;
          // if backend returned signed preview, keep it
          const maybeSigned = r.data?.signedUrl || null;
          if (maybeSigned) setPreviewUrl(maybeSigned);
          setForm(f => ({ ...f, fileUrl: finalFileUrl }));
        } finally {
          setUploading(false);
        }
      }

      const payload = {
        documentType: form.documentType,
        organizationId: orgId,
        issuingAuthority: form.issuingAuthority,
        issuedDate: form.issuedDate,
        expiryDate: form.expiryDate,
        renewalPeriodDays: Number(calculatedRenewalDays),
        responsibleParty: form.responsibleParty,
        fileUrl: finalFileUrl,
        notes: form.notes,
        category: form.category || "general",
      };

      if (editId) {
        await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/documents/${editId}`, payload, { withCredentials: true });
        toast({ title: 'Success', description: 'Document updated successfully!' });
      } else {
        await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/documents`, payload, { withCredentials: true });
        toast({ title: 'Success', description: 'Document added successfully!' });
      }
      setOpen(false);
      setEditId(null);
      setForm({ documentType: '', issuingAuthority: '', issuedDate: '', expiryDate: '', renewalPeriodDays: '', responsibleParty: '', notes: '', file: null, fileUrl: '', category: 'general' });
      setPreviewUrl(null);
      if (localPreviewUrl) { URL.revokeObjectURL(localPreviewUrl); setLocalPreviewUrl(null); }
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to save document", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (doc: any) => {
    setEditId(doc.id);
    setForm({
      documentType: doc.documentType || "",
      issuingAuthority: doc.issuingAuthority || "",
      issuedDate: doc.issuedDate || "",
      expiryDate: doc.expiryDate || "",
      renewalPeriodDays: doc.renewalPeriodDays?.toString() || "",
      responsibleParty: doc.responsibleParty || "",
      notes: doc.notes || "",
      file: null,
      fileUrl: doc.fileUrl || "",
      category: doc.category || "general"
    });
    setPreviewUrl(null);
    setLocalPreviewUrl(null);
    setOpen(true);
  };

  const confirmDelete = (doc: any) => { setDeleteTarget(doc); setDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/documents/${deleteTarget.id}`, { withCredentials: true });
      fetchDocs();
      toast({ title: "Success", description: "Document deleted successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false); setDeleteTarget(null);
    }
  };

  // Request a signed download URL from the backend (recommended for GCS-hosted files),
  // fall back to the stored `fileUrl` if the server doesn't provide one.
  const handleDownload = async (doc: any) => {
    // Simplified download flow:
    // 1) Request signed URL from backend (if available).
    // 2) If signed URL exists, navigate current tab to it (no new tab/popup).
    // 3) Otherwise fetch the blob in-page and trigger an anchor download.
    let targetUrl = doc.fileUrl;
    try {
      if (doc?.id && orgId) {
        try {
          const resp = await axios.get(
            `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/documents/${doc.id}/download-url`,
            { params: { durationSeconds: 60 }, timeout: 10000, withCredentials: true }
          );
          const maybeUrl = typeof resp.data === 'string' ? resp.data : resp.data?.url || resp.data;
          if (maybeUrl) {
            console.group('Documents: signed URL fetched');
            console.log('rawSignedUrl:', maybeUrl);
            console.log('resp.data:', resp.data);
            console.groupEnd();
            const norm = normalizeSignedUrl(maybeUrl);
            targetUrl = norm || maybeUrl;
          }
        } catch (innerErr) {
          console.warn('Signed URL request failed, falling back to fileUrl', innerErr?.message || innerErr);
        }
      }

      if (!targetUrl) throw new Error('No download URL available');

      // Navigate current tab to the signed URL so browser handles Content-Disposition
      window.location.href = targetUrl;
      toast({ title: 'Download started', description: 'Opening the document...' });
      return;
    } catch (err: any) {
    console.error('Download failed, falling back to blob fetch', err);

    // Fallback: fetch the resource and trigger download via blob in-page
      try {
        const fallbackUrl = targetUrl || doc.fileUrl;
        if (!fallbackUrl) throw new Error('No URL available to fetch for fallback');
        const response = await fetch(fallbackUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${(doc?.documentType || 'document').replace(/\s+/g, '_')}_${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // revoke immediately for the in-page download link
        window.URL.revokeObjectURL(url);

        toast({ title: 'Success', description: 'Document downloaded successfully!' });
      } catch (finalErr: any) {
        console.error('Final download attempt failed', finalErr);
        toast({ title: 'Error', description: finalErr?.message || 'Failed to download document', variant: 'destructive' });
      }
    }
  };

  


  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: "No Expiry", color: "bg-muted text-muted-foreground" };
    const expiry = new Date(expiryDate), now = new Date();
    const diff = expiry.getTime() - now.getTime(), days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "Expired", color: "bg-destructive/10 text-destructive" };
    if (days <= 7) return { label: `${days} days left`, color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: `${days} days left`, color: "bg-warning/10 text-warning" };
    return { label: "Valid", color: "bg-success/10 text-success" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Debug panel removed */}
      {/* Header, Stats, Search, Document Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground">Manage organization documents and compliance</p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => { setOpen(true); setEditId(null); }} disabled={!orgId}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === "general" ? "default" : "outline"}
          onClick={() => setActiveTab("general")}
          className={activeTab === "general" ? "btn-gradient-primary" : ""}
        >
          <FileText className="mr-2 h-4 w-4" />
          General Documents
        </Button>
        <Button
          variant={activeTab === "gst" ? "default" : "outline"}
          onClick={() => setActiveTab("gst")}
          className={activeTab === "gst" ? "btn-gradient-primary" : ""}
        >
          <FileCheck className="mr-2 h-4 w-4" />
          GST Certificates
        </Button>
        <Button
          variant={activeTab === "fuel" ? "default" : "outline"}
          onClick={() => setActiveTab("fuel")}
          className={activeTab === "fuel" ? "btn-gradient-primary" : ""}
        >
          <File className="mr-2 h-4 w-4" />
          Fuel Purchase Invoices
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
                placeholder="Search documents by type, authority, or responsible party..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
        </CardContent>
      </Card>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-destructive">
          <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
          <p>{error}</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          {searchQuery ? (
            <>
              <Search className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Try adjusting your search</p>
            </>
          ) : (
            <>
              <FileText className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No documents yet</p>
              <p className="text-sm">Upload your first document to get started</p>
            </>
          )}
        </div>
      ) : (
        viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
            <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-xs">Document Type</TableHead>
                  <TableHead className="font-semibold text-xs">Issuing Authority</TableHead>
                  <TableHead className="font-semibold text-xs">Responsible Party</TableHead>
                  <TableHead className="font-semibold text-xs">Issued Date</TableHead>
                  <TableHead className="font-semibold text-xs">Expiry Date</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc: any) => {
                  const expiryStatus = getExpiryStatus(doc.expiryDate);
                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-medium">{doc.documentType}</TableCell>
                      <TableCell className="text-xs">{doc.issuingAuthority || '—'}</TableCell>
                      <TableCell className="text-xs">{doc.responsibleParty || '—'}</TableCell>
                      <TableCell className="text-xs">{doc.issuedDate ? new Date(doc.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                      <TableCell className="text-xs">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                      <TableCell><Badge className={`${expiryStatus.color} text-[10px] px-1.5 py-0`}>{expiryStatus.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-600" onClick={() => handleDownload(doc)}><Download className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-orange-50 hover:text-orange-600" onClick={() => handleEdit(doc)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600" onClick={() => confirmDelete(doc)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc: any) => {
            const expiryStatus = getExpiryStatus(doc.expiryDate);
            return (
              <Card key={doc.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 shrink-0">
                        <File className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg truncate">{doc.documentType}</h3>
                        <Badge className={`${expiryStatus.color} text-xs mt-1`}>
                          {expiryStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.issuingAuthority}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.responsibleParty}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs">Issued</p>
                          <p className="font-medium text-foreground truncate">
                            {doc.issuedDate
                              ? new Date(doc.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : "--"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs">Expires</p>
                          <p className="font-medium text-foreground truncate">
                            {doc.expiryDate
                              ? new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : "--"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-600"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 hover:bg-orange-50 hover:text-orange-600"
                      onClick={() => handleEdit(doc)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 hover:bg-red-50 hover:text-red-600"
                      onClick={() => confirmDelete(doc)}
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
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">{editId ? "Edit Document" : "Add New Document"}</h2>
                <p className="text-sm text-muted-foreground">Fill in the document details</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/*Add Edit  Modal content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="document-form" onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">Document Type *</Label>
                        <Input value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">Category</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={(form as any).category || "general"}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value } as any))}
                        >
                          <option value="general">General Document</option>
                          <option value="gst">GST Certificate</option>
                          <option value="fuel">Fuel Purchase Invoice</option>
                        </select>
                      </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Issuing Authority *</Label>
                      <Input value={form.issuingAuthority} onChange={e => setForm(f => ({ ...f, issuingAuthority: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Issued Date *</Label>
                      <Input
                        type="date"
                        value={form.issuedDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => setForm(f => ({
                          ...f,
                          issuedDate: e.target.value,
                          expiryDate: f.expiryDate && f.expiryDate < e.target.value ? "" : f.expiryDate
                        }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Expiry Date *</Label>
                      <Input
                        type="date"
                        value={form.expiryDate}
                        min={form.issuedDate || ""}
                        onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Renewal Period (Days)</Label>
                      <Input
                        value={calculatedRenewalDays}
                        readOnly
                        className="bg-yellow-50 border border-yellow-300 text-yellow-800 font-bold"
                        tabIndex={-1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Responsible Party *</Label>
                      <Input value={form.responsibleParty} onChange={e => setForm(f => ({ ...f, responsibleParty: e.target.value }))} required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase text-muted-foreground">Upload File (PDF/Image/Any) *</Label>
                      <input
                        ref={(el) => { fileInputRef.current = el; }}
                        type="file"
                        accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                        onChange={handleFileChange}
                        required={!editId}
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
                            <div className="font-medium">Click or drag a file to upload</div>
                            <div className="text-xs text-muted-foreground">PDF, image, doc, spreadsheet, or ZIP (max 10MB)</div>
                          </div>
                        </div>
                      </div>

                      {/* Show selected local file info or existing uploaded file with replace/remove actions */}
                      {form.file ? (
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <div className="min-w-0 break-words">
                            <div className="font-medium">{form.file.name}</div>
                            <div className="text-xs text-muted-foreground">{formatBytes(form.file.size)}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              type="button"
                              className="text-xs text-destructive underline"
                              onClick={() => {
                                // remove selected local file
                                if (localPreviewUrl) { try { URL.revokeObjectURL(localPreviewUrl); } catch (e) { /* ignore */ } }
                                setLocalPreviewUrl(null);
                                setForm(f => ({ ...f, file: null }));
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                            >Remove</button>
                          </div>
                        </div>
                      ) : form.fileUrl ? (
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <div className="min-w-0 break-words">
                            <div className="font-medium">{decodeURIComponent(String(form.fileUrl).split('/').pop() || '')}</div>
                            <div className="text-xs text-muted-foreground">Existing uploaded file</div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              type="button"
                              className="text-xs text-primary underline"
                              onClick={() => { try { fileInputRef.current?.click(); } catch (e) { /* ignore */ } }}
                            >Replace</button>
                          </div>
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

            {/* Stretched Footer (sticky, full width, no margin) */}
            <div className="sticky bottom-0 left-0 w-full px-6 py-4 border-t border-border bg-background flex justify-end gap-4 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                form="document-form"
                type="submit"
                className="btn-gradient-primary"
                disabled={submitting || uploading}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editId ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editId ? "Save Changes" : "Add Document"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (deleteDialogOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
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
              <h3 className="text-2xl font-bold">Delete Document</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.documentType}</span>?
              <br />
              <span className="text-sm">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete Document
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

