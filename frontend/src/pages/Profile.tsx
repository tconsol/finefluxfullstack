import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Mail, Phone, Calendar, Clock, Edit3, Camera, Lock, Shield,
  Briefcase, MapPin, Users, Building, Eye, EyeOff, Loader2, Save, X,
  AlertCircle, CheckCircle2, Home, UserCircle, LogOut
} from 'lucide-react';
import { API_CONFIG } from '@/lib/api-config';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Removed - using API_CONFIG
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || 'https://api.cloudinary.com/v1_1/dosyyvmtb/auto/upload';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PROFILE_UPLOAD_PRESET || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'Profile_Pictures';
const PROFILE_URL_KEY = "profileImageUrl";
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

type AddressDTO = { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
type ShiftTimingDTO = { start?: string; end?: string };
type EmployeeResponse = {
  id: string; empId: string; organizationId: string; status?: string; role?: string; department?: string;
  firstName?: string; lastName?: string; phoneNumber?: string; emailId?: string; username?: string; gender?: string;
  salary?: number; joinedDate?: string; shiftTiming?: ShiftTimingDTO; address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string }; managerName?: string; profileImageUrl?: string;
};
type EmployeeUpdateRequest = {
  empId?: string; organizationId?: string; status?: string; role?: string; department?: string;
  firstName?: string; lastName?: string; phoneNumber?: string; emailId?: string; username?: string; gender?: string;
  salary?: number; shiftTiming?: ShiftTimingDTO; address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string }; profileImageUrl?: string;
};
export default function Profile() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';
  const { toast } = useToast();

  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [internalId, setInternalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [form, setForm] = useState<EmployeeUpdateRequest>({
    role: '', department: '', firstName: '', lastName: '', phoneNumber: '', emailId: '', username: '', gender: '',
    salary: undefined, status: 'ACTIVE', shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' }, profileImageUrl: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const listUrl = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees?page=0&size=200`;
        const listRes = await axios.get(listUrl, { timeout: 15000 });
        const items = Array.isArray(listRes.data?.content) ? listRes.data.content : Array.isArray(listRes.data) ? listRes.data : [];
        const match = items.find((x: any) => x.empId === empId);
        if (!match) throw new Error('Employee not found');
        const id = match.id;
        setInternalId(id);
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees/${id}`, { timeout: 15000 });
        if (cancelled) return;
        const data: EmployeeResponse = res.data;

        setEmployee(data);
        setForm({
          role: data.role || '', department: data.department || '', firstName: data.firstName || '', lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '', emailId: data.emailId || '', username: data.username || '', gender: data.gender || '',
          salary: data.salary, status: data.status?.toUpperCase() || 'ACTIVE',
          shiftTiming: { start: data.shiftTiming?.start || '', end: data.shiftTiming?.end || '' },
          address: {
            line1: data.address?.line1 || '', line2: data.address?.line2 || '', city: data.address?.city || '',
            state: data.address?.state || '', postalCode: data.address?.postalCode || '', country: data.address?.country || 'India',
          },
          emergencyContact: { name: data.emergencyContact?.name || '', phone: data.emergencyContact?.phone || '', relationship: data.emergencyContact?.relationship || '' },
          profileImageUrl: data.profileImageUrl || '',
        });

        if (data.profileImageUrl && data.profileImageUrl.trim()) {
          localStorage.setItem(PROFILE_URL_KEY, data.profileImageUrl);
        } else {
          localStorage.removeItem(PROFILE_URL_KEY);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orgId, empId]);

  const fullName = useMemo(() => employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : '', [employee]);
  const getUserInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleChange = (field: keyof EmployeeUpdateRequest, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const handleAddress = (k: keyof AddressDTO, v: string) => setForm(prev => ({ ...prev, address: { ...prev.address, [k]: v } }));
  const handleEC = (k: 'name' | 'phone' | 'relationship', v: string) => setForm(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [k]: v } }));
  const handleShift = (k: 'start' | 'end', v: string) => setForm(prev => ({ ...prev, shiftTiming: { ...prev.shiftTiming, [k]: v } }));

  const handleLogout = () => {
    localStorage.removeItem(PROFILE_URL_KEY);
    localStorage.removeItem('organizationId');
    localStorage.removeItem('empId');
    localStorage.removeItem('authToken');
    toast({ title: 'Logged out successfully', variant: 'default' });
    window.location.href = '/login';
  };

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
      data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      data.append('folder', 'Profile_Photos');
      const res = await axios.post(CLOUDINARY_UPLOAD_URL, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = res.data?.secure_url;
      if (!imageUrl) throw new Error('No image URL returned from Cloudinary');

      // Save image URL to DB via backend
      await saveProfileImage(imageUrl);

      // Update avatar only after upload success
      setForm(prev => ({ ...prev, profileImageUrl: imageUrl }));
      setEmployee(prev => prev ? { ...prev, profileImageUrl: imageUrl } : prev);

      toast({ title: 'Uploaded!' });

      if (imageUrl && imageUrl.trim()) {
        localStorage.setItem(PROFILE_URL_KEY, imageUrl);
      } else {
        localStorage.removeItem(PROFILE_URL_KEY);
      }
    } catch (err) {
      toast({ title: 'Upload failed', description: err?.response?.data?.error?.message || String(err), variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveProfileImage = async (imageUrl: string) => {
    if (!employee || !internalId) return;
    const res = await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees/${internalId}`, {
      empId: employee.empId, organizationId: employee.organizationId, profileImageUrl: imageUrl
    });
    setEmployee(res.data);

    const finalUrl = res.data?.profileImageUrl || imageUrl;
    if (finalUrl && finalUrl.trim()) {
      localStorage.setItem(PROFILE_URL_KEY, finalUrl);
    } else {
      localStorage.removeItem(PROFILE_URL_KEY);
    }
  };

  const handleSave = async () => {
    if (!employee || !internalId) return;
    setSaving(true);
    try {
      const payload = { ...form, empId: employee.empId, organizationId: employee.organizationId };
      const res = await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees/${internalId}`, payload);
      setEmployee(res.data);
      setIsEditing(false);
      toast({ title: 'Profile updated successfully', variant: 'default' });

      const updatedUrl = res.data?.profileImageUrl;
      if (updatedUrl && updatedUrl.trim()) {
        localStorage.setItem(PROFILE_URL_KEY, updatedUrl);
      } else {
        localStorage.removeItem(PROFILE_URL_KEY);
      }
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePwdChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd) { toast({ title: 'All fields required', variant: 'destructive' }); return; }
    setSavingPwd(true);
    try {
      await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees/${employee?.id}/change-password`, {
        empId: employee?.empId, currentPassword: currentPwd, newPassword: newPwd
      });
      setPwdDialogOpen(false);
      setCurrentPwd(''); setNewPwd('');
      toast({ title: 'Password changed successfully', variant: 'default' });
    } catch {
      toast({ title: 'Password change failed', variant: 'destructive' });
    } finally {
      setSavingPwd(false);
    }
  };

  const storedProfileUrl = useMemo(() => localStorage.getItem(PROFILE_URL_KEY) || '', []);
  const profileUrl = employee?.profileImageUrl || storedProfileUrl;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="text-lg font-medium text-slate-700">Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full shadow-xl border-red-100">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Unable to Load Profile</h2>
          <p className="text-slate-600">{error}</p>
          <Button onClick={() => location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
  if (!employee) return null;

  return (
    <div className="min-h-screen">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Card */}
        <Card className="mb-8 overflow-hidden border-0 shadow-xl bg-white">
          <div className="h-32 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-500" />
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-white shadow-2xl ring-4 ring-slate-100">
                  {profileUrl ? (
                    <AvatarImage src={profileUrl} alt={fullName} className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-slate-600 to-slate-500 text-white">
                      {getUserInitials(fullName || employee.empId || 'U')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-white shadow-lg border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                >
                  {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin text-slate-600" /> : <Camera className="h-5 w-5 text-slate-600" />}
                </Button>
              </div>
              {/* Info */}
              <div className="flex-1 pt-4">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{fullName || 'Employee'}</h1>
                <p className="text-slate-600 mb-3">
                  <span className="font-medium">Employee ID:</span> <span className="text-slate-700 font-semibold">{employee.empId}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="px-3 py-1 bg-orange-600 text-white hover:bg-orange-700 border border-orange-300">
                    <Briefcase className="h-3 w-3 mr-1.5" />
                    {employee.role || 'No Role'}
                  </Badge>
                  <Badge className={`px-3 py-1 ${employee.status?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700'}`}>
                    <Shield className="h-3 w-3 mr-1.5" />
                    {employee.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <Badge className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200">
                    <Building className="h-3 w-3 mr-1.5" />
                    {employee.department || 'No Department'}
                  </Badge>
                </div>
              </div>
              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:flex-row">
                {!isEditing ? (
                  <>
                    <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button onClick={() => setPwdDialogOpen(true)} variant="outline" className="w-full sm:w-auto border-slate-300">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} disabled={saving} variant="outline" className="w-full sm:w-auto border-slate-300">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ...All info cards, modals, and final render continue next... */}
        {/* Personal Information Card */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-300">
                <User className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                <p className="text-sm text-slate-500">Basic profile details</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold text-slate-700">First Name</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium">
                  {employee.firstName || <span className="text-slate-400">Not set</span>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Last Name</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium">
                  {employee.lastName || <span className="text-slate-400">Not set</span>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Username</Label>
                <div className="h-11 px-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium select-none">
                  {employee.username || <span className="text-slate-400">Not set</span>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Gender</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                  {employee.gender || <span className="text-slate-400">Not set</span>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Email Address</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                  {employee.emailId || <span className="text-slate-400">Not set</span>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Phone Number</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                  {employee.phoneNumber || <span className="text-slate-400">Not set</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Employment Details</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Role</Label>
              <div className="h-11 px-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium select-none">
                {employee.role || <span className="text-slate-400">Not set</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Department</Label>
              <div className="h-11 px-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium select-none">
                {employee.department || <span className="text-slate-400">Not set</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Salary</Label>
              <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                {employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : <span className="text-slate-400">Not set</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Joined Date</Label>
              <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                {formatDate(employee.joinedDate)}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Reporting Manager</Label>
              <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                {employee.managerName || <span className="text-slate-400">Not assigned</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Shift</Label>
              <div className="flex gap-2">
                <div className="flex-1 h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">{employee.shiftTiming?.start || "—"}</div>
                <div className="flex-1 h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">{employee.shiftTiming?.end || "—"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Address Information</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Line 1", val: employee.address?.line1 },
              { label: "Line 2", val: employee.address?.line2 },
              { label: "City", val: employee.address?.city },
              { label: "State", val: employee.address?.state },
              { label: "Postal Code", val: employee.address?.postalCode },
              { label: "Country", val: employee.address?.country },
            ].map(field => (
              <div key={field.label}>
                <Label className="text-sm font-semibold text-slate-700">{field.label}</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">{field.val || <span className="text-slate-400">Not set</span>}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader className="border-b bg-slate-50/50 flex gap-2 items-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900">Emergency Contact</h2>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Name", val: employee.emergencyContact?.name },
              { label: "Phone", val: employee.emergencyContact?.phone },
              { label: "Relationship", val: employee.emergencyContact?.relationship }
            ].map(field => (
              <div key={field.label}>
                <Label className="text-sm font-semibold text-slate-700">{field.label}</Label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">{field.val || <span className="text-slate-400">Not set</span>}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* EDIT MODAL and PASSWORD MODAL - next block */}


      {/* EDIT MODAL */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-3xl max-h-[85vh] overflow-hidden p-0">
          <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="flex flex-col max-h-[85vh]">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <UserCircle className="h-5 w-5 text-primary" />
                Edit Profile
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                Edit only fields you want to update.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label>First Name <span className="text-red-600">*</span></Label>
                  <Input value={form.firstName || ""} onChange={e => handleChange("firstName", e.target.value)} required autoFocus />
                </div>
                <div><Label>Last Name <span className="text-red-600">*</span></Label>
                  <Input value={form.lastName || ""} onChange={e => handleChange("lastName", e.target.value)} required />
                </div>
                <div><Label>Username</Label>
                  <Input value={form.username || ""} readOnly disabled />
                </div>
                <div><Label>Gender</Label>
                  <Select value={form.gender || ""} onValueChange={value => handleChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Email</Label>
                  <Input type="email" value={form.emailId || ""} onChange={e => handleChange("emailId", e.target.value)} />
                </div>
                <div><Label>Phone Number <span className="text-red-600">*</span></Label>
                  <Input
                    type="tel"
                    value={form.phoneNumber || ""}
                    onChange={e => handleChange("phoneNumber", e.target.value)}
                    pattern="^\d{10}$"
                    placeholder="Enter 10 digit phone number"
                    required
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <div className="h-11 px-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-500 select-none cursor-not-allowed" tabIndex={-1}>
                    {employee.department || <span className="text-slate-400">Not set</span>}
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  <div className="h-11 px-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-500 select-none cursor-not-allowed" tabIndex={-1}>
                    {employee.role || <span className="text-slate-400">Not set</span>}
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <div className="flex-1">
                    <Label>Shift Start</Label>
                    <Input type="time" value={form.shiftTiming?.start || ""} onChange={e => handleShift("start", e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label>Shift End</Label>
                    <Input type="time" value={form.shiftTiming?.end || ""} onChange={e => handleShift("end", e.target.value)} />
                  </div>
                </div>
                {/* Address fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Address Line 1</Label>
                    <Input value={form.address?.line1 || ""} onChange={e => handleAddress("line1", e.target.value)} />
                  </div>
                  <div><Label>Address Line 2</Label>
                    <Input value={form.address?.line2 || ""} onChange={e => handleAddress("line2", e.target.value)} />
                  </div>
                  <div><Label>City</Label>
                    <Input value={form.address?.city || ""} onChange={e => handleAddress("city", e.target.value)} />
                  </div>
                  <div><Label>State</Label>
                    <Select value={form.address?.state || ""} onValueChange={v => handleAddress("state", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Indian state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(st => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Postal Code</Label>
                    <Input value={form.address?.postalCode || ""} onChange={e => handleAddress("postalCode", e.target.value)} />
                  </div>
                  <div><Label>Country</Label>
                    <Select value={form.address?.country || "India"} onValueChange={v => handleAddress("country", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Emergency fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Emergency Name</Label>
                    <Input value={form.emergencyContact?.name || ""} onChange={e => handleEC("name", e.target.value)} />
                  </div>
                  <div><Label>Emergency Phone</Label>
                    <Input value={form.emergencyContact?.phone || ""} onChange={e => handleEC("phone", e.target.value)} />
                  </div>
                  <div><Label>Relationship</Label>
                    <Input value={form.emergencyContact?.relationship || ""} onChange={e => handleEC("relationship", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="text-xs text-muted-foreground flex-1 flex items-center">
                  All changes need to be saved for updates to apply.
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={saving} className="flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PASSWORD MODAL */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Enter your current password and choose a new password
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 px-6 py-4" onSubmit={handlePwdChange}>
            <div className="space-y-2">
              <Label>Current Password <span className="text-red-600">*</span></Label>
              <div className="relative">
                <Input
                  type={showCurrentPwd ? "text" : "password"}
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}>
                  {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password <span className="text-red-600">*</span></Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? "text" : "password"}
                  value={newPwd}
                  minLength={6}
                  onChange={e => setNewPwd(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}>
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Button type="button" variant="outline" onClick={() => setPwdDialogOpen(false)} disabled={savingPwd} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button type="submit" disabled={savingPwd} className="flex-1 sm:flex-none">
                  {savingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Update
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
