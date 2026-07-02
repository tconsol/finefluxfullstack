import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Building,
  Save,
  RefreshCw,
  Edit3,
  X,
  Check,
  Loader2,
  Fuel,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  ChevronRight,
  CreditCard,
  Globe,
  User,
} from "lucide-react";
import { API_CONFIG } from '@/lib/api-config';
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Removed - using API_CONFIG

type OrganizationResponse = {
  id?: string;
  organizationId?: string;
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

type OrgForm = {
  organizationName: string;
  gstNumber: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  licenseNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
};

type Product = {
  id: string;
  productName: string;
  price?: number;
};

type FuelPriceRow = {
  id: string;
  name: string;
  price: string;
  saving?: boolean;
  saved?: boolean;
};

type SettingsSection = "company" | "pricing" | "notifications" | "security" | "preferences";

const settingsMenu = [
  { id: "company" as SettingsSection, label: "Company Info", icon: Building, color: "text-blue-600" },
  { id: "pricing" as SettingsSection, label: "Fuel Pricing", icon: Fuel, color: "text-orange-600" },
  { id: "notifications" as SettingsSection, label: "Notifications", icon: Bell, color: "text-purple-600" },
  { id: "security" as SettingsSection, label: "Security", icon: Shield, color: "text-red-600" },
  { id: "preferences" as SettingsSection, label: "Preferences", icon: SettingsIcon, color: "text-indigo-600" },
];

function MobileSettingsNav({
  activeSection,
  setActiveSection,
}: {
  activeSection: SettingsSection;
  setActiveSection: (s: SettingsSection) => void;
}) {
  return (
    <Card className="md:hidden">
      <CardContent className="p-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {settingsMenu.map((item) => {
            const Active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap border transition-colors",
                  Active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted text-foreground border-border"
                )}
              >
                <item.icon className={cn("h-4 w-4", Active ? "text-primary-foreground" : item.color)} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const [activeSection, setActiveSection] = useState<SettingsSection>("company");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<OrgForm>({
    organizationName: "",
    gstNumber: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    phoneNumber: "",
    email: "",
    licenseNumber: "",
    ownerFirstName: "",
    ownerLastName: "",
  });

  const [fuelPrices, setFuelPrices] = useState<FuelPriceRow[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organization
  const { data: org, isLoading, isError, refetch } = useQuery<OrganizationResponse>({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/by-org-id/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!org) return;
    setForm({
      organizationName: org.organizationName ?? "",
      gstNumber: org.gstNumber ?? "",
      address1: org.address1 ?? "",
      address2: org.address2 ?? "",
      city: org.city ?? "",
      state: org.state ?? "",
      country: org.country ?? "India",
      postalCode: org.postalCode ?? "",
      phoneNumber: org.phoneNumber ?? "",
      email: org.email ?? "",
      licenseNumber: org.licenseNumber ?? "",
      ownerFirstName: org.ownerFirstName ?? "",
      ownerLastName: org.ownerLastName ?? "",
    });
  }, [org]);

  const addressDisplay = useMemo(() => {
    const parts = [form.address1, form.address2, form.city, form.state, form.country, form.postalCode]
      .map((s) => (s || "").trim())
      .filter((s) => s.length > 0);
    return parts.join(", ");
  }, [form]);

  const updateMutation = useMutation({
    mutationFn: async (payload: OrgForm) => {
      const id = org?.id;
      if (!id) throw new Error("Organization id missing");
      const res = await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      setEditMode(false);
      toast({ title: "Success!", description: "Company information updated.", variant: "default" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update information.", variant: "destructive" });
    },
  });

  // Fetch products
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
  } = useQuery<Product[]>({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!products) return;
    setFuelPrices(
      products.map((p) => ({
        id: p.id,
        name: p.productName,
        price: p.price != null ? String(p.price) : "",
        saving: false,
        saved: false,
      }))
    );
  }, [products]);

  const priceMutation = useMutation({
    mutationFn: async ({
      id,
      price,
      empId,
      idx,
      name,
    }: {
      id: string;
      price: number;
      empId: string;
      idx: number;
      name: string;
    }) => {
      await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/appsettings/products/${id}/price`, null, {
        params: { price, empId },
      });
      return { idx, price, name };
    },
    onSuccess: async (_ret, { idx, price, name }) => {
      setFuelPrices((rows) => rows.map((r, i) => (i === idx ? { ...r, saving: false, saved: true } : r)));
      await refetchProducts();
      setTimeout(
        () => setFuelPrices((rows) => rows.map((r, i) => (i === idx ? { ...r, saved: false } : r))),
        2000
      );
      toast({ title: "Updated!", description: `${name} price set to ₹${price.toFixed(2)}`, variant: "default" });
    },
    onError: (_err, { idx, name }) => {
      setFuelPrices((rows) => rows.map((r, i) => (i === idx ? { ...r, saving: false } : r)));
      toast({ title: "Failed", description: `Could not update ${name}`, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <p className="text-xl font-bold">Failed to load settings</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 md:py-6">
      {/* Mobile top nav */}
      <MobileSettingsNav activeSection={activeSection} setActiveSection={setActiveSection} />

      <div className="mt-4 md:mt-6 flex flex-col md:flex-row md:gap-6 gap-4">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:block md:w-64 md:shrink-0">
          <Card className="md:sticky md:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Settings</CardTitle>
              <CardDescription className="text-xs">Configure your system</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsMenu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          activeSection === item.id ? "text-primary-foreground" : item.color
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {activeSection === item.id && <ChevronRight className="h-4 w-4" />}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 md:space-y-6"
            >
              {/* Company Info */}
              {activeSection === "company" && (
                <>
                  <div className="flex items-start md:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <Building className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                        Company Information
                      </h2>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        Manage your organization details
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editMode ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (org)
                                setForm({
                                  organizationName: org.organizationName ?? "",
                                  gstNumber: org.gstNumber ?? "",
                                  address1: org.address1 ?? "",
                                  address2: org.address2 ?? "",
                                  city: org.city ?? "",
                                  state: org.state ?? "",
                                  country: org.country ?? "India",
                                  postalCode: org.postalCode ?? "",
                                  phoneNumber: org.phoneNumber ?? "",
                                  email: org.email ?? "",
                                  licenseNumber: org.licenseNumber ?? "",
                                  ownerFirstName: org.ownerFirstName ?? "",
                                  ownerLastName: org.ownerLastName ?? "",
                                });
                              setEditMode(false);
                            }}
                            className="h-9"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            onClick={() => updateMutation.mutate(form)}
                            disabled={updateMutation.isPending}
                            className="h-9"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setEditMode(true)} className="h-9">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  <Card>
                    <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6">
                      {org?.organizationId && (
                        <Badge variant="outline" className="w-fit">
                          Org ID: {org.organizationId}
                        </Badge>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1.5">
                          <Label>Company Name</Label>
                          <Input
                            value={form.organizationName}
                            onChange={(e) => setForm((s) => ({ ...s, organizationName: e.target.value }))}
                            disabled={!editMode}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>GST Number</Label>
                          <Input
                            value={form.gstNumber}
                            onChange={(e) => setForm((s) => ({ ...s, gstNumber: e.target.value }))}
                            disabled={!editMode}
                          />
                        </div>
                      </div>

                      {!editMode ? (
                        <div className="space-y-1.5">
                          <Label>Address</Label>
                          <div className="p-3 rounded-md bg-muted text-sm">
                            {addressDisplay || "No address provided"}
                          </div>
                        </div>
                      ) : (
                        <>
                          <Separator />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-1.5">
                              <Label>Address Line 1</Label>
                              <Input
                                value={form.address1}
                                onChange={(e) => setForm((s) => ({ ...s, address1: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Address Line 2</Label>
                              <Input
                                value={form.address2}
                                onChange={(e) => setForm((s) => ({ ...s, address2: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                            <div className="space-y-1.5">
                              <Label>City</Label>
                              <Input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label>State</Label>
                              <Input
                                value={form.state}
                                onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Postal Code</Label>
                              <Input
                                value={form.postalCode}
                                onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Country</Label>
                            <Input
                              value={form.country}
                              onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                            />
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1.5">
                          <Label>Phone Number</Label>
                          <Input
                            value={form.phoneNumber}
                            onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))}
                            disabled={!editMode}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                            disabled={!editMode}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>License Number</Label>
                        <Input
                          value={form.licenseNumber}
                          onChange={(e) => setForm((s) => ({ ...s, licenseNumber: e.target.value }))}
                          disabled={!editMode}
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1.5">
                          <Label>Owner First Name</Label>
                          <Input
                            value={form.ownerFirstName}
                            onChange={(e) => setForm((s) => ({ ...s, ownerFirstName: e.target.value }))}
                            disabled={!editMode}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Owner Last Name</Label>
                          <Input
                            value={form.ownerLastName}
                            onChange={(e) => setForm((s) => ({ ...s, ownerLastName: e.target.value }))}
                            disabled={!editMode}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Fuel Pricing */}
              {activeSection === "pricing" && (
                <>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                      <Fuel className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                      Fuel Pricing
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      Manage retail prices per liter
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {isLoadingProducts ? (
                      <div className="col-span-1 md:col-span-2 flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : fuelPrices.length === 0 ? (
                      <div className="col-span-1 md:col-span-2 text-center py-10 text-muted-foreground">
                        No products found
                      </div>
                    ) : (
                      fuelPrices.map((fuel, idx) => (
                        <Card key={fuel.id} className="relative overflow-hidden">
                          {fuel.saved && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-green-500 text-white">
                                <Check className="h-3 w-3 mr-1" />
                                Saved
                              </Badge>
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base md:text-lg flex items-center gap-2">
                              <Fuel className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                              {fuel.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base md:text-lg font-bold">₹</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={fuel.price}
                                onChange={(e) =>
                                  setFuelPrices((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, price: e.target.value, saved: false } : r
                                    )
                                  )
                                }
                                disabled={fuel.saving}
                                className="text-base md:text-lg font-bold"
                              />
                              <Button
                                disabled={
                                  fuel.saving ||
                                  !empId ||
                                  !fuel.price.trim() ||
                                  isNaN(Number(fuel.price))
                                }
                                onClick={() => {
                                  const priceNum = parseFloat(fuel.price);
                                  if (isNaN(priceNum)) return;
                                  setFuelPrices((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, saving: true } : r))
                                  );
                                  priceMutation.mutate({
                                    id: fuel.id,
                                    price: priceNum,
                                    empId,
                                    idx,
                                    name: fuel.name,
                                  });
                                }}
                              >
                                {fuel.saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        Tax Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: "GST Rate", value: "18%", editable: true },
                        { name: "Service Tax", value: "2%", editable: true },
                        { name: "Environmental Cess", value: "1%", editable: false },
                      ].map((tax) => (
                        <div key={tax.name} className="flex items-center justify-between p-3 rounded-md bg-muted">
                          <div>
                            <p className="font-semibold">{tax.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tax.editable ? "Configurable" : "Government mandated"}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-sm md:text-base font-bold">
                            {tax.value}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                      <Bell className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                      Notifications
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      Configure alerts and notifications
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Mail className="h-5 w-5 text-blue-600" />
                          Email Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {["Low Stock Warning", "Daily Sales Report", "Employee Attendance", "System Backup"].map(
                          (alert) => (
                            <div key={alert} className="flex items-center justify-between">
                              <span className="text-sm">{alert}</span>
                              <Switch defaultChecked disabled />
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Phone className="h-5 w-5 text-green-600" />
                          SMS Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {["Critical Errors", "Tank Empty", "Security Alerts", "Payment Failures"].map((alert) => (
                          <div key={alert} className="flex items-center justify-between">
                            <span className="text-sm">{alert}</span>
                            <Switch disabled />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Security */}
              {activeSection === "security" && (
                <>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                      <Shield className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                      Security
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage security policies</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Password Policy</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          "Minimum 8 characters",
                          "Special characters required",
                          "Password expiry (90 days)",
                          "Two-factor authentication",
                        ].map((policy, idx) => (
                          <div key={policy} className="flex items-center justify-between">
                            <span className="text-sm">{policy}</span>
                            <Switch defaultChecked={idx < 2} disabled />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Session Management</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Session Timeout (minutes)</Label>
                          <Input type="number" defaultValue="30" disabled />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Max Concurrent Sessions</Label>
                          <Input type="number" defaultValue="3" disabled />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm">Auto-logout on idle</span>
                          <Switch defaultChecked disabled />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Preferences */}
              {activeSection === "preferences" && (
                <>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                      <SettingsIcon className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                      System Preferences
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Configure system settings</p>
                  </div>

                  <Card>
                    <CardContent className="pt-4 md:pt-6 space-y-3 md:space-y-4">
                      {[
                        {
                          label: "Email Notifications",
                          description: "Receive email alerts for important events",
                          checked: true,
                        },
                        { label: "SMS Alerts", description: "Get SMS notifications for critical alerts", checked: false },
                        { label: "Automatic Backup", description: "Automatically backup data daily", checked: true },
                        { label: "Low Stock Alerts", description: "Alert when fuel stock is below threshold", checked: true },
                        { label: "Dark Mode", description: "Use dark theme interface", checked: false },
                        { label: "Audit Logging", description: "Keep detailed logs of all activities", checked: true },
                      ].map((setting) => (
                        <div
                          key={setting.label}
                          className="flex items-center justify-between p-3 md:p-4 rounded-md border"
                        >
                          <div className="pr-3">
                            <p className="font-semibold text-sm md:text-base">{setting.label}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">{setting.description}</p>
                          </div>
                          <Switch defaultChecked={setting.checked} disabled />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


