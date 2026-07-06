// src/pages/OnboardOrganization.tsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Users, UserPlus, Edit, Search, Loader2, 
  CheckCircle2, ArrowRight, MapPin, Phone, 
  Mail, Shield, Clock, Home, AlertCircle, 
  FileText, Crown, ArrowLeft, Sparkles, Briefcase
} from 'lucide-react';
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG

type OrganizationCreateRequest = {
  organizationId: string;
  organizationName: string;
  gstNumber?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName: string;
  ownerLastName: string;
};

type OrganizationResponse = {
  id: string;
  organizationId: string;
  organizationName: string;
  gstNumber?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName: string;
  ownerLastName: string;
};

type OrganizationUpdateRequest = {
  organizationName?: string;
  gstNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
};

type EmployeeCreateRequest = {
  empId: string;
  organizationId: string;
  status?: string;
  role: string;
  department: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId: string;
  username: string;
  password: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
};

type EmployeeUpdateRequest = {
  empId?: string;
  organizationId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  role?: string;
  department?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailId?: string;
  username?: string;
  newPassword?: string;
  shiftTiming?: { start?: string; end?: string };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
};

type EmployeeResponse = {
  id: string;
  empId: string;
  organizationId: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  role: string;
  department: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId: string;
  username: string;
  shiftTiming?: { start?: string; end?: string };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
};

type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

const IN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

const ROLES = [
  'Owner',
  'Manager',
  'Employee',
  'Supervisor',
  'Cashier',
  'Attendant',
  'Accountant',
  'Security',
  'Maintenance',
  'Other'
];

const DEPARTMENTS = [
  'Management',
  'Operations',
  'Sales',
  'Finance',
  'Administration',
  'Maintenance',
  'Security',
  'Other'
];

const makeOrgId = (name: string) => {
  const initials = (name || '').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase();
  const rand = Math.floor(Math.random() * 10000);
  return `${initials}-${String(rand).padStart(4, '0')}`;
};

const orgLetters = (orgId: string) => (orgId.match(/[A-Za-z]+/g)?.join('') || '').toUpperCase();

type View = 'menu' | 'createOrg' | 'updateOrg' | 'createOwner' | 'updateOwner';

export default function OnboardOrganization() {
  const { toast } = useToast();
  const [view, setView] = useState<View>('menu');

  // Organization list state
  const [orgs, setOrgs] = useState<OrganizationResponse[]>([]);
  const [orgPage, setOrgPage] = useState(0);
  const [orgHasMore, setOrgHasMore] = useState(true);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgQuery, setOrgQuery] = useState('');

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(o =>
      (o.organizationName || '').toLowerCase().includes(q) ||
      (o.organizationId || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q) ||
      (o.state || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q)
    );
  }, [orgs, orgQuery]);

  const resetOrgList = () => {
    setOrgs([]);
    setOrgPage(0);
    setOrgHasMore(true);
  };

  const loadMoreOrgs = async () => {
    if (orgLoading || !orgHasMore) return;
    try {
      setOrgLoading(true);
      const res = await axios.get<Page<OrganizationResponse>>(`${API_CONFIG.BASE_URL}/api/organizations`, {
        params: { page: orgPage, size: 20 },
        timeout: 15000,
      });
      const page = res.data;
      setOrgs(prev => [...prev, ...page.content]);
      setOrgPage(page.number + 1);
      setOrgHasMore(!page.last);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Unable to load organizations.',
        variant: 'destructive',
      });
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'updateOrg' || view === 'createOwner' || view === 'updateOwner') {
      resetOrgList();
      loadMoreOrgs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Create Organization State
  const [orgForm, setOrgForm] = useState<OrganizationCreateRequest>({
    organizationId: '',
    organizationName: '',
    gstNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    ownerFirstName: '',
    ownerLastName: '',
  });

  const derivedOrgId = useMemo(() => {
    if (!orgForm.organizationName.trim()) return '';
    return makeOrgId(orgForm.organizationName);
  }, [orgForm.organizationName]);

  const updateOrgCreate = <K extends keyof OrganizationCreateRequest>(k: K) => (v: OrganizationCreateRequest[K]) =>
    setOrgForm(p => ({ ...p, [k]: v }));

  const createOrgRequiredOk = useMemo(() => {
    const required: Array<string> = [
      derivedOrgId || orgForm.organizationId,
      orgForm.organizationName,
      orgForm.address1,
      orgForm.city,
      orgForm.state,
      orgForm.country,
      orgForm.postalCode,
      orgForm.ownerFirstName,
      orgForm.ownerLastName,
    ];
    return required.every(v => String(v || '').trim().length > 0);
  }, [derivedOrgId, orgForm]);

  const [submittingOrg, setSubmittingOrg] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null);

  const submitCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrgRequiredOk) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOrg(true);
      const payload: OrganizationCreateRequest = {
        ...orgForm,
        organizationId: derivedOrgId || orgForm.organizationId,
      };
      const res = await axios.post<OrganizationResponse>(`${API_CONFIG.BASE_URL}/api/organizations`, payload, { timeout: 15000 });
      toast({ title: '✅ Success!', description: 'Organization created successfully.', variant: 'default' });
      setSelectedOrg(res.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to create organization.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOrg(false);
    }
  };

  // Update Organization State
  const [orgUpdateForm, setOrgUpdateForm] = useState<OrganizationUpdateRequest>({});

  useEffect(() => {
    if (selectedOrg && (view === 'updateOrg' || view === 'createOwner')) {
      setOrgUpdateForm({
        organizationName: selectedOrg.organizationName || '',
        gstNumber: selectedOrg.gstNumber || '',
        address1: selectedOrg.address1 || '',
        address2: selectedOrg.address2 || '',
        city: selectedOrg.city || '',
        state: selectedOrg.state || '',
        country: selectedOrg.country || 'India',
        postalCode: selectedOrg.postalCode || '',
        phoneNumber: selectedOrg.phoneNumber || '',
        email: selectedOrg.email || '',
        licenseNumber: selectedOrg.licenseNumber || '',
        ownerFirstName: selectedOrg.ownerFirstName || '',
        ownerLastName: selectedOrg.ownerLastName || '',
      });
    }
  }, [selectedOrg, view]);

  const updateOrgUpdate = <K extends keyof OrganizationUpdateRequest>(k: K) => (v: OrganizationUpdateRequest[K]) =>
    setOrgUpdateForm(p => ({ ...p, [k]: v }));

  const updateOrgRequiredOk = useMemo(() => {
    if (!selectedOrg) return false;
    const r = orgUpdateForm;
    const required = [r.organizationName, r.address1, r.city, r.state, r.country, r.postalCode, r.ownerFirstName, r.ownerLastName];
    return required.every(v => String(v || '').trim().length > 0);
  }, [selectedOrg, orgUpdateForm]);

  const [submittingOrgUpdate, setSubmittingOrgUpdate] = useState(false);

  const submitUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (!updateOrgRequiredOk) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOrgUpdate(true);
      await axios.put<OrganizationResponse>(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(selectedOrg.id)}`,
        orgUpdateForm,
        { timeout: 15000 }
      );
      toast({ title: '✅ Updated!', description: `${selectedOrg.organizationName} updated successfully.`, variant: 'default' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to update organization.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOrgUpdate(false);
    }
  };

  // Create Owner State
  const [ownerCreateForm, setOwnerCreateForm] = useState<EmployeeCreateRequest>({
    empId: '',
    organizationId: '',
    status: 'ACTIVE',
    role: 'Owner',
    department: 'Management',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    emailId: '',
    username: '',
    password: '',
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  const computedCreateOwnerEmpId = useMemo(() => {
    const org = selectedOrg?.organizationId;
    return org ? `${orgLetters(org)}EMP0001` : '';
  }, [selectedOrg]);

  useEffect(() => {
    if (view === 'createOwner') {
      setOwnerCreateForm(p => ({
        ...p,
        organizationId: selectedOrg?.organizationId || '',
        empId: selectedOrg ? computedCreateOwnerEmpId : '',
        status: (p.status || 'ACTIVE').toUpperCase(),
        role: p.role || 'Owner',
        department: p.department || 'Management',
        address: { ...(p.address || {}), country: p.address?.country || 'India' },
      }));
    }
  }, [view, selectedOrg, computedCreateOwnerEmpId]);

  const updateOwnerCreate = <K extends keyof EmployeeCreateRequest>(k: K) => (v: EmployeeCreateRequest[K]) =>
    setOwnerCreateForm(p => ({ ...p, [k]: v }));
  const updateOwnerCreateAddress = (k: keyof NonNullable<EmployeeCreateRequest['address']>, v: string) =>
    setOwnerCreateForm(p => ({ ...p, address: { ...(p.address || {}), [k]: v } }));
  const updateOwnerCreateEmergency = (k: keyof NonNullable<EmployeeCreateRequest['emergencyContact']>, v: string) =>
    setOwnerCreateForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), [k]: v } }));

  const createOwnerRequiredOk = useMemo(() => {
    if (!selectedOrg) return false;
    const p = ownerCreateForm;
    const required: Array<string> = [
      selectedOrg.organizationId,
      computedCreateOwnerEmpId || p.empId,
      p.role,
      p.department,
      p.firstName,
      p.lastName,
      p.emailId,
      p.username,
      p.password,
    ];
    return required.every(v => String(v || '').trim().length > 0);
  }, [selectedOrg, ownerCreateForm, computedCreateOwnerEmpId]);

  const [submittingOwnerCreate, setSubmittingOwnerCreate] = useState(false);

  const submitCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (!createOwnerRequiredOk) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOwnerCreate(true);
      const payload: EmployeeCreateRequest = {
        ...ownerCreateForm,
        organizationId: selectedOrg.organizationId,
        empId: computedCreateOwnerEmpId || ownerCreateForm.empId,
        status: (ownerCreateForm.status || 'ACTIVE').toUpperCase(),
        address: { ...(ownerCreateForm.address || {}), country: ownerCreateForm.address?.country || 'India' },
      };
      await axios.post(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(payload.organizationId)}/employees`,
        payload,
        { timeout: 15000 }
      );
      toast({ title: '🎉 Success!', description: `Owner ${payload.firstName} ${payload.lastName} onboarded successfully.`, variant: 'default' });
      setOwnerCreateForm(p => ({
        ...p,
        firstName: '',
        lastName: '',
        phoneNumber: '',
        emailId: '',
        username: '',
        password: '',
      }));
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to create owner.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOwnerCreate(false);
    }
  };

  // Update Owner State - FILTER ONLY OWNERS
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [empPage, setEmpPage] = useState(0);
  const [empHasMore, setEmpHasMore] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);
  const [empQuery, setEmpQuery] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<EmployeeResponse | null>(null);

  const filteredEmps = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    const ownersOnly = employees.filter(e => e.role?.toLowerCase() === 'owner');
    
    if (!q) {
      return ownersOnly;
    }
    return ownersOnly.filter(e =>
      (e.firstName || '').toLowerCase().includes(q) ||
      (e.lastName || '').toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q) ||
      (e.emailId || '').toLowerCase().includes(q) ||
      (e.empId || '').toLowerCase().includes(q)
    );
  }, [employees, empQuery]);

  const resetEmpList = () => {
    setEmployees([]);
    setEmpPage(0);
    setEmpHasMore(true);
  };

  const loadMoreEmployees = async () => {
    if (!selectedOrg || empLoading || !empHasMore) return;
    try {
      setEmpLoading(true);
      const res = await axios.get<Page<EmployeeResponse>>(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(selectedOrg.organizationId)}/employees`,
        { params: { page: empPage, size: 20 }, timeout: 15000 }
      );
      const page = res.data;
      setEmployees(prev => [...prev, ...page.content]);
      setEmpPage(page.number + 1);
      setEmpHasMore(!page.last);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Unable to load employees.',
        variant: 'destructive',
      });
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'updateOwner' && selectedOrg) {
      resetEmpList();
      loadMoreEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedOrg?.organizationId]);

  const [ownerUpdateForm, setOwnerUpdateForm] = useState<EmployeeUpdateRequest>({});

  useEffect(() => {
    if (selectedEmp && view === 'updateOwner') {
      setOwnerUpdateForm({
        status: (selectedEmp.status as any) || 'ACTIVE',
        role: selectedEmp.role || 'Owner',
        department: selectedEmp.department || 'Management',
        firstName: selectedEmp.firstName || '',
        lastName: selectedEmp.lastName || '',
        phoneNumber: selectedEmp.phoneNumber || '',
        emailId: selectedEmp.emailId || '',
        username: selectedEmp.username || '',
        newPassword: '',
        shiftTiming: { start: selectedEmp.shiftTiming?.start || '', end: selectedEmp.shiftTiming?.end || '' },
        address: {
          line1: selectedEmp.address?.line1 || '',
          line2: selectedEmp.address?.line2 || '',
          city: selectedEmp.address?.city || '',
          state: selectedEmp.address?.state || '',
          postalCode: selectedEmp.address?.postalCode || '',
          country: selectedEmp.address?.country || 'India',
        },
        emergencyContact: {
          name: selectedEmp.emergencyContact?.name || '',
          phone: selectedEmp.emergencyContact?.phone || '',
          relationship: selectedEmp.emergencyContact?.relationship || '',
        },
      });
    }
  }, [selectedEmp, view]);

  const updateOwnerUpdate = <K extends keyof EmployeeUpdateRequest>(k: K) => (v: EmployeeUpdateRequest[K]) =>
    setOwnerUpdateForm(p => ({ ...p, [k]: v }));
  const updateOwnerUpdateAddress = (k: keyof NonNullable<EmployeeUpdateRequest['address']>, v: string) =>
    setOwnerUpdateForm(p => ({ ...p, address: { ...(p.address || {}), [k]: v } }));
  const updateOwnerUpdateShift = (k: keyof NonNullable<EmployeeUpdateRequest['shiftTiming']>, v: string) =>
    setOwnerUpdateForm(p => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), [k]: v } }));
  const updateOwnerUpdateEmergency = (k: keyof NonNullable<EmployeeUpdateRequest['emergencyContact']>, v: string) =>
    setOwnerUpdateForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), [k]: v } }));

  const updateOwnerRequiredOk = useMemo(() => {
    if (!selectedOrg || !selectedEmp) return false;
    const p = ownerUpdateForm;
    const required = [p.role, p.department, p.firstName, p.lastName, p.emailId, p.username];
    return required.every(v => String(v || '').trim().length > 0);
  }, [selectedOrg, selectedEmp, ownerUpdateForm]);

  const [submittingOwnerUpdate, setSubmittingOwnerUpdate] = useState(false);

  const submitUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !selectedEmp) return;
    if (!updateOwnerRequiredOk) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOwnerUpdate(true);
      await axios.put(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(selectedOrg.organizationId)}/employees/${encodeURIComponent(selectedEmp.id)}`,
        ownerUpdateForm,
        { timeout: 15000 }
      );
      toast({ title: '✅ Updated!', description: `${selectedEmp.firstName} ${selectedEmp.lastName} updated successfully.`, variant: 'default' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to update owner.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOwnerUpdate(false);
    }
  };

  const resetAll = () => {
    setView('menu');
    setSelectedOrg(null);
    setSelectedEmp(null);
    resetOrgList();
    resetEmpList();
    setOrgQuery('');
    setEmpQuery('');
  };

  // Modern Organization Picker
  const renderOrgPicker = () => (
    <div className="max-w-5xl mx-auto">
      <Card className="border-2 shadow-xl">
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Select Organization</h2>
                <p className="text-muted-foreground">Choose an organization to continue</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetAll} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
        
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={orgQuery}
              onChange={(e) => setOrgQuery(e.target.value)}
              className="pl-12 h-12 text-lg border-2 focus:border-primary"
            />
          </div>

          <div className="grid gap-4 max-h-[600px] overflow-auto">
            {filteredOrgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                {orgLoading ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground text-lg">Loading organizations...</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">No organizations found</p>
                  </>
                )}
              </div>
            ) : (
              filteredOrgs.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrg(o)}
                  className="group p-5 rounded-xl border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-background to-muted/20"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-bold">{o.organizationName}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pl-11">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4" /> {o.organizationId}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" /> {o.city}, {o.state}
                        </span>
                        {o.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4" /> {o.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button className="gap-2">
                      Select <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2">
            <span className="text-muted-foreground">
              Showing <strong>{filteredOrgs.length}</strong> of <strong>{orgs.length}</strong> organizations
            </span>
            <Button
              onClick={loadMoreOrgs}
              disabled={!orgHasMore || orgLoading}
              variant="outline"
            >
              {orgLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading</> : orgHasMore ? 'Load More' : 'No More'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Modern Owner Picker (ONLY OWNERS)
  const renderOwnerPicker = () => (
    <div className="max-w-5xl mx-auto">
      <Card className="border-2 shadow-xl">
        <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 p-6 border-b-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Select Owner</h2>
                <p className="text-muted-foreground">Choose an owner to update</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>
                Change Org
              </Button>
              <Button variant="outline" size="sm" onClick={resetAll} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search owners..."
              value={empQuery}
              onChange={(e) => setEmpQuery(e.target.value)}
              className="pl-12 h-12 text-lg border-2 focus:border-primary"
            />
          </div>

          <div className="grid gap-4 max-h-[600px] overflow-auto">
            {filteredEmps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                {empLoading ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground text-lg">Loading owners...</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">No owners found</p>
                  </>
                )}
              </div>
            ) : (
              filteredEmps.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className="group p-5 rounded-xl border-2 hover:border-yellow-500 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-background to-yellow-500/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                          <Crown className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">{emp.firstName} {emp.lastName}</h3>
                          <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full border border-yellow-300">
                            OWNER
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pl-11">
                        <span className="flex items-center gap-1.5">
                          <Shield className="h-4 w-4" /> {emp.empId}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" /> {emp.emailId}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4" /> {emp.department}
                        </span>
                      </div>
                    </div>
                    <Button className="gap-2">
                      Select <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2">
            <span className="text-muted-foreground">
              Showing <strong>{filteredEmps.length}</strong> owners
            </span>
            <Button
              onClick={loadMoreEmployees}
              disabled={!empHasMore || empLoading}
              variant="outline"
            >
              {empLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading</> : empHasMore ? 'Load More' : 'No More'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Main Menu */}
        {view === 'menu' && (
          <div className="space-y-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-primary/20 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Organization Management System</span>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                Manage your organizations and owners efficiently with our powerful platform
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { view: 'createOrg', icon: Building2, title: 'Create Organization', desc: 'Onboard new organization', gradient: 'from-blue-500 to-cyan-500' },
                { view: 'updateOrg', icon: Edit, title: 'Update Organization', desc: 'Modify organization details', gradient: 'from-purple-500 to-pink-500' },
                { view: 'createOwner', icon: UserPlus, title: 'Onboard Owner', desc: 'Add owner to organization', gradient: 'from-green-500 to-emerald-500' },
                { view: 'updateOwner', icon: Crown, title: 'Update Owner', desc: 'Modify owner information', gradient: 'from-yellow-500 to-orange-500' },
              ].map((item) => (
                <div
                  key={item.view}
                  onClick={() => setView(item.view as View)}
                  className="group relative cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl blur-sm group-hover:blur-md transition-all" />
                  <Card className="relative border-2 hover:border-primary hover:shadow-2xl transition-all duration-300 h-full">
                    <CardContent className="p-8 text-center space-y-6">
                      <div className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                        <item.icon className="h-10 w-10 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-primary group-hover:gap-3 transition-all">
                        <span className="text-sm font-semibold">Get Started</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Organization */}
        {view === 'createOrg' && (
          <Card className="max-w-6xl mx-auto border-2 shadow-xl">
            <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-6 border-b-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Create New Organization</h2>
                    <p className="text-muted-foreground">Fill in the organization details below</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resetAll} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
            <CardContent className="p-8">
              <form onSubmit={submitCreateOrganization} className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">Organization Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-sm font-semibold">
                        Organization Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={orgForm.organizationName}
                        onChange={(e) => updateOrgCreate('organizationName')(e.target.value)}
                        placeholder="Enter organization name"
                        required
                        className="h-11 border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Organization ID <span className="text-red-500">*</span>
                      </Label>
                      <Input value={derivedOrgId || ''} readOnly disabled placeholder="Auto-generated" className="h-11" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">GST Number</Label>
                      <Input placeholder="GST Number" value={orgForm.gstNumber || ''} onChange={(e) => updateOrgCreate('gstNumber')(e.target.value)} className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">License Number</Label>
                      <Input placeholder="License Number" value={orgForm.licenseNumber || ''} onChange={(e) => updateOrgCreate('licenseNumber')(e.target.value)} className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Email</Label>
                      <Input type="email" placeholder="Email" value={orgForm.email || ''} onChange={(e) => updateOrgCreate('email')(e.target.value)} className="h-11 border-2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">Address Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Address Line 1 <span className="text-red-500">*</span></Label>
                      <Input placeholder="Address Line 1" value={orgForm.address1} onChange={(e) => updateOrgCreate('address1')(e.target.value)} required className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Address Line 2</Label>
                      <Input placeholder="Address Line 2" value={orgForm.address2 || ''} onChange={(e) => updateOrgCreate('address2')(e.target.value)} className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">City <span className="text-red-500">*</span></Label>
                      <Input placeholder="City" value={orgForm.city} onChange={(e) => updateOrgCreate('city')(e.target.value)} required className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">State <span className="text-red-500">*</span></Label>
                      <Select value={orgForm.state} onValueChange={(value) => updateOrgCreate('state')(value)} required>
                        <SelectTrigger className="h-11 border-2">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {IN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Postal Code <span className="text-red-500">*</span></Label>
                      <Input placeholder="Postal Code" value={orgForm.postalCode} onChange={(e) => updateOrgCreate('postalCode')(e.target.value)} required className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Country <span className="text-red-500">*</span></Label>
                      <Input placeholder="Country" value={orgForm.country} onChange={(e) => updateOrgCreate('country')(e.target.value)} required className="h-11 border-2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">Owner & Contact</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Phone Number</Label>
                      <Input type="tel" placeholder="Phone Number" value={orgForm.phoneNumber || ''} onChange={(e) => updateOrgCreate('phoneNumber')(e.target.value)} className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Owner First Name <span className="text-red-500">*</span></Label>
                      <Input placeholder="Owner First Name" value={orgForm.ownerFirstName} onChange={(e) => updateOrgCreate('ownerFirstName')(e.target.value)} required className="h-11 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Owner Last Name <span className="text-red-500">*</span></Label>
                      <Input placeholder="Owner Last Name" value={orgForm.ownerLastName} onChange={(e) => updateOrgCreate('ownerLastName')(e.target.value)} required className="h-11 border-2" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-6 border-t-2">
                  <Button type="button" variant="outline" onClick={resetAll} size="lg">Cancel</Button>
                  <Button type="submit" disabled={submittingOrg || !createOrgRequiredOk} size="lg" className="gap-2">
                    {submittingOrg ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><CheckCircle2 className="h-4 w-4" />Create Organization</>}
                  </Button>
                </div>
              </form>

              {selectedOrg && (
                <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-green-900 dark:text-green-100">Organization Created Successfully!</p>
                        <p className="text-sm text-green-700 dark:text-green-300">ID: {selectedOrg.organizationId}</p>
                      </div>
                    </div>
                    <Button onClick={() => setView('createOwner')} size="lg" className="gap-2">
                      Onboard Owner <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Update Organization */}
        {view === 'updateOrg' && (
          <>
            {!selectedOrg ? renderOrgPicker() : (
              <Card className="max-w-6xl mx-auto border-2 shadow-xl">
                <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 p-6 border-b-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                        <Edit className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Update Organization</h2>
                        <p className="text-muted-foreground">{selectedOrg.organizationName} • {selectedOrg.organizationId}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>Change</Button>
                      <Button variant="outline" size="sm" onClick={resetAll} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-8">
                  <form onSubmit={submitUpdateOrganization} className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Organization Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Organization Name <span className="text-red-500">*</span></Label>
                          <Input value={orgUpdateForm.organizationName || ''} onChange={(e) => updateOrgUpdate('organizationName')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Organization ID</Label>
                          <Input value={selectedOrg.organizationId} readOnly disabled className="h-11" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">GST Number</Label>
                          <Input placeholder="GST Number" value={orgUpdateForm.gstNumber || ''} onChange={(e) => updateOrgUpdate('gstNumber')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">License Number</Label>
                          <Input placeholder="License Number" value={orgUpdateForm.licenseNumber || ''} onChange={(e) => updateOrgUpdate('licenseNumber')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Email</Label>
                          <Input type="email" placeholder="Email" value={orgUpdateForm.email || ''} onChange={(e) => updateOrgUpdate('email')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Address Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Address Line 1 <span className="text-red-500">*</span></Label>
                          <Input placeholder="Address Line 1" value={orgUpdateForm.address1 || ''} onChange={(e) => updateOrgUpdate('address1')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Address Line 2</Label>
                          <Input placeholder="Address Line 2" value={orgUpdateForm.address2 || ''} onChange={(e) => updateOrgUpdate('address2')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">City <span className="text-red-500">*</span></Label>
                          <Input placeholder="City" value={orgUpdateForm.city || ''} onChange={(e) => updateOrgUpdate('city')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">State <span className="text-red-500">*</span></Label>
                          <Select value={orgUpdateForm.state || ''} onValueChange={(value) => updateOrgUpdate('state')(value)}>
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {IN_STATES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Postal Code <span className="text-red-500">*</span></Label>
                          <Input placeholder="Postal Code" value={orgUpdateForm.postalCode || ''} onChange={(e) => updateOrgUpdate('postalCode')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Country <span className="text-red-500">*</span></Label>
                          <Input placeholder="Country" value={orgUpdateForm.country || 'India'} onChange={(e) => updateOrgUpdate('country')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Crown className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Owner & Contact</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Phone Number</Label>
                          <Input type="tel" placeholder="Phone" value={orgUpdateForm.phoneNumber || ''} onChange={(e) => updateOrgUpdate('phoneNumber')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Owner First Name <span className="text-red-500">*</span></Label>
                          <Input placeholder="Owner First Name" value={orgUpdateForm.ownerFirstName || ''} onChange={(e) => updateOrgUpdate('ownerFirstName')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Owner Last Name <span className="text-red-500">*</span></Label>
                          <Input placeholder="Owner Last Name" value={orgUpdateForm.ownerLastName || ''} onChange={(e) => updateOrgUpdate('ownerLastName')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-6 border-t-2">
                      <Button type="button" variant="outline" onClick={resetAll} size="lg">Cancel</Button>
                      <Button type="submit" disabled={submittingOrgUpdate || !updateOrgRequiredOk} size="lg" className="gap-2">
                        {submittingOrgUpdate ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</> : <><CheckCircle2 className="h-4 w-4" />Update Organization</>}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Create Owner */}
        {view === 'createOwner' && (
          <>
            {!selectedOrg ? renderOrgPicker() : (
              <Card className="max-w-6xl mx-auto border-2 shadow-xl">
                <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 border-b-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                        <UserPlus className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Onboard Owner</h2>
                        <p className="text-muted-foreground">{selectedOrg.organizationName} • {selectedOrg.organizationId}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>Change</Button>
                      <Button variant="outline" size="sm" onClick={resetAll} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-8">
                  <form onSubmit={submitCreateOwner} className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Employee Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2"><Label className="text-sm font-semibold">Organization ID</Label><Input value={selectedOrg.organizationId} readOnly disabled className="h-11" /></div>
                        <div className="space-y-2"><Label className="text-sm font-semibold">Employee ID</Label><Input value={computedCreateOwnerEmpId} readOnly disabled className="h-11" /></div>
                        <div className="space-y-2"><Label className="text-sm font-semibold">Status</Label><Input value={ownerCreateForm.status || 'ACTIVE'} readOnly disabled className="h-11" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Role <span className="text-red-500">*</span></Label>
                          <Select 
                            value={ownerCreateForm.role} 
                            onValueChange={(value) => updateOwnerCreate('role')(value)}
                            required
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Department <span className="text-red-500">*</span></Label>
                          <Select 
                            value={ownerCreateForm.department} 
                            onValueChange={(value) => updateOwnerCreate('department')(value)}
                            required
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Personal Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">First Name <span className="text-red-500">*</span></Label>
                          <Input placeholder="First Name" value={ownerCreateForm.firstName} onChange={e => updateOwnerCreate('firstName')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Last Name <span className="text-red-500">*</span></Label>
                          <Input placeholder="Last Name" value={ownerCreateForm.lastName} onChange={e => updateOwnerCreate('lastName')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Phone Number</Label>
                          <Input type="tel" placeholder="Phone Number" value={ownerCreateForm.phoneNumber || ''} onChange={e => updateOwnerCreate('phoneNumber')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Email <span className="text-red-500">*</span></Label>
                          <Input type="email" placeholder="Email" value={ownerCreateForm.emailId} onChange={e => updateOwnerCreate('emailId')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Login Credentials</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Username <span className="text-red-500">*</span></Label>
                          <Input placeholder="Username" value={ownerCreateForm.username} onChange={e => updateOwnerCreate('username')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Password <span className="text-red-500">*</span></Label>
                          <Input type="password" placeholder="Password" value={ownerCreateForm.password} onChange={e => updateOwnerCreate('password')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Home className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Address</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Address Line 1</Label>
                          <Input placeholder="Address Line 1" value={ownerCreateForm.address?.line1 || ''} onChange={e => updateOwnerCreateAddress('line1', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Address Line 2</Label>
                          <Input placeholder="Address Line 2" value={ownerCreateForm.address?.line2 || ''} onChange={e => updateOwnerCreateAddress('line2', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">City</Label>
                          <Input placeholder="City" value={ownerCreateForm.address?.city || ''} onChange={e => updateOwnerCreateAddress('city', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">State</Label>
                          <Select value={ownerCreateForm.address?.state || ''} onValueChange={(value) => updateOwnerCreateAddress('state', value)}>
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {IN_STATES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Postal Code</Label>
                          <Input placeholder="Postal Code" value={ownerCreateForm.address?.postalCode || ''} onChange={e => updateOwnerCreateAddress('postalCode', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Country</Label>
                          <Input value={ownerCreateForm.address?.country || 'India'} readOnly disabled className="h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Phone className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Emergency Contact</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Name</Label>
                          <Input placeholder="Name" value={ownerCreateForm.emergencyContact?.name || ''} onChange={e => updateOwnerCreateEmergency('name', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Phone</Label>
                          <Input placeholder="Phone" value={ownerCreateForm.emergencyContact?.phone || ''} onChange={e => updateOwnerCreateEmergency('phone', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Relationship</Label>
                          <Input placeholder="Relationship" value={ownerCreateForm.emergencyContact?.relationship || ''} onChange={e => updateOwnerCreateEmergency('relationship', e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-6 border-t-2">
                      <Button type="button" variant="outline" onClick={resetAll} size="lg">Cancel</Button>
                      <Button type="submit" disabled={submittingOwnerCreate || !createOwnerRequiredOk} size="lg" className="gap-2">
                        {submittingOwnerCreate ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><CheckCircle2 className="h-4 w-4" />Create Owner</>}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Update Owner - ONLY OWNERS */}
        {view === 'updateOwner' && (
          <>
            {!selectedOrg ? (
              renderOrgPicker()
            ) : !selectedEmp ? (
              renderOwnerPicker()
            ) : (
              <Card className="max-w-6xl mx-auto border-2 shadow-xl">
                <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 p-6 border-b-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Update Owner</h2>
                        <p className="text-muted-foreground">{selectedOrg.organizationName} • {selectedEmp.firstName} {selectedEmp.lastName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedEmp(null)}>Change Employee</Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>Change Org</Button>
                      <Button variant="outline" size="sm" onClick={resetAll} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-8">
                  <form onSubmit={submitUpdateOwner} className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Employee Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2"><Label className="text-sm font-semibold">Employee ID</Label><Input value={selectedEmp.empId} readOnly disabled className="h-11" /></div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Status</Label>
                          <Input placeholder="Status" value={ownerUpdateForm.status || 'ACTIVE'} onChange={e => updateOwnerUpdate('status')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Role <span className="text-red-500">*</span></Label>
                          <Select 
                            value={ownerUpdateForm.role || ''} 
                            onValueChange={(value) => updateOwnerUpdate('role')(value)}
                            required
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Department <span className="text-red-500">*</span></Label>
                          <Select 
                            value={ownerUpdateForm.department || ''} 
                            onValueChange={(value) => updateOwnerUpdate('department')(value)}
                            required
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">First Name <span className="text-red-500">*</span></Label>
                          <Input placeholder="First Name" value={ownerUpdateForm.firstName || ''} onChange={e => updateOwnerUpdate('firstName')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Personal & Contact</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Last Name <span className="text-red-500">*</span></Label>
                          <Input placeholder="Last Name" value={ownerUpdateForm.lastName || ''} onChange={e => updateOwnerUpdate('lastName')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Phone Number</Label>
                          <Input type="tel" placeholder="Phone" value={ownerUpdateForm.phoneNumber || ''} onChange={e => updateOwnerUpdate('phoneNumber')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Email <span className="text-red-500">*</span></Label>
                          <Input type="email" placeholder="Email" value={ownerUpdateForm.emailId || ''} onChange={e => updateOwnerUpdate('emailId')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Username <span className="text-red-500">*</span></Label>
                          <Input placeholder="Username" value={ownerUpdateForm.username || ''} onChange={e => updateOwnerUpdate('username')(e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Password & Shift</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">New Password</Label>
                          <Input type="password" placeholder="New Password" value={ownerUpdateForm.newPassword || ''} onChange={e => updateOwnerUpdate('newPassword')(e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Shift Start</Label>
                          <Input type="time" placeholder="Shift Start" value={ownerUpdateForm.shiftTiming?.start || ''} onChange={e => updateOwnerUpdateShift('start', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Shift End</Label>
                          <Input type="time" placeholder="Shift End" value={ownerUpdateForm.shiftTiming?.end || ''} onChange={e => updateOwnerUpdateShift('end', e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Home className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Address</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Address Line 1</Label>
                          <Input placeholder="Address Line 1" value={ownerUpdateForm.address?.line1 || ''} onChange={e => updateOwnerUpdateAddress('line1', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Address Line 2</Label>
                          <Input placeholder="Address Line 2" value={ownerUpdateForm.address?.line2 || ''} onChange={e => updateOwnerUpdateAddress('line2', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">City</Label>
                          <Input placeholder="City" value={ownerUpdateForm.address?.city || ''} onChange={e => updateOwnerUpdateAddress('city', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">State</Label>
                          <Select value={ownerUpdateForm.address?.state || ''} onValueChange={(value) => updateOwnerUpdateAddress('state', value)}>
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {IN_STATES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Postal Code</Label>
                          <Input placeholder="Postal Code" value={ownerUpdateForm.address?.postalCode || ''} onChange={e => updateOwnerUpdateAddress('postalCode', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Country</Label>
                          <Input value={ownerUpdateForm.address?.country || 'India'} readOnly disabled className="h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b-2">
                        <Phone className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">Emergency Contact</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Name</Label>
                          <Input placeholder="Name" value={ownerUpdateForm.emergencyContact?.name || ''} onChange={e => updateOwnerUpdateEmergency('name', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Phone</Label>
                          <Input placeholder="Phone" value={ownerUpdateForm.emergencyContact?.phone || ''} onChange={e => updateOwnerUpdateEmergency('phone', e.target.value)} className="h-11 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Relationship</Label>
                          <Input placeholder="Relationship" value={ownerUpdateForm.emergencyContact?.relationship || ''} onChange={e => updateOwnerUpdateEmergency('relationship', e.target.value)} className="h-11 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-6 border-t-2">
                      <Button type="button" variant="outline" onClick={resetAll} size="lg">Cancel</Button>
                      <Button type="submit" disabled={submittingOwnerUpdate || !updateOwnerRequiredOk} size="lg" className="gap-2">
                        {submittingOwnerUpdate ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</> : <><CheckCircle2 className="h-4 w-4" />Update Owner</>}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

      </div>
    </div>
  );
}


