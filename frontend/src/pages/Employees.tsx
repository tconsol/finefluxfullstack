import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Plus, Search, Edit, Eye, EyeOff, Filter, Camera, Loader2, UserCheck, UserX, Briefcase, X,
  Mail, Phone, IdCard, LayoutGrid, LayoutList
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { API_CONFIG } from '@/lib/api-config';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const DEPARTMENTS = ["Management", "Sales", "Operations", "Accounts", "HR", "Support"];
const ROLES = ["Owner", "Manager", "Employee"];
const STATUSES = [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }];

type ShiftTiming = { start?: string; end?: string };
type Address = { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
type EmergencyContact = { name?: string; phone?: string; relationship?: string };
type Employee = {
  id: string;
  empId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  username: string;
  role: string;
  department: string;
  status: string;
  gender?: string;
  salary?: number;
  profileImageUrl?: string;
  shiftTiming?: ShiftTiming;
  address?: Address;
  emergencyContact?: EmergencyContact;
};

export default function Employees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') || '' : '';
  if (!orgId) {
    return <div className="p-6 text-center text-muted-foreground">Loading organization context…</div>;
  }

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: employeesRaw = [], isLoading } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees?page=0&size=200`);
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.content)) return res.data.content;
      return [];
    },
    enabled: !!orgId,
  });
  const employees: Employee[] = Array.isArray(employeesRaw) ? employeesRaw : [];

  // Auto-empId: FULL org letters + EMP + 000X
  const generateEmpId = useCallback(() => {
    const orgLetters = (orgId.match(/[A-Za-z]/g) || []).join('').toUpperCase();
    const prefix = `${orgLetters}EMP`;
    let maxNumber = 0;
    employees.forEach((e) => {
      const m = String(e.empId).match(/^([A-Z]+EMP)(\d+)$/);
      if (m && m[1] === prefix) {
        const n = parseInt(m[2], 10);
        if (!Number.isNaN(n)) maxNumber = Math.max(maxNumber, n);
      }
    });
    return `${prefix}${(maxNumber + 1).toString().padStart(4, '0')}`;
  }, [orgId, employees]);

  const [form, setForm] = useState<any>({
    empId: '',
    organizationId: orgId,
    firstName: '',
    lastName: '',
    emailId: '',
    phoneNumber: '',
    username: '',
    password: '',
    role: 'Employee',
    department: '',
    status: 'ACTIVE',
    gender: '',
    salary: undefined as number | undefined,
    profileImageUrl: '',
    shiftTiming: { start: '', end: '' } as ShiftTiming,
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' } as Address,
    emergencyContact: { name: '', phone: '', relationship: '' } as EmergencyContact,
  });

  // Lock scroll when any dialog open
  useEffect(() => {
    const anyOpen = viewOpen || editOpen || createOpen;
    if (anyOpen) {
      document.body.style.overflow = 'hidden';
      // @ts-ignore
      document.body.style.scrollbarGutter = 'stable both-edges';
      document.documentElement.style.margin = '0';
    } else {
      document.body.style.overflow = '';
      // @ts-ignore
      document.body.style.scrollbarGutter = '';
      document.documentElement.style.margin = '';
    }
    return () => {
      document.body.style.overflow = '';
      // @ts-ignore
      document.body.style.scrollbarGutter = '';
      document.documentElement.style.margin = '';
    };
  }, [viewOpen, editOpen, createOpen]);

  const resetFormBlank = useCallback(() => {
    setForm({
      empId: generateEmpId(),
      organizationId: orgId,
      firstName: '',
      lastName: '',
      emailId: '',
      phoneNumber: '',
      username: '',
      password: '',
      role: 'Employee',
      department: '',
      status: 'ACTIVE',
      gender: '',
      salary: undefined,
      profileImageUrl: '',
      shiftTiming: { start: '', end: '' },
      address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
      emergencyContact: { name: '', phone: '', relationship: '' },
    });
  }, [generateEmpId, orgId]);

  const getUserInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const getStatusBadge = (status: string) => {
    const lower = (status || '').toLowerCase();
    if (lower === 'active') return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    if (lower === 'inactive') return <Badge className="bg-red-100 text-red-700">Inactive</Badge>;
    return <Badge>{status}</Badge>;
  };

  const openView = (emp: Employee) => { setCurrentEmp(emp); setViewOpen(true); };

  const openEdit = (emp: Employee) => {
    setCurrentEmp(emp);
    setForm({
      empId: emp.empId,
      organizationId: emp.organizationId,
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      emailId: emp.emailId || '',
      phoneNumber: emp.phoneNumber || '',
      username: emp.username || '',
      password: '',
      role: emp.role || 'Employee',
      department: emp.department || '',
      status: emp.status || 'ACTIVE',
      gender: emp.gender || '',
      salary: emp.salary,
      profileImageUrl: emp.profileImageUrl || '',
      shiftTiming: emp.shiftTiming || { start: '', end: '' },
      address: {
        line1: emp.address?.line1 || '',
        line2: emp.address?.line2 || '',
        city: emp.address?.city || '',
        state: emp.address?.state || '',
        postalCode: emp.address?.postalCode || '',
        country: emp.address?.country || 'India'
      },
      emergencyContact: {
        name: emp.emergencyContact?.name || '',
        phone: emp.emergencyContact?.phone || '',
        relationship: emp.emergencyContact?.relationship || ''
      },
    });
    setEditOpen(true);
  };

  const openCreate = useCallback(() => {
    resetFormBlank(); // all empty except empId
    setCreateOpen(true);
  }, [resetFormBlank]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Must be less than 5MB.', variant: 'destructive' });
      return;
    }
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', API_CONFIG.CLOUDINARY.PRESET);
      data.append('folder', 'Profile_Photos');
      const res = await axios.post(API_CONFIG.CLOUDINARY.UPLOAD_URL, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((prev: any) => ({ ...prev, profileImageUrl: res.data.secure_url }));
      toast({ title: 'Uploaded!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.response?.data?.error?.message || String(err), variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        empId: form.empId?.trim() ? form.empId : generateEmpId(),
        organizationId: orgId
      };
      await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees`, payload);
      toast({ title: 'Employee created (ID reserved)' });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      setCreateOpen(false);
      resetFormBlank();
    } catch (err: any) {
      toast({ title: "Failed to create employee", description: err?.response?.data?.message || 'Error', variant: "destructive" });
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmp) return;
    try {
      const payload: any = { ...form };
      if (!form.password || form.password.trim() === '') {
        delete payload.password;
      } else {
        payload.newPassword = form.password;
        delete payload.password;
      }
      await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees/${currentEmp.id}`, payload);
      toast({ title: 'Employee updated' });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to update employee", description: err?.response?.data?.message || 'Error', variant: "destructive" });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const fullName = `${e.firstName} ${e.lastName}`.trim();
      return [fullName, e.empId, e.emailId, e.phoneNumber, e.role, e.department, e.status]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [employees, search]);

  const stats = useMemo(() => ([
    { title: 'Total Employees', value: employees.length.toString(), change: 'All team members', icon: Users, color: 'text-primary', bgColor: 'bg-primary-soft' },
    { title: 'Active', value: employees.filter(e => (e.status || '').toLowerCase() === 'active').length.toString(), change: 'Currently working', icon: UserCheck, color: 'text-success', bgColor: 'bg-success-soft' },
    { title: 'Inactive', value: employees.filter(e => (e.status || '').toLowerCase() === 'inactive').length.toString(), change: 'Not currently working', icon: UserX, color: 'text-warning', bgColor: 'bg-warning-soft' },
    { title: 'Departments', value: new Set(employees.map(e => e.department)).size.toString(), change: 'Active departments', icon: Briefcase, color: 'text-accent', bgColor: 'bg-accent-soft' },
  ]), [employees]);

  return (
    <div className="space-y-6 animate-fade-in -mt-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        disabled={uploadingImage}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">Manage your organization's workforce</p>
        </div>
        <Button className="btn-gradient-primary" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon as any;
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
                  <div className={`${stat.bgColor} p-2 rounded-lg shrink-0`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-muted-foreground">Loading employees…</div>}
          {!isLoading && (
            viewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Employee</TableHead>
                      <TableHead className="font-semibold text-xs">ID</TableHead>
                      <TableHead className="font-semibold text-xs">Role</TableHead>
                      <TableHead className="font-semibold text-xs">Department</TableHead>
                      <TableHead className="font-semibold text-xs">Contact</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp) => {
                      const fullName = `${emp.firstName} ${emp.lastName}`;
                      return (
                        <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 shrink-0">
                                {emp.profileImageUrl ? (
                                  <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                                ) : (
                                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                                    {getUserInitials(emp.firstName, emp.lastName)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="font-medium">{fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{emp.empId}</TableCell>
                          <TableCell><Badge className="text-[10px] px-1.5 py-0">{emp.role}</Badge></TableCell>
                          <TableCell className="text-xs">{emp.department || '—'}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span>{emp.emailId || '—'}</span>
                              <span className="text-muted-foreground">{emp.phoneNumber || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(emp.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openView(emp)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(emp)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filtered.length === 0 && <div className="text-sm text-muted-foreground p-4">No employees found.</div>}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((emp) => {
                  const fullName = `${emp.firstName} ${emp.lastName}`;
                  return (
                    <div
                      key={emp.id}
                      className="grid gap-3 sm:grid-cols-[1fr_auto] items-start sm:items-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar className="h-12 w-12 shrink-0">
                          {emp.profileImageUrl ? (
                            <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {getUserInitials(emp.firstName, emp.lastName)}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                            <Badge>{emp.role}</Badge>
                            {getStatusBadge(emp.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <IdCard className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
                              <span className="font-mono text-xs">{emp.empId}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Mail className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
                              <span className="truncate">{emp.emailId || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Phone className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
                              <span className="truncate">{emp.phoneNumber || '—'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openView(emp)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(emp)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground">No employees found.</div>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG — all fields present; only empId prefilled/read-only */}
      {createOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (createOpen ? "opacity-100" : "opacity-0 pointer-events-none")
          }
          style={{ margin: 0, padding: "1rem", minHeight: "100vh", minWidth: "100vw" }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Create New Employee</h2>
                <p className="text-sm text-muted-foreground">Employee ID is auto-generated; fill other details as needed</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form with Scrollable Content and Fixed Footer */}
            <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24 border-4 border-border">
                    {form.profileImageUrl ? (
                      <AvatarImage src={form.profileImageUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getUserInitials(form.firstName, form.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF • Max 5MB</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Information with icons */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Emp ID (icon) */}
                    <div className="space-y-2">
                      <Label>Employee ID <span className="text-red-600">*</span></Label>
                      <div className="relative">
                        <IdCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.empId} readOnly disabled className="pl-9 bg-muted/50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Username <span className="text-red-600">*</span></Label>
                      <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name <span className="text-red-600">*</span></Label>
                      <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name <span className="text-red-600">*</span></Label>
                      <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                    {/* Email (icon) */}
                    <div className="space-y-2">
                      <Label>Email <span className="text-red-600">*</span></Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" value={form.emailId} onChange={(e) => setForm({ ...form, emailId: e.target.value })} className="pl-9" />
                      </div>
                    </div>
                    {/* Phone (icon) */}
                    <div className="space-y-2">
                      <Label>Phone <span className="text-red-600">*</span></Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Password <span className="text-red-600">*</span></Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role <span className="text-red-600">*</span></Label>
                      <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department <span className="text-red-600">*</span></Label>
                      <Select value={form.department} onValueChange={(value) => setForm({ ...form, department: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status <span className="text-red-600">*</span></Label>
                      <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Salary</Label>
                      <Input
                        type="number"
                        value={form.salary || ''}
                        onChange={(e) => setForm({ ...form, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter salary amount"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Shift Timing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Shift Start</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.start}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, start: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shift End</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.end}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, end: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 1</Label>
                      <Input
                        value={form.address.line1}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={form.address.line2}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })}
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.address.city}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select
                        value={form.address.state || ''}
                        onValueChange={(value) => setForm({ ...form, address: { ...form.address, state: value } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] max-h-80">
                          {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={form.address.postalCode}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={form.address.country}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={form.emergencyContact.name}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input
                        value={form.emergencyContact.phone}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={form.emergencyContact.relationship}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary">
                  Create Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (editOpen ? "opacity-100" : "opacity-0 pointer-events-none")
          }
          style={{ margin: 0, padding: "1rem", minHeight: "100vh", minWidth: "100vw" }}
          onClick={() => setEditOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Edit Employee</h2>
                <p className="text-sm text-muted-foreground">Update employee information</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form with Scrollable Content and Fixed Footer */}
            <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24 border-4 border-border">
                    {form.profileImageUrl ? (
                      <AvatarImage src={form.profileImageUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getUserInitials(form.firstName, form.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Change Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF • Max 5MB</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Emp ID (icon) */}
                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <div className="relative">
                        <IdCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input disabled value={form.empId} className="pl-9 bg-muted/50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input disabled value={form.username} className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                    {/* Email (icon) */}
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" value={form.emailId} onChange={(e) => setForm({ ...form, emailId: e.target.value })} className="pl-9" />
                      </div>
                    </div>
                    {/* Phone (icon) */}
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>New Password (optional)</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role <span className="text-red-600">*</span></Label>
                      <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department <span className="text-red-600">*</span></Label>
                      <Select value={form.department} onValueChange={(value) => setForm({ ...form, department: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status <span className="text-red-600">*</span></Label>
                      <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Salary</Label>
                      <Input
                        type="number"
                        value={form.salary || ''}
                        onChange={(e) => setForm({ ...form, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter salary amount"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Shift Timing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Shift Start</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.start}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, start: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shift End</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.end}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, end: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 1</Label>
                      <Input
                        value={form.address.line1}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={form.address.line2}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })}
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.address.city}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select
                        value={form.address.state || ''}
                        onValueChange={(value) => setForm({ ...form, address: { ...form.address, state: value } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] max-h-80">
                          {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={form.address.postalCode}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={form.address.country}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={form.emergencyContact.name}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input
                        value={form.emergencyContact.phone}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={form.emergencyContact.relationship}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary">
                  Update Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* VIEW DIALOG (unchanged layout) */}
      {viewOpen && currentEmp && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (viewOpen ? "opacity-100" : "opacity-0 pointer-events-none")
          }
          style={{ margin: 0, padding: "1rem", minHeight: "100vh", minWidth: "100vw" }}
          onClick={() => setViewOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Employee Details</h2>
                <p className="text-sm text-muted-foreground">Profile and employment information</p>
              </div>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2">
                  {currentEmp.profileImageUrl ? (
                    <AvatarImage src={currentEmp.profileImageUrl} alt="Profile" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getUserInitials(currentEmp.firstName, currentEmp.lastName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{currentEmp.firstName} {currentEmp.lastName}</h3>
                  <div className="flex items-center gap-2">
                    <Badge>{currentEmp.role}</Badge>
                    {getStatusBadge(currentEmp.status)}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">{currentEmp.empId}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <div>{currentEmp.emailId || '—'}</div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <div>{currentEmp.phoneNumber || '—'}</div>
                </div>
                <div>
                  <Label>Username</Label>
                  <div>{currentEmp.username || '—'}</div>
                </div>
                <div>
                  <Label>Gender</Label>
                  <div>{currentEmp.gender || '—'}</div>
                </div>
                <div>
                  <Label>Department</Label>
                  <div>{currentEmp.department || '—'}</div>
                </div>
                <div>
                  <Label>Salary</Label>
                  <div>{currentEmp.salary ? `₹${currentEmp.salary}` : '—'}</div>
                </div>
                <div>
                  <Label>Shift Start</Label>
                  <div>{currentEmp.shiftTiming?.start || '—'}</div>
                </div>
                <div>
                  <Label>Shift End</Label>
                  <div>{currentEmp.shiftTiming?.end || '—'}</div>
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <div>
                    {[
                      currentEmp.address?.line1,
                      currentEmp.address?.line2,
                      currentEmp.address?.city,
                      currentEmp.address?.state,
                      currentEmp.address?.postalCode,
                      currentEmp.address?.country,
                    ].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Emergency Contact</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{currentEmp.emergencyContact?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{currentEmp.emergencyContact?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Relationship</p>
                      <p className="font-medium">{currentEmp.emergencyContact?.relationship || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
              <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
