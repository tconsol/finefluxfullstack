import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import { Search, Eye, Users, UserCheck, Briefcase, ClipboardList, Star, Calendar, X, Mail, Phone, Clock, Filter, Fuel, CheckCircle2, AlertCircle, Target, Loader2, Edit, Trash2 } from "lucide-react";
import PopupClose from "@/components/PopupClose";
import { API_CONFIG } from '@/lib/api-config';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

type Employee = {
  empId: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber?: string;
  role: string;
  status?: string;
  department?: string;
  profileImageUrl?: string;
  shiftTiming?: { start?: string; end?: string };
};

type TaskCreate = {
  orgId: string;
  taskTitle: string;
  description: string;
  priority: "high" | "medium" | "low";
  shift: string;
  assignedToEmpId: string;
  dueDate: string;
};

type DailyDutyCreate = {
  organizationId: string;
  empId: string;
  dutyDate: string;
  productIds: string[];
  gunIds: string[];
  shiftStart: string;
  shiftEnd: string;
  status?: string;
};

type DailyDuty = {
  id: string;
  empId: string;
  employeeName?: string;
  dutyDate: string;
  productIds: string[];
  gunIds: string[];
  shiftStart: string;
  shiftEnd: string;
  status: string;
};

function formatTime(time?: string) {
  return time || "";
}

// Returns initials from a full name string
function getUserInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
  return (parts[0][0] || "") + (parts[parts.length - 1][0] || "");
}

// Get current date
const getToday = () => dayjs().format("YYYY-MM-DD");

export default function EmployeeSetDuty() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") || "" : "";

  if (!orgId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading organization context…
      </div>
    );
  }

  const [search, setSearch] = useState("");

  // Fetch employees
  const { data: employeesRaw = [], isLoading } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees`);
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.content)) return res.data.content;
      return [];
    },
    enabled: !!orgId,
  });

  // Fetch products
  const { data: productsRaw = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  // Fetch guns
  const { data: gunsRaw = [] } = useQuery({
    queryKey: ["guns", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  // Fetch all duties for the organization
  const { data: allDuties = [], refetch: refetchDuties } = useQuery({
    queryKey: ["allDuties", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties`);
      return Array.isArray(res.data) ? res.data : Array.isArray(res.data?.content) ? res.data.content : [];
    },
    enabled: !!orgId,
  });

  // Filter today's duties from all duties
  const todayDuties = useMemo(() => {
    const today = getToday();
    return allDuties.filter((duty: any) => duty.dutyDate === today);
  }, [allDuties]);

  const employees = Array.isArray(employeesRaw)
    ? employeesRaw.filter((e: any) => (e.status ?? "").toLowerCase() === "active")
    : [];

  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const guns = Array.isArray(gunsRaw) ? gunsRaw : [];

  const stats = useMemo(() => ([
    {
      title: 'Total Employees',
      value: employees.length.toString(),
      change: 'Available for duty',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Active',
      value: employees.filter((e: Employee) => (e.status || '').toLowerCase() === 'active').length.toString(),
      change: 'Ready to assign',
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Departments',
      value: new Set(employees.map((e: Employee) => e.department)).size.toString(),
      change: 'Active departments',
      icon: Briefcase,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Total Tasks',
      value: '0',
      change: 'Duties assigned',
      icon: ClipboardList,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ]), [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e: Employee) => {
      const fullName = `${e.firstName} ${e.lastName}`.trim();
      const composite = [fullName, e.empId, e.role, e.emailId, e.phoneNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return composite.includes(q);
    });
  }, [employees, search]);

  // Special Duty State
  const [specialDutyOpen, setSpecialDutyOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [specialDutyForm, setSpecialDutyForm] = useState<TaskCreate>({
    orgId,
    taskTitle: "",
    description: "",
    priority: "medium",
    shift: "",
    assignedToEmpId: "",
    dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
  });

  // Daily Duty State
  const [dailyDutyOpen, setDailyDutyOpen] = useState(false);
  const [dailyDutyForm, setDailyDutyForm] = useState<Omit<DailyDutyCreate, 'organizationId' | 'productIds' | 'gunIds'>>({
    empId: "",
    dutyDate: getToday(),
    shiftStart: "",
    shiftEnd: "",
    status: "SCHEDULED",
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productGuns, setProductGuns] = useState<Record<string, string[]>>({});
  const [validationErr, setValidationErr] = useState<string | null>(null);

  // Helper to normalize values for tolerant matching
  const normalize = (v: any) => String(v ?? "").trim().toLowerCase();

  // Edit duty state
  const [editDutyOpen, setEditDutyOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<DailyDuty | null>(null);

  // Delete duty state
  const [deleteDutyOpen, setDeleteDutyOpen] = useState(false);
  const [deletingDuty, setDeletingDuty] = useState<DailyDuty | null>(null);

  // View duty detail state
  const [viewDutyOpen, setViewDutyOpen] = useState(false);
  const [viewingDuty, setViewingDuty] = useState<DailyDuty | null>(null);

  // Mutation for creating daily duty
  const createDutyMutation = useMutation({
    mutationFn: async (data: DailyDutyCreate) => {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Daily duty assigned to ${currentEmp?.firstName} ${currentEmp?.lastName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["employee-duties", orgId] });
      queryClient.invalidateQueries({ queryKey: ["allDuties", orgId] });
      refetchDuties();
      setDailyDutyOpen(false);
      resetDailyForm();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || "Could not assign daily duty.";
      toast({
        title: "Assignment Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating daily duty
  const updateDutyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DailyDutyCreate }) => {
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily duty updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-duties", orgId] });
      queryClient.invalidateQueries({ queryKey: ["allDuties", orgId] });
      refetchDuties();
      setEditDutyOpen(false);
      setEditingDuty(null);
      resetDailyForm();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || "Could not update duty.";
      toast({
        title: "Update Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting daily duty
  const deleteDutyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties/${id}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily duty deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-duties", orgId] });
      queryClient.invalidateQueries({ queryKey: ["allDuties", orgId] });
      refetchDuties();
      setDeleteDutyOpen(false);
      setDeletingDuty(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || "Could not delete duty.";
      toast({
        title: "Delete Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  // Mutation for creating special task
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskCreate) => {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Special duty "${specialDutyForm.taskTitle}" assigned to ${currentEmp?.firstName} ${currentEmp?.lastName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      setSpecialDutyOpen(false);
      resetSpecialForm();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || "Could not assign special duty.";
      toast({
        title: "Assignment Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  function resetDailyForm() {
    setDailyDutyForm({
      empId: "",
      dutyDate: getToday(),
      shiftStart: "",
      shiftEnd: "",
      status: "SCHEDULED",
    });
    setSelectedProducts([]);
    setProductGuns({});
    setValidationErr(null);
  }

  function resetSpecialForm() {
    setSpecialDutyForm({
      orgId,
      taskTitle: "",
      description: "",
      priority: "medium",
      shift: "",
      assignedToEmpId: "",
      dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    });
  }

  function openSpecialDutyDialog(emp: Employee) {
    setCurrentEmp(emp);
    setSpecialDutyForm({
      orgId,
      assignedToEmpId: emp.empId,
      taskTitle: "",
      description: "",
      priority: "medium",
      shift: "",
      dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    });
    setSpecialDutyOpen(true);
    setDailyDutyOpen(false);
  }

  function openDailyDutyDialog(emp: Employee) {
    setCurrentEmp(emp);
    setDailyDutyForm({
      empId: emp.empId,
      dutyDate: getToday(),
      shiftStart: emp.shiftTiming?.start || "06:00",
      shiftEnd: emp.shiftTiming?.end || "18:00",
      status: "SCHEDULED",
    });
    setSelectedProducts([]);
    setProductGuns({});
    setDailyDutyOpen(true);
    setSpecialDutyOpen(false);
    setValidationErr(null);
  }

  function openEditDutyDialog(duty: DailyDuty) {
    const emp = employees.find((e: Employee) => e.empId === duty.empId);
    setCurrentEmp(emp || null);
    setEditingDuty(duty);
    setDailyDutyForm({
      empId: duty.empId,
      dutyDate: duty.dutyDate,
      shiftStart: duty.shiftStart,
      shiftEnd: duty.shiftEnd,
      status: duty.status || "SCHEDULED",
    });
    
    // Reconstruct product-gun mapping from parallel arrays
    const gunsByProduct: Record<string, string[]> = {};
    const uniqueProducts = new Set<string>();
    
    // productIds and gunIds are parallel arrays
    (duty.productIds || []).forEach((productName, index) => {
      const gunName = duty.gunIds?.[index];
      if (gunName) {
        uniqueProducts.add(productName);
        if (!gunsByProduct[productName]) {
          gunsByProduct[productName] = [];
        }
        gunsByProduct[productName].push(gunName);
      }
    });
    
    setSelectedProducts(Array.from(uniqueProducts));
    setProductGuns(gunsByProduct);
    
    setEditDutyOpen(true);
    setValidationErr(null);
  }

  const toggleProductSelection = (productName: string) => {
    const isSelected = selectedProducts.includes(productName);
    if (isSelected) {
      // deselect product and remove its guns
      setSelectedProducts((s) => s.filter((p) => p !== productName));
      setProductGuns((pg) => {
        const next = { ...pg };
        delete next[productName];
        return next;
      });
      return;
    }

    // select: compute guns for this product using tolerant matching
    const prodObj = products.find((p: any) =>
      normalize(p.productName) === normalize(productName) ||
      normalize(p.id) === normalize(productName) ||
      normalize(p._id) === normalize(productName)
    );

    const productGunList = guns
      .filter((gun: any) => {
        const gProdName = normalize(gun.productName || gun.product || gun.productId);
        const gProdId = normalize(gun.productId || gun.product || gun.productName || gun.id || gun._id);
        const selName = normalize(productName);
        if (gProdName === selName) return true;
        if (prodObj && (gProdId === normalize(prodObj.id) || gProdId === normalize(prodObj._id) || gProdId === normalize(prodObj.productName))) return true;
        return false;
      })
      .map((gun: any) => gun.guns || gun.name || String(gun.id || gun._id || gun.serialNumber || ""));

    if (productGunList.length === 0) {
      // still add product (empty gun list) so UI shows selection
      setSelectedProducts((s) => [...s, productName]);
      setProductGuns((pg) => ({ ...pg, [productName]: [] }));
      return;
    }

    // add product with no guns selected by default
    setSelectedProducts((s) => [...s, productName]);
    setProductGuns((pg) => ({ ...pg, [productName]: [] }));
  };

  const toggleGunSelection = (productName: string, gunLabel: string) => {
    setProductGuns((pg) => {
      const list = pg[productName] || [];
      const isSel = list.includes(gunLabel);
      const next = { ...pg };
      if (isSel) {
        next[productName] = list.filter((g) => g !== gunLabel);
      } else {
        next[productName] = [...list, gunLabel];
      }
      return next;
    });
  };

  // Flattened list of guns available for currently selected products
  const filteredGuns = useMemo(() => {
    const labels = selectedProducts.flatMap((productName) => {
      const prodObj = products.find((p: any) =>
        normalize(p.productName) === normalize(productName) ||
        normalize(p.id) === normalize(productName) ||
        normalize(p._id) === normalize(productName)
      );

      return guns
        .filter((gun: any) => {
          const gProdName = normalize(gun.productName || gun.product || gun.productId);
          const gProdId = normalize(gun.productId || gun.product || gun.productName || gun.id || gun._id);
          const selName = normalize(productName);
          if (gProdName === selName) return true;
          if (prodObj && (gProdId === normalize(prodObj.id) || gProdId === normalize(prodObj._id) || gProdId === normalize(prodObj.productName))) return true;
          return false;
        })
        .map((gun: any) => gun.guns || gun.name || String(gun.id || gun._id || gun.serialNumber || ""));
    });
    return Array.from(new Set(labels));
  }, [selectedProducts, guns, products]);

  function openDeleteDutyDialog(duty: DailyDuty) {
    setDeletingDuty(duty);
    setDeleteDutyOpen(true);
  }

  function openViewDutyDialog(duty: DailyDuty) {
    setViewingDuty(duty);
    setViewDutyOpen(true);
  }

  function closeViewDutyDialog() {
    setViewingDuty(null);
    setViewDutyOpen(false);
  }

  async function handleUpdateDuty(e: React.FormEvent) {
    e.preventDefault();

    if (!editingDuty) return;

    if (!dailyDutyForm.empId) {
      setValidationErr("Employee is required");
      return;
    }
    if (selectedProducts.length === 0) {
      setValidationErr("At least one product is required");
      return;
    }
    
    const allGuns = selectedProducts.flatMap(product => productGuns[product] || []);
    
    if (allGuns.length === 0) {
      setValidationErr("At least one gun is required");
      return;
    }
    if (!dailyDutyForm.shiftStart || !dailyDutyForm.shiftEnd) {
      setValidationErr("Shift start and end times are required");
      return;
    }

    setValidationErr(null);
    
    const dutyDateFormatted = dayjs(dailyDutyForm.dutyDate).format("YYYY-MM-DD");

    // Build parallel arrays: each product-gun pair gets its own entry
    const parallelProductIds: string[] = [];
    const parallelGunIds: string[] = [];
    
    selectedProducts.forEach(productName => {
      const gunsForProduct = productGuns[productName] || [];
      gunsForProduct.forEach(gunName => {
        parallelProductIds.push(productName);
        parallelGunIds.push(gunName);
      });
    });

    updateDutyMutation.mutate({
      id: editingDuty.id,
      data: {
        organizationId: orgId,
        empId: dailyDutyForm.empId,
        dutyDate: dutyDateFormatted,
        productIds: parallelProductIds,
        gunIds: parallelGunIds,
        shiftStart: dailyDutyForm.shiftStart,
        shiftEnd: dailyDutyForm.shiftEnd,
        status: dailyDutyForm.status || "SCHEDULED"
      }
    });
  }

  async function handleDeleteDuty() {
    if (!deletingDuty) return;
    deleteDutyMutation.mutate(deletingDuty.id);
  }

  async function assignSpecialDuty(e: React.FormEvent) {
    e.preventDefault();
    if (!specialDutyForm.taskTitle || !specialDutyForm.assignedToEmpId || !specialDutyForm.priority) {
      toast({
        title: "Validation Error",
        description: "Title, priority, and assignee required.",
        variant: "destructive"
      });
      return;
    }
    createTaskMutation.mutate(specialDutyForm);
  }

  async function assignDailyDuty(e: React.FormEvent) {
    e.preventDefault();

    if (!dailyDutyForm.empId) {
      setValidationErr("Employee is required");
      return;
    }
    if (selectedProducts.length === 0) {
      setValidationErr("At least one product is required");
      return;
    }
    
    // Collect all guns from all selected products
    const allGuns = selectedProducts.flatMap(product => productGuns[product] || []);
    
    if (allGuns.length === 0) {
      setValidationErr("At least one gun is required");
      return;
    }
    if (!dailyDutyForm.shiftStart || !dailyDutyForm.shiftEnd) {
      setValidationErr("Shift start and end times are required");
      return;
    }

    setValidationErr(null);
    
    // Format date properly for backend (LocalDate expects YYYY-MM-DD)
    const dutyDateFormatted = dayjs(dailyDutyForm.dutyDate).format("YYYY-MM-DD");

    // Build parallel arrays: each product-gun pair gets its own entry
    const parallelProductIds: string[] = [];
    const parallelGunIds: string[] = [];
    
    selectedProducts.forEach(productName => {
      const gunsForProduct = productGuns[productName] || [];
      gunsForProduct.forEach(gunName => {
        parallelProductIds.push(productName);
        parallelGunIds.push(gunName);
      });
    });

    createDutyMutation.mutate({
      organizationId: orgId,
      empId: dailyDutyForm.empId,
      dutyDate: dutyDateFormatted,
      productIds: parallelProductIds,
      gunIds: parallelGunIds,
      shiftStart: dailyDutyForm.shiftStart,
      shiftEnd: dailyDutyForm.shiftEnd,
      status: dailyDutyForm.status || "SCHEDULED"
    });
  }
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Set Employee Duty</h1>
          <p className="text-muted-foreground">
            Assign special tasks or daily pump duties to team members
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current Time: {dayjs().format("DD MMM YYYY, hh:mm A")}
          </p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => navigate('/all-employee-tasks')}>
          <Eye className="mr-2 h-4 w-4" />
          View All Duties
        </Button>
      </div>

      {/* Stats Cards */}
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
                  <div className={`${stat.bgColor} p-2 rounded-lg shrink-0`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search Bar */}
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees by name, email, role..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Active Employees | Today's Duties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Employees */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle>Active Employees ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="text-muted-foreground">Loading employees…</div>}
            {!isLoading && (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filtered.map((emp: Employee) => {
                  const fullName = `${emp.firstName} ${emp.lastName}`;
                  return (
                    <div
                      key={emp.empId}
                      className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {emp.profileImageUrl ? (
                            <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                              {getUserInitials(fullName)}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm text-foreground truncate">{fullName}</h3>
                            <Badge className="shrink-0 text-xs">{emp.role}</Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1 min-w-0">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{emp.emailId}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{emp.phoneNumber || "—"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => openSpecialDutyDialog(emp)}
                        >
                          <Star className="mr-1 h-3 w-3" />
                          Special
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 h-8 text-xs"
                          onClick={() => openDailyDutyDialog(emp)}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Daily
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No employees match the current filter.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Assigned Duties */}
        <Card className="card-gradient border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Today's Duties ({todayDuties.length})</CardTitle>
              </div>
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                {dayjs().format("DD MMM")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todayDuties.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No duties assigned for today</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {todayDuties.map((duty: DailyDuty) => {
                  const emp = employees.find((e: Employee) => e.empId === duty.empId);
                  const fullName = emp ? `${emp.firstName} ${emp.lastName}` : duty.employeeName || duty.empId;
                  
                  return (
                    <div
                      key={duty.id}
                      className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border cursor-pointer"
                      onClick={() => openViewDutyDialog(duty)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 shrink-0">
                            {emp?.profileImageUrl ? (
                              <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                            ) : (
                              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                                {getUserInitials(fullName)}
                              </AvatarFallback>
                            )}
                          </Avatar>

                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-sm text-foreground">{fullName}</h3>
                              <Badge variant={duty.status === 'SCHEDULED' ? 'default' : 'secondary'} className="text-xs">
                                {duty.status}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{duty.shiftStart} - {duty.shiftEnd}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Fuel className="h-3 w-3 shrink-0" />
                                <span>{duty.productIds?.length || 0} Products, {duty.gunIds?.length || 0} Guns</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openViewDutyDialog(duty);
                            }}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDutyDialog(duty);
                            }}
                            className="h-8 w-8 p-0"
                            title="Edit Duty"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDutyDialog(duty);
                            }}
                            className="h-8 w-8 p-0"
                            title="Delete Duty"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SPECIAL DUTY MODAL */}
      {specialDutyOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setSpecialDutyOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setSpecialDutyOpen(false)} />
            <form className="flex flex-col gap-5 p-8 pt-6" onSubmit={assignSpecialDuty}>
              <div className="flex items-center gap-3 mb-2">
                {currentEmp && (
                  <Avatar className="h-10 w-10">
                    {currentEmp.profileImageUrl ? (
                      <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(`${currentEmp.firstName} ${currentEmp.lastName}`)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <h2 className="text-2xl font-bold">Special Duty - {currentEmp?.firstName} {currentEmp?.lastName}</h2>
              </div>

              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  required
                  value={specialDutyForm.taskTitle}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, taskTitle: e.target.value }))}
                  placeholder="e.g., Inventory Check"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={specialDutyForm.description}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Task details (optional)"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select
                    value={specialDutyForm.priority}
                    onValueChange={(value) => setSpecialDutyForm((f) => ({ ...f, priority: value as TaskCreate["priority"] }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className='z-[10000]'>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Input
                    value={specialDutyForm.shift}
                    placeholder="e.g., Morning"
                    onChange={(e) => setSpecialDutyForm((f) => ({ ...f, shift: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  required
                  min={getToday()}
                  value={specialDutyForm.dueDate}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <Button
                  type="button"
                  onClick={() => setSpecialDutyOpen(false)}
                  variant="outline"
                  disabled={createTaskMutation.isPending}
                  className="h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="btn-gradient-primary h-11"
                >
                  {createTaskMutation.isPending ? "Assigning..." : "Assign Special Duty"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY DUTY MODAL */}
      {/* DAILY DUTY MODAL - MODERNIZED WITH STICKY HEADER/FOOTER */}
      {dailyDutyOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDailyDutyOpen(false);
              setValidationErr(null);
            }
          }}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
              <PopupClose onClick={() => { setDailyDutyOpen(false); setValidationErr(null); }} />

              <div className="flex items-center gap-3 pr-12">
                {currentEmp && (
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    {currentEmp.profileImageUrl ? (
                      <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                        {getUserInitials(`${currentEmp.firstName} ${currentEmp.lastName}`)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-primary shrink-0" />
                    <h2 className="text-xl font-bold truncate">Daily Pump Duty</h2>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {currentEmp?.firstName} {currentEmp?.lastName} • {currentEmp?.empId}
                  </p>
                </div>
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <form onSubmit={assignDailyDuty} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Duty Date */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label htmlFor="dutyDate" className="font-semibold">Duty Date *</Label>
                  </div>
                  <Input
                    id="dutyDate"
                    type="date"
                    required
                    min={getToday()}
                    value={dailyDutyForm.dutyDate}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, dutyDate: e.target.value }))}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Minimum date: {dayjs().format("DD MMM YYYY")} 
                  </p>
                </div>

                {/* Products Section - Card Based */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      <Label className="font-semibold">Products *</Label>
                    </div>
                    {selectedProducts.length > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {selectedProducts.length} selected
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.length === 0 ? (
                      <div className="col-span-2 text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                        <Fuel className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No products available</p>
                      </div>
                    ) : (
                      products.map((product: any) => {
                        const isSelected = selectedProducts.includes(product.productName);
                        return (
                          <div
                            key={product.productName}
                            onClick={() => toggleProductSelection(product.productName)}
                            className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }
                      `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`}>
                                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{product.productName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.productType || 'Fuel Product'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedProducts.length === 0 && products.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Please select at least one product to continue</span>
                    </div>
                  )}
                </div>

                {/* Guns Section - Card Based */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <Label className="font-semibold">Guns *</Label>
                    </div>
                    {Object.values(productGuns).flat().length > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {Object.values(productGuns).flat().length} selected
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedProducts.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                        <Target className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Select products first to enable guns</p>
                      </div>
                    ) : (
                      selectedProducts.map(productName => {
                        const prodObj = products.find((p: any) =>
                          normalize(p.productName) === normalize(productName) ||
                          normalize(p.id) === normalize(productName) ||
                          normalize(p._id) === normalize(productName)
                        );

                        const productGunList = guns.filter((gun: any) => {
                          const gProdName = normalize(gun.productName || gun.product || gun.productId);
                          const gProdId = normalize(gun.productId || gun.product || gun.productName || gun.id || gun._id);
                          const selName = normalize(productName);
                          if (gProdName === selName) return true;
                          if (prodObj && (gProdId === normalize(prodObj.id) || gProdId === normalize(prodObj._id) || gProdId === normalize(prodObj.productName))) return true;
                          return false;
                        });
                        
                        if (productGunList.length === 0) return null;
                        
                        return (
                          <div key={productName} className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                              <Label className="text-sm font-medium text-muted-foreground">{productName}</Label>
                              {productGuns[productName]?.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {productGuns[productName].length} selected
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {productGunList.map((gun: any) => {
                                const gunLabel = gun.guns || gun.name || String(gun.id || gun._id || gun.serialNumber || '');
                                const isSelected = productGuns[productName]?.includes(gunLabel);
                                return (
                                  <div
                                    key={gunLabel}
                                    onClick={() => toggleGunSelection(productName, gunLabel)}
                                    className={`
                                      relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                      ${isSelected
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }
                                    `}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                      }`}>
                                        {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{gunLabel}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {gun.serialNumber || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {Object.values(productGuns).flat().length === 0 && filteredGuns.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Please select at least one gun to continue</span>
                    </div>
                  )}
                </div>

                {/* Shift Times */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <Label className="font-semibold">Shift Timing *</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shiftStart" className="text-xs text-muted-foreground">Start Time <span className="text-red-600">*</span></Label>
                      <Input
                        id="shiftStart"
                        type="time"
                        required
                        value={dailyDutyForm.shiftStart}
                        onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftStart: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shiftEnd" className="text-xs text-muted-foreground">End Time <span className="text-red-600">*</span></Label>
                      <Input
                        id="shiftEnd"
                        type="time"
                        required
                        value={dailyDutyForm.shiftEnd}
                        onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Error */}
                {validationErr && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-destructive">{validationErr}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY FOOTER */}
              <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setDailyDutyOpen(false);
                      setValidationErr(null);
                    }}
                    variant="outline"
                    disabled={createDutyMutation.isPending}
                    className="h-11 flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDutyMutation.isPending}
                    className="btn-gradient-primary h-11 flex-1 sm:flex-none"
                  >
                    {createDutyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Assign Daily Duty
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DUTY MODAL - Same structure as Daily Duty but for editing */}
      {editDutyOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditDutyOpen(false);
              setValidationErr(null);
            }
          }}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
              <PopupClose onClick={() => { setEditDutyOpen(false); setValidationErr(null); }} />

              <div className="flex items-center gap-3 pr-12">
                {currentEmp && (
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    {currentEmp.profileImageUrl ? (
                      <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                        {getUserInitials(`${currentEmp.firstName} ${currentEmp.lastName}`)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-primary shrink-0" />
                    <h2 className="text-xl font-bold truncate">Edit Daily Duty</h2>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {currentEmp?.firstName} {currentEmp?.lastName} • {currentEmp?.empId}
                  </p>
                </div>
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <form onSubmit={handleUpdateDuty} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Duty Date */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label htmlFor="editDutyDate" className="font-semibold">Duty Date *</Label>
                  </div>
                  <Input
                    id="editDutyDate"
                    type="date"
                    required
                    min={getToday()}
                    value={dailyDutyForm.dutyDate}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, dutyDate: e.target.value }))}
                    className="h-11"
                  />
                </div>

                {/* Products Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      <Label className="font-semibold">Products *</Label>
                    </div>
                    {selectedProducts.length > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {selectedProducts.length} selected
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((product: any) => {
                      const isSelected = selectedProducts.includes(product.productName);
                      return (
                        <div
                          key={product.productName}
                          onClick={() => toggleProductSelection(product.productName)}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">{product.productType || 'Fuel Product'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Guns Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <Label className="font-semibold">Guns *</Label>
                    </div>
                    {Object.values(productGuns).flat().length > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {Object.values(productGuns).flat().length} selected
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedProducts.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                        <Target className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Select products first to enable guns</p>
                      </div>
                    ) : (
                      selectedProducts.map(productName => {
                        const prodObj = products.find((p: any) =>
                          normalize(p.productName) === normalize(productName) ||
                          normalize(p.id) === normalize(productName) ||
                          normalize(p._id) === normalize(productName)
                        );

                        const productGunList = guns.filter((gun: any) => {
                          const gProdName = normalize(gun.productName || gun.product || gun.productId);
                          const gProdId = normalize(gun.productId || gun.product || gun.productName || gun.id || gun._id);
                          const selName = normalize(productName);
                          if (gProdName === selName) return true;
                          if (prodObj && (gProdId === normalize(prodObj.id) || gProdId === normalize(prodObj._id) || gProdId === normalize(prodObj.productName))) return true;
                          return false;
                        });
                        if (productGunList.length === 0) return null;

                        return (
                          <div key={productName} className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                              <Label className="text-sm font-medium text-muted-foreground">{productName}</Label>
                              {productGuns[productName]?.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{productGuns[productName].length} selected</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {productGunList.map((gun: any) => {
                                const gunLabel = gun.guns || gun.name || String(gun.id || gun._id || gun.serialNumber || '');
                                const isSelected = productGuns[productName]?.includes(gunLabel);
                                return (
                                  <div
                                    key={gunLabel}
                                    onClick={() => toggleGunSelection(productName, gunLabel)}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                        {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{gunLabel}</p>
                                        <p className="text-xs text-muted-foreground truncate">{gun.serialNumber || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Shift Times */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <Label className="font-semibold">Shift Timing *</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editShiftStart" className="text-xs text-muted-foreground">Start Time <span className="text-red-600">*</span></Label>
                      <Input
                        id="editShiftStart"
                        type="time"
                        required
                        value={dailyDutyForm.shiftStart}
                        onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftStart: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editShiftEnd" className="text-xs text-muted-foreground">End Time <span className="text-red-600">*</span></Label>
                      <Input
                        id="editShiftEnd"
                        type="time"
                        required
                        value={dailyDutyForm.shiftEnd}
                        onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Error */}
                {validationErr && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-destructive">{validationErr}</p>
                  </div>
                )}
              </div>

              {/* STICKY FOOTER */}
              <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditDutyOpen(false);
                      setValidationErr(null);
                    }}
                    variant="outline"
                    disabled={updateDutyMutation.isPending}
                    className="h-11 flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateDutyMutation.isPending}
                    className="btn-gradient-primary h-11 flex-1 sm:flex-none"
                  >
                    {updateDutyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Update Duty
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteDutyOpen && deletingDuty && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteDutyOpen(false);
              setDeletingDuty(null);
            }
          }}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => { setDeleteDutyOpen(false); setDeletingDuty(null); }} />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Delete Duty</h2>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">
                  Are you sure you want to delete this duty assignment?
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Employee:</strong> {deletingDuty.employeeName || deletingDuty.empId}</p>
                  <p><strong>Date:</strong> {dayjs(deletingDuty.dutyDate).format("DD MMM YYYY")}</p>
                  <p><strong>Shift:</strong> {deletingDuty.shiftStart} - {deletingDuty.shiftEnd}</p>
                  <p><strong>Products:</strong> {deletingDuty.productIds?.length || 0}</p>
                  <p><strong>Guns:</strong> {deletingDuty.gunIds?.length || 0}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setDeleteDutyOpen(false);
                    setDeletingDuty(null);
                  }}
                  variant="outline"
                  disabled={deleteDutyMutation.isPending}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteDuty}
                  disabled={deleteDutyMutation.isPending}
                  variant="destructive"
                  className="flex-1 h-11"
                >
                  {deleteDutyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Duty
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DUTY DETAIL MODAL */}
      {viewDutyOpen && viewingDuty && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeViewDutyDialog();
            }
          }}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border rounded-t-2xl">
              <PopupClose onClick={closeViewDutyDialog} />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 pr-10">
                  {(() => {
                    const emp = employees.find((e: Employee) => e.empId === viewingDuty.empId);
                    const fullName = emp ? `${emp.firstName} ${emp.lastName}` : viewingDuty.employeeName || viewingDuty.empId;
                    
                    return (
                      <>
                        <Avatar className="h-16 w-16 shrink-0">
                          {emp?.profileImageUrl ? (
                            <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                              {getUserInitials(fullName)}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
                            <p className="text-sm text-muted-foreground">Employee ID: {viewingDuty.empId}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={viewingDuty.status === 'SCHEDULED' ? 'default' : 'secondary'} className="text-sm">
                              {viewingDuty.status}
                            </Badge>
                            {emp?.role && (
                              <Badge variant="outline" className="text-sm">
                                {emp.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Duty Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Duty Date</p>
                      <p className="text-lg font-semibold">{dayjs(viewingDuty.dutyDate).format("DD MMM YYYY")}</p>
                    </div>
                  </div>
                </div>

                {/* Shift Time */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Shift Time</p>
                      <p className="text-lg font-semibold">{viewingDuty.shiftStart} - {viewingDuty.shiftEnd}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Assigned */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Assigned Products ({viewingDuty.productIds?.length || 0})</h3>
                </div>
                {viewingDuty.productIds && viewingDuty.productIds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewingDuty.productIds.map((productId, index) => {
                      const product = products.find((p: any) => p.productId === productId);
                      return (
                        <div key={index} className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-primary/20">
                              <Fuel className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{product?.productName || productId}</p>
                              <p className="text-xs text-muted-foreground">Product ID: {productId}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No products assigned</p>
                )}
              </div>

              {/* Guns Assigned */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Assigned Guns ({viewingDuty.gunIds?.length || 0})</h3>
                </div>
                {viewingDuty.gunIds && viewingDuty.gunIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingDuty.gunIds.map((gunId, index) => (
                      <Badge key={index} variant="outline" className="px-3 py-1.5 text-sm font-medium bg-blue-500/10 border-blue-500/30">
                        {gunId}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No guns assigned</p>
                )}
              </div>

              {/* Employee Contact Info (if available) */}
              {(() => {
                const emp = employees.find((e: Employee) => e.empId === viewingDuty.empId);
                if (emp && (emp.emailId || emp.phoneNumber)) {
                  return (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h3 className="text-lg font-semibold">Contact Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {emp.emailId && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium truncate">{emp.emailId}</p>
                            </div>
                          </div>
                        )}
                        {emp.phoneNumber && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{emp.phoneNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-background border-t border-border p-6 rounded-b-2xl">
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    closeViewDutyDialog();
                    openEditDutyDialog(viewingDuty);
                  }}
                  variant="outline"
                  className="flex-1 h-11"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Duty
                </Button>
                <Button
                  onClick={closeViewDutyDialog}
                  className="flex-1 h-11"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
