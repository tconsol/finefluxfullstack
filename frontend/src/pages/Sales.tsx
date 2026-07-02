import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { API_CONFIG } from "@/lib/api-config";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  CreditCard,
  Banknote,
  Clock,
  FileText,
  List,
  IndianRupee,
  Download,
  Loader2,
  Target,
  CheckCircle,
  Droplet,
  Smartphone,
  Wallet,
  AlertCircle,
  Fuel,
  User,
  ChevronLeft,
  ChevronRight,
  Layers,
  Trash2,
  X,
  Eye,
} from "lucide-react";
import PopupClose from "@/components/PopupClose";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const RUPEE = "\u20B9";
const SALES_PER_PAGE = 5;

type SaleMode = "single" | "batch";

const rangeForPreset = (
  preset: "today" | "week" | "month" | "custom"
): [dayjs.Dayjs, dayjs.Dayjs] => {
  const today = dayjs().startOf("day");
  switch (preset) {
    case "today":
      return [today, today];
    case "week":
      return [today.startOf("week"), today.endOf("week")];
    case "month":
      return [today.startOf("month"), today.endOf("month")];
    default:
      return [today, today];
  }
};

const initialFormState = {
  fuel: "",
  gun: "",
  openingStock: "",
  closingStock: "",
  saleLiters: "",
  price: "",
  salesInRupees: "",
  payment: "cash",
  cashReceived: "",
  phonePay: "",
  creditCard: "",
  shortCollections: "",
  testingTotal: "",
  saleDate: dayjs().format("YYYY-MM-DD"),
  saleTime: dayjs().format("HH:mm"),
};

type FormState = typeof initialFormState;

function entryKey(e: FormState) {
  return [
    e.fuel?.trim(),
    e.gun?.trim(),
    String(e.openingStock ?? ""),
    String(e.closingStock ?? ""),
    String(e.testingTotal ?? ""),
    String(e.price ?? ""),
    e.saleDate,
    e.saleTime,
  ].join("|");
}

export default function Sales() {
  const { user } = useAuth();
  const orgId = localStorage.getItem("organizationId");
  const empId = localStorage.getItem("empId");

  // Use role from AuthContext for proper role-based access control
  const userRole = (user?.role || "").toLowerCase();
  const isEmployee = userRole === "employee";
  const isOwner = userRole === "owner";
  const isManager = userRole === "manager";

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [saleMode, setSaleMode] = useState<SaleMode>("single");
  const [dsrOpen, setDsrOpen] = useState(false);
  const [dsrPreset, setDsrPreset] = useState<"today" | "week" | "month" | "custom">("today");
  const [[from, to], setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() =>
    rangeForPreset("today")
  );
  const [dsrRecords, setDsrRecords] = useState<any[]>([]);
  const [dsrLoading, setDsrLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [saleEntries, setSaleEntries] = useState<FormState[]>([]);
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const submittingRef = useRef(false);
  const isBatchRef = useRef(false);

  // Track submitted product-gun combinations to prevent duplicates before data refreshes (using ref for synchronous updates)
  const submittedSalesRef = useRef<Set<string>>(new Set());

  const [batchCollectionForm, setBatchCollectionForm] = useState({
    totalCash: "",
    totalUPI: "",
    totalCard: "",
  });

  // State for sale details popup
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Fetch collection data for the selected sale using saleId from the sale record
  const { data: saleCollections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: ["sale-collections", orgId, selectedSale?.saleId ?? selectedSale?.SaleId],
    queryFn: async () => {
      const saleId = selectedSale?.saleId ?? selectedSale?.SaleId;

      if (!saleId || !orgId) {
        return [];
      }

      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/collections/by-sale/${saleId}`;
      const response = await axios.get(url, { timeout: API_CONFIG.TIMEOUT });

      // Backend returns a single object, not an array, so wrap it in an array
      const data = response.data;
      return data ? [data] : [];
    },
    enabled: !!(selectedSale?.saleId ?? selectedSale?.SaleId) && !!orgId,
    staleTime: 0,
    retry: false,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () =>
      (await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`)).data || [],
  });

  const productsActive = useMemo(
    () => products.filter((p: any) => p.status === true),
    [products]
  );



  const { data: guns = [] } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () =>
      (await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/guninfo`)).data || [],
  });

  // Fetch employee duties to filter guns for employees
  const { data: employeeDuties = [] } = useQuery({
    queryKey: ["employee-duties", orgId, empId],
    queryFn: async () => {
      if (!isEmployee || !empId || !orgId) return [];
      try {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties/employee/${empId}`, { timeout: API_CONFIG.TIMEOUT });
        return res.data || [];
      } catch (error: any) {
        console.error("Failed to fetch employee duties:", error);
        // Return empty array instead of throwing error
        return [];
      }
    },
    enabled: isEmployee && !!empId && !!orgId,
    retry: false,
  });

  // Get active duties only
  const activeDuties = useMemo(() => {
    if (!isEmployee) return [];
    return employeeDuties.filter((d: any) =>
      d.status === "ACTIVE" || d.status === "active" || d.status === "ASSIGNED" || d.status === "assigned"
    );
  }, [isEmployee, employeeDuties]);

  // Build product-gun pairs from active duties
  const productGunPairs = useMemo(() => {
    const pairs: Array<{ productId: string; gunId: string; productName?: string; gunName?: string }> = [];

    activeDuties.forEach((duty: any) => {
      if (Array.isArray(duty.productIds) && Array.isArray(duty.gunIds)) {
        // productIds and gunIds are parallel arrays - index matches
        duty.productIds.forEach((productId: string, index: number) => {
          const gunId = duty.gunIds[index];
          if (gunId) {
            pairs.push({ productId, gunId });
          }
        });
      }
    });

    return pairs;
  }, [activeDuties]);

  // Filter products based on employee's active duties
  const availableProductsForEmployee = useMemo(() => {
    if (!isEmployee) return productsActive;

    // If no active duties, don't allow any product selection
    if (productGunPairs.length === 0) {
      return [];
    }

    // Get unique assigned product IDs (which might be names or IDs)
    const assignedProductIds = new Set(productGunPairs.map(p => p.productId));

    // Filter products - check both id and productName
    return productsActive.filter((p: any) =>
      assignedProductIds.has(p.id) || assignedProductIds.has(p.productName)
    );
  }, [isEmployee, productsActive, productGunPairs]);

  // Filter guns based on selected product and employee's active duties
  // Helper to find guns for a given product identifier (name or id) with permissive matching
  const findGunsForProduct = (productValue?: string) => {
    if (!productValue) return [];
    const pv = String(productValue).trim().toLowerCase();

    // Try to resolve selected product from products list
    const selectedProduct = products.find((p: any) => {
      const pid = String(p.id || "").trim().toLowerCase();
      const pname = String(p.productName || "").trim().toLowerCase();
      return pid === pv || pname === pv;
    });

    return Array.from(
      new Map(
        guns.filter((g: any) => {
          const gProductName = String(g.productName || "").trim().toLowerCase();
          const gProductId = String(g.productId || "").trim().toLowerCase();
          // Match by gun.productName or gun.productId or resolved selectedProduct id/name
          if (gProductName === pv) return true;
          if (gProductId === pv) return true;
          if (selectedProduct) {
            const selId = String(selectedProduct.id || "").trim().toLowerCase();
            const selName = String(selectedProduct.productName || "").trim().toLowerCase();
            if (gProductName === selName) return true;
            if (gProductId === selId) return true;
          }
          return false;
        }).map((g: any) => [g.guns, g])
      ).values()
    );
  };

  const availableGunsForEmployee = useMemo(() => {
    if (!isEmployee) {
      // For non-employees, show all guns for selected product
      return findGunsForProduct(form.fuel);
    }
    
    // For employees, only show guns they're assigned to for the selected product
    if (!form.fuel) return [];
    
    const allGunsForProduct = findGunsForProduct(form.fuel);
    
    // If no active duties, no guns available
    if (productGunPairs.length === 0) {
      return [];
    }
    
    // Get assigned gun IDs for this product
    const assignedGunIds = new Set(
      productGunPairs
        .filter(pair => {
          // Match by product ID or product name
          const pv = String(form.fuel).trim().toLowerCase();
          const pid = String(pair.productId || "").trim().toLowerCase();
          return pid === pv;
        })
        .map(pair => String(pair.gunId || "").trim().toLowerCase())
    );
    
    
    
    // Filter guns to only show assigned ones
    const filtered = allGunsForProduct.filter((g: any) => {
      const gunId = String(g.id || g._id || "").trim().toLowerCase();
      const gunName = String(g.guns || "").trim().toLowerCase();
      
      // Check if this gun is in the assigned list (by ID or name)
      const matches = assignedGunIds.has(gunId) || assignedGunIds.has(gunName);
      return matches;
    });
    
    return filtered;
  }, [isEmployee, guns, form.fuel, products, productGunPairs]);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sales`);
      return response.data || [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });



  const { data: collections = [] } = useQuery({
    queryKey: ["collections", orgId],
    queryFn: async () => {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/collections`);
      return response.data || [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Helper functions to access properties - try both camelCase and PascalCase
  const getProp = (obj: any, key: string) => {
    if (!obj) return undefined;
    // Try camelCase first, then PascalCase
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    return obj[camelKey] ?? obj[pascalKey] ?? obj[key];
  };

  const getAnyId = (obj: any) => {
    if (!obj) return undefined;
    return obj.saleId ?? obj.SaleId ?? obj.id ?? obj.Id ?? obj._id;
  };

  const filteredGuns = useMemo(
    () => {
      if (!form.fuel) return [];

      if (isEmployee) {
        // For employees, use the already filtered and deduplicated guns
        return availableGunsForEmployee;
      } else {
        // For non-employees, use the permissive finder as well
        return findGunsForProduct(form.fuel);
      }
    },
    [form.fuel, isEmployee, availableGunsForEmployee, guns]
  );

  // Auto-fill opening stock and price only when gun or fuel selection changes
  const prevGunRef = useRef(form.gun);
  const prevFuelRef = useRef(form.fuel);
  
  useEffect(() => {
    const gunChanged = prevGunRef.current !== form.gun;
    const fuelChanged = prevFuelRef.current !== form.fuel;
    
    if (!gunChanged && !fuelChanged) return;
    
    prevGunRef.current = form.gun;
    prevFuelRef.current = form.fuel;

    const updates: Partial<FormState> = {};

    if (gunChanged && form.gun) {
      const gunObj = filteredGuns.find((g: any) => g.guns === form.gun);
      if (gunObj && typeof (gunObj as any).currentReading !== "undefined") {
        updates.openingStock = (gunObj as any).currentReading;
      }
    }
    
    if (fuelChanged && form.fuel) {
      const prod = products.find((p: any) => p.productName === form.fuel);
      if (prod && typeof prod.price !== "undefined") {
        updates.price = prod.price;
      }
    }

    if (Object.keys(updates).length > 0) {
      setForm((prev) => ({ ...prev, ...updates }));
    }
  }, [form.gun, form.fuel, products, filteredGuns]);

  // Calculate sale liters, amount, and short collections (combined to prevent race conditions)
  useEffect(() => {
    const open = Number(form.openingStock) || 0;
    const close = Number(form.closingStock) || 0;
    const testing = Number(form.testingTotal) || 0;
    const pricePerLiter = Number(form.price) || 0;

    const grossSale = close > open ? close - open : 0;
    const netSale = Math.max(0, grossSale - testing);
    const salesAmount = Math.round(netSale * pricePerLiter * 100) / 100;

    // Validate net sale doesn't exceed current stock value from inventory
    if (netSale > 0 && form.fuel) {
      const selectedProduct = products.find((p: any) => p.productName === form.fuel);
      const currentStockLevel = Number(selectedProduct?.currentLevel || 0);

      if (currentStockLevel > 0 && netSale > currentStockLevel) {
        setValidationError({
          title: "⚠️ Net Sale Exceeds Current Stock",
          message: `Net sale (${netSale.toLocaleString()}L) cannot exceed the current stock level of ${currentStockLevel.toLocaleString()}L for ${form.fuel}. Please verify your closing stock reading.`
        });
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }

    // Calculate short collections
    let shortCollections = "";
    if (saleMode !== "batch" && salesAmount > 0) {
      const cash = Number(form.cashReceived) || 0;
      const upi = Number(form.phonePay) || 0;
      const card = Number(form.creditCard) || 0;
      const totalReceived = cash + upi + card;
      const short = Math.max(0, Math.round((salesAmount - totalReceived) * 100) / 100);
      shortCollections = short.toFixed(2);
    }

    // Single state update with all calculated fields
    setForm((f) => ({
      ...f,
      saleLiters: netSale > 0 ? netSale.toFixed(3) : "",
      salesInRupees: salesAmount > 0 ? salesAmount.toFixed(2) : "",
      shortCollections: shortCollections,
    }));
  }, [
    form.closingStock,
    form.openingStock,
    form.price,
    form.testingTotal,
    form.fuel,
    form.cashReceived,
    form.phonePay,
    form.creditCard,
    products,
    saleMode
  ]);


  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<any>(null);
  const [validationError, setValidationError] = useState<{ title: string; message: string } | null>(null);
  const deleteSaleMutation = useMutation({
    mutationFn: async (mongoId: string) => {
      // Use MongoDB ID for deletion
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sales/${mongoId}`;

      const response = await axios.delete(url, {
        headers: {
          "X-Employee-Id": empId,
        },
        timeout: API_CONFIG.TIMEOUT,
      });
      return response.data;
    },
    onSuccess: () => {
      setDeleteSaleId(null);

      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
      queryClient.invalidateQueries({ queryKey: ["collections", orgId] });
      // Also refresh sale-history so SalesHistory page reflects deletes
      queryClient.invalidateQueries({ queryKey: ["sale-history", orgId] });
      queryClient.refetchQueries({ queryKey: ["sale-history", orgId] });
      queryClient.refetchQueries({ queryKey: ["sales", orgId] });

      // If backend didn't write a sale-history entry, inject a conservative synthetic delete record
      try {
        if (deleteSaleTarget) {
          const nowIso = dayjs().format("YYYY-MM-DDTHH:mm:ss");
          const synthetic = {
            id: `local-delete-${Date.now()}`,
            saleId: getAnyId(deleteSaleTarget) || undefined,
            dateTime: nowIso,
            productName: getProp(deleteSaleTarget, 'productName') || getProp(deleteSaleTarget, 'fuel') || undefined,
            guns: getProp(deleteSaleTarget, 'guns') || undefined,
            salesInLiters: Number(getProp(deleteSaleTarget, 'salesInLiters')) || 0,
            testingTotal: Number(getProp(deleteSaleTarget, 'testingTotal')) || 0,
            empId: getProp(deleteSaleTarget, 'empId') || empId,
            salesInRupees: Number(getProp(deleteSaleTarget, 'salesInRupees')) || 0,
            cashReceived: Number(getProp(deleteSaleTarget, 'cashReceived')) || 0,
            phonePay: Number(getProp(deleteSaleTarget, 'phonePay')) || 0,
            creditCard: Number(getProp(deleteSaleTarget, 'creditCard')) || 0,
            shortCollections: Number(getProp(deleteSaleTarget, 'shortCollections')) || 0,
            receivedTotal: Number(getProp(deleteSaleTarget, 'receivedTotal')) || 0,
            mutationby: 'sale_delete',
            _local: true,
          };

          // Find any cached sale-history queries and prepend the synthetic record
          const queries = queryClient.getQueriesData({});
          for (const [key, data] of queries) {
            try {
              if (Array.isArray(key) && key[0] === 'sale-history' && key[1] === orgId) {
                queryClient.setQueryData(key as any, (old: any) => {
                  if (!Array.isArray(old)) return [synthetic];
                  // Avoid duplicating if backend already returned a matching delete entry
                  const exists = old.some((r: any) => r.mutationby === 'sale_delete' && (r.saleId && synthetic.saleId ? r.saleId === synthetic.saleId : false));
                  if (exists) return old;
                  return [synthetic, ...old];
                });
              }
            } catch (e) {
              // ignore per-query errors
            }
          }
        }
      } catch (e) {
      
      } finally {
        setDeleteSaleTarget(null);
      }

      toast({
        title: "✅ Deleted Successfully",
        description: "Sale entry has been deleted.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete sale entry.";
      toast({
        title: "❌ Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const saleCollectionMutation = useMutation({
    mutationFn: async (input: FormState) => {
      // Use manual date/time if provided, otherwise use current time
      const manualDateTime = dayjs(`${input.saleDate}T${input.saleTime}`).format("YYYY-MM-DDTHH:mm:ss");
      const localDateTime = manualDateTime || dayjs().format("YYYY-MM-DDTHH:mm:ss");

      const saleDTO = {
        organizationId: orgId,
        empId,
        productName: input.fuel,
        guns: input.gun,
        openingStock: Number(input.openingStock),
        closingStock: Number(input.closingStock),
        testingTotal: Number(input.testingTotal) || 0,
        price: Number(input.price),
        salesInLiters: Number(input.saleLiters) || 0,
        salesInRupees: Number(input.salesInRupees) || 0,
        dateTime: localDateTime,
      };

      const collectionDTO = {
        organizationId: orgId,
        empId,
        productName: input.fuel,
        guns: input.gun,
        price: Number(input.price),
        dateTime: localDateTime,
        cashReceived: Number(input.cashReceived) || 0,
        phonePay: Number(input.phonePay) || 0,
        creditCard: Number(input.creditCard) || 0,
      };


      try {
        const saleResponse = await axios.post(
          `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sales`,
          saleDTO,
          { timeout: API_CONFIG.TIMEOUT }
        );

        const collectionResponse = await axios.post(
          `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/collections`,
          collectionDTO,
          { timeout: API_CONFIG.TIMEOUT }
        );

        return { success: true };
      } catch (error: any) {
        console.error("❌ Sale/Collection Error:", error);

        let errorMessage = "Unable to process your sale request. Please check all fields and try again.";
        let errorTitle = "Sale Recording Failed";

        // Simple error handling with our own messages
        if (error.response?.status === 500) {
          errorTitle = "Server Error";
          errorMessage = "An error occurred while saving your sale. Please verify all information is correct and try again.";
        } else if (error.response?.status === 400) {
          errorTitle = "Invalid Data";
          errorMessage = "Please check that all required fields are filled correctly and try again.";
        } else if (error.response?.status === 404) {
          errorTitle = "Not Found";
          errorMessage = "Required resource not found. Please refresh the page and try again.";
        } else if (error.message === "Network Error") {
          errorTitle = "Network Error";
          errorMessage = "Cannot connect to the server. Please check your internet connection.";
        }

        throw new Error(`${errorTitle}|${errorMessage}`);
      }
    },
    onSuccess: () => {

      // Invalidate and refetch queries immediately
      queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
      queryClient.invalidateQueries({ queryKey: ["collections", orgId] });
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });

      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["sales", orgId] }).then(() => {
        // Clear submitted sales tracking after data is refreshed
        submittedSalesRef.current.clear();
      });
      queryClient.refetchQueries({ queryKey: ["collections", orgId] });

      if (!isBatchRef.current) {
        setForm(initialFormState);
        toast({
          title: "✅ Success",
          description: "Sale & Collection recorded successfully!",
          variant: "default"
        });
      }
    },
    onError: (error: any) => {
      console.error("❌ Mutation Error:", error);

      // Parse enhanced error message
      let title = "Failed to Record Sale";
      let description = "Please check your input and try again.";

      if (error.message && error.message.includes("|")) {
        const [errorTitle, errorMessage] = error.message.split("|");
        title = errorTitle;
        description = errorMessage;
      } else if (error.message) {
        description = error.message;
      }

      toast({
        title,
        description,
        variant: "destructive"
      });
    },
  });

  function isFormValid(f: FormState, skipCollectionCheck: boolean = false) {
    const { fuel, price, gun, openingStock, closingStock, testingTotal, saleLiters, shortCollections } = f;

    if (!fuel || !gun || price === "") {
      setValidationError({
        title: "Missing Information",
        message: "Please select product and gun before proceeding."
      });
      return false;
    }

    if (openingStock === "" || closingStock === "") {
      setValidationError({
        title: "Missing Stock Information",
        message: "Please fill in the closing stock value."
      });
      return false;
    }

    const openNum = Number(openingStock), closeNum = Number(closingStock), testingNum = Number(testingTotal) || 0;

    if (isNaN(openNum) || isNaN(closeNum) || closeNum <= openNum) {
      setValidationError({
        title: "Invalid Closing Stock",
        message: "Closing stock must be greater than opening stock."
      });
      return false;
    }

    const gross = closeNum - openNum;
    if (testingNum < 0 || testingNum > gross) {
      setValidationError({
        title: "Invalid Testing Value",
        message: "Testing liters must be between 0 and gross liters."
      });
      return false;
    }

    const net = gross - testingNum;

    // Validate net sale doesn't exceed current stock
    if (net > 0 && fuel) {
      const selectedProduct = products.find((p: any) => p.productName === fuel);
      const currentStockLevel = Number(selectedProduct?.currentLevel || 0);

      if (currentStockLevel > 0 && net > currentStockLevel) {
        setValidationError({
          title: "⚠️ Net Sale Exceeds Current Stock",
          message: `Net sale (${net.toLocaleString()}L) cannot exceed the current stock level of ${currentStockLevel.toLocaleString()}L for ${fuel}. Please verify your closing stock reading.`
        });
        return false;
      }
    }

    // Point 8: Allow net sale 0 when testing data is entered (no business day)
    if (net === 0 && testingNum > 0) {
      // Valid case: testing only, no actual sales
      return skipCollectionCheck ? true : true;
    }

    if (net < 0) {
      setValidationError({
        title: "Invalid Net Sale",
        message: "Net sale liters cannot be negative."
      });
      return false;
    }

    if (skipCollectionCheck) return true;

    const short = Number(shortCollections) || 0;
    if (short > 10) {
      setValidationError({
        title: "Short Collection Too High",
        message: `Short collection is ₹${short.toFixed(2)}. Maximum allowed is ₹10.`
      });
      return false;
    }
    if (short < 0) {
      setValidationError({
        title: "Invalid Short Collection",
        message: "Short collection cannot be negative."
      });
      return false;
    }
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!isFormValid(form, false)) return;
    if (saleMode === "batch") {
      toast({ title: "Batch mode is active", description: "Use Show Summary & Submit.", variant: "destructive" });
      return;
    }

    submittingRef.current = true;
    isBatchRef.current = false;

    try {
      await saleCollectionMutation.mutateAsync(form);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      submittingRef.current = false;
    }
  };

  const handleAddAnotherSale = () => {
    if (!isFormValid(form, true)) return;

    // Prevent duplicate product+gun entries in the same batch
    const duplicate = saleEntries.some((entry) => entry.fuel === form.fuel && entry.gun === form.gun);
    if (duplicate) {
      toast({
        title: "Duplicate Entry Blocked",
        description: `Product \"${form.fuel}\" with Gun \"${form.gun}\" is already added to this batch.`,
        variant: "destructive",
      });
      return;
    }

    setSaleEntries((prev) => [...prev, { ...form, cashReceived: "", phonePay: "", creditCard: "", shortCollections: "" }]);
    toast({
      title: "✓ Added to Batch",
      description: `${form.fuel} - Gun ${form.gun} added successfully`,
      duration: 2000
    });
    setForm(initialFormState);
  };

  const handleShowBatchSummary = () => {
    if (form.fuel && isFormValid(form, true)) {
      // Prevent duplicate product+gun entries in the same batch
      const duplicate = saleEntries.some((entry) => entry.fuel === form.fuel && entry.gun === form.gun);
      if (duplicate) {
        toast({
          title: "Duplicate Entry Blocked",
          description: `Product \"${form.fuel}\" with Gun \"${form.gun}\" is already added to this batch.`,
          variant: "destructive",
        });
        setShowSummaryPopup(true);
        return;
      }

      setSaleEntries((prev) => [...prev, { ...form, cashReceived: "", phonePay: "", creditCard: "", shortCollections: "" }]);
      toast({
        title: "✓ Added to Batch",
        description: `${form.fuel} - Gun ${form.gun} added successfully`,
        duration: 2000
      });
      setForm(initialFormState);
      setTimeout(() => setShowSummaryPopup(true), 50);
    } else {
      setShowSummaryPopup(true);
    }
  };

  const handleBatchSubmit = async () => {
    if (saleEntries.length === 0) return;

    const totalCash = Number(batchCollectionForm.totalCash) || 0;
    const totalUPI = Number(batchCollectionForm.totalUPI) || 0;
    const totalCard = Number(batchCollectionForm.totalCard) || 0;
    const totalReceived = totalCash + totalUPI + totalCard;
    const totalExpected = saleEntries.reduce((sum, e) => sum + Number(e.salesInRupees || 0), 0);
    const short = Math.max(0, totalExpected - totalReceived);

    if (short > 10) {
      toast({
        title: "Short collection too high!",
        description: `Total short is ₹${short.toFixed(2)}. Maximum allowed is ₹10.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingBatch(true);
    isBatchRef.current = true;

    try {
      const entriesWithCollections = saleEntries.map((entry) => {
        const proportion = Number(entry.salesInRupees) / totalExpected;
        return {
          ...entry,
          cashReceived: (totalCash * proportion).toFixed(2),
          phonePay: (totalUPI * proportion).toFixed(2),
          creditCard: (totalCard * proportion).toFixed(2),
        };
      });

      for (const entry of entriesWithCollections) {
        await saleCollectionMutation.mutateAsync(entry);
      }

      setSaleEntries([]);
      setShowSummaryPopup(false);
      setBatchCollectionForm({ totalCash: "", totalUPI: "", totalCard: "" });
      toast({ title: `${saleEntries.length} sales recorded successfully!`, variant: "default" });
    } catch (e) {
      toast({ title: "Batch submit failed", variant: "destructive" });
    } finally {
      isBatchRef.current = false;
      setIsSubmittingBatch(false);
    }
  };

  function getBatchSummary(entries: FormState[]) {
    const productWise: Record<string, number> = {};
    let totalExpected = 0;
    entries.forEach((entry) => {
      productWise[entry.fuel] = (productWise[entry.fuel] || 0) + Number(entry.saleLiters || 0);
      totalExpected += Number(entry.salesInRupees || 0);
    });
    const totalCash = Number(batchCollectionForm.totalCash) || 0;
    const totalUPI = Number(batchCollectionForm.totalUPI) || 0;
    const totalCard = Number(batchCollectionForm.totalCard) || 0;
    const totalReceived = totalCash + totalUPI + totalCard;
    const short = Math.max(0, totalExpected - totalReceived);
    return { productWise, totalExpected, totalCash, totalUPI, totalCard, totalReceived, short };
  }

  const openDsrDialog = () => {
    setDsrPreset("today");
    setDateRange(rangeForPreset("today"));
    setDsrRecords([]);
    setDsrOpen(true);
  };

  const fetchDSRRecords = async () => {
    setDsrLoading(true);
    try {
      const fromIso = from.startOf("day").toISOString();
      const toIso = to.endOf("day").toISOString();
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sale-history/by-date?from=${fromIso}&to=${toIso}`;
      const res = await axios.get(url);
      const items = Array.isArray(res.data) ? res.data : [];
      setDsrRecords(items);
    } catch {
      setDsrRecords([]);
      toast({ title: "Failed to load DSR records!", variant: "destructive" });
    }
    setDsrLoading(false);
  };

  const downloadDSRcsv = () => {
    if (!dsrRecords.length) return;
    const csv = [
      "Date,Product,Gun,Operator,Testing(Ltrs),Liters,Sale(₹),Cash,UPI,Card,Short,Received",
      ...dsrRecords.map((r: any) =>
        [dayjs(r.dateTime).format("DD-MM-YYYY"), r.productName, r.guns, r.empId, r.testingTotal || 0, r.salesInLiters, r.salesInRupees, r.cashReceived, r.phonePay, r.creditCard, r.shortCollections, r.receivedTotal].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DSR_${from.format("DD-MM-YYYY")}_to_${to.format("DD-MM-YYYY")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadDSRpdf = () => {
    if (!dsrRecords.length) return;
    const doc = new jsPDF();
    doc.text(`DSR Report (${from.format("DD-MM-YYYY")} to ${to.format("DD-MM-YYYY")})`, 14, 12);
    autoTable(doc, {
      startY: 18,
      head: [["Date", "Product", "Gun", "Operator", "Testing(Ltrs)", "Liters", "Sale(₹)", "Cash", "UPI", "Card", "Short", "Received"]],
      body: dsrRecords.map((r: any) => [dayjs(r.dateTime).format("DD-MM-YYYY"), r.productName, r.guns, r.empId, r.testingTotal || 0, r.salesInLiters, r.salesInRupees, r.cashReceived, r.phonePay, r.creditCard, r.shortCollections, r.receivedTotal]),
    });
    doc.save(`DSR_${from.format("DD-MM-YYYY")}_to_${to.format("DD-MM-YYYY")}.pdf`);
  };

  useEffect(() => {
    if (dsrOpen) {
      setDateRange(rangeForPreset(dsrPreset));
      setDsrRecords([]);
    }
  }, [dsrPreset, dsrOpen]);

  useEffect(() => {
    if (dsrPreset === "custom") setDsrRecords([]);
  }, [from, to, dsrPreset]);

  const closeDsrDialog = () => {
    setDsrOpen(false);
    setDsrRecords([]);
    setDsrLoading(false);
  };

  // Helper function to check if a date is today (backend handles timezone)
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const date = dayjs(dateString);
    const today = dayjs();
    return date.isSame(today, 'day');
  };

  const todaySalesRaw = useMemo(() => {
    const filtered = sales.filter((s: any) => isToday(getProp(s, 'dateTime'))).slice().reverse();
    return filtered;
  }, [sales, userRole, orgId, empId]);

  const todaysCollections = useMemo(() =>
    collections.filter((c: any) => isToday(getProp(c, 'dateTime'))),
    [collections]
  );

  // Collections that match the selected sale (used in sale details popup)
  const matchingCollectionsForSelectedSale = useMemo(() => {
    if (!selectedSale) return [];
    try {
      const saleId = getAnyId(selectedSale);
      if (saleId) {
        return collections.filter((c: any) => {
          const colSaleId = getAnyId(c);
          return colSaleId && String(colSaleId) === String(saleId);
        });
      }
      // If sale id not present, return empty (we only match by sale id as requested)
      return [];
    } catch (e) {
      return [];
    }
  }, [selectedSale, collections]);

  const collectionSummary = useMemo(() => {
    let cash = 0, upi = 0, card = 0, short = 0;
    todaysCollections.forEach((col: any) => {
      cash += Number(getProp(col, 'cashReceived')) || 0;
      upi += Number(getProp(col, 'phonePay')) || 0;
      card += Number(getProp(col, 'creditCard')) || 0;
      short += Number(getProp(col, 'shortCollections')) || 0;
    });
    const received = cash + upi + card;
    let expected = 0;
    todaySalesRaw.forEach((sale: any) => {
      expected += Number(getProp(sale, 'salesInRupees')) || 0;
    });

    // Point 6: Calculate excess collections (only for owner)
    const excess = Math.max(0, received - expected);

    return { cash, upi, card, short, received, expected, excess };
  }, [todaysCollections, todaySalesRaw]);

  const summary = useMemo(() => {
    const productMap: Record<string, number> = {};
    todaySalesRaw.forEach((sale: any) => {
      const prod = getProp(sale, 'productName') || "Other";
      productMap[prod] = (productMap[prod] || 0) + (Number(getProp(sale, 'salesInRupees')) || 0);
    });
    const outProducts = Object.entries(productMap).map(([k, v]) => ({ name: k, value: v }));
    return { products: outProducts };
  }, [todaySalesRaw]);

  const totalPages = Math.ceil(todaySalesRaw.length / SALES_PER_PAGE);
  const todaySales = useMemo(() => todaySalesRaw.slice((currentPage - 1) * SALES_PER_PAGE, currentPage * SALES_PER_PAGE), [todaySalesRaw, currentPage]);
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const renderBatchSummaryDialog = () => {
    const summary = getBatchSummary(saleEntries);
    return (
      <Dialog open={showSummaryPopup} onOpenChange={(open) => setShowSummaryPopup(open)}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-3xl max-h-[85vh] overflow-hidden p-0">
          <div className="flex flex-col max-h-[85vh]">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Fuel className="h-5 w-5 text-primary" />
                Sales Batch Summary
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                Review product-wise sales and enter the total payment collections received
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Total Entries: {saleEntries.length}
                </h4>

                <div className="space-y-2">
                  <h5 className="font-semibold text-sm text-muted-foreground">Product-wise Sale (Net Liters)</h5>
                  {Object.entries(summary.productWise).length === 0 && (
                    <p className="text-muted-foreground italic text-sm">No sales added yet.</p>
                  )}
                  {Object.entries(summary.productWise).map(([prod, liters]) => (
                    <div key={prod} className="flex justify-between px-4 py-2 rounded-lg bg-muted/50 border">
                      <span className="font-semibold flex items-center gap-2">
                        <Droplet className="h-4 w-4 text-primary" />
                        {prod}
                      </span>
                      <span className="font-mono">{String(liters)} Ltrs</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Expected Sale:</span>
                  <span className="text-xl font-bold text-primary">{RUPEE}{summary.totalExpected.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Enter Total Collections Received
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      Total Cash
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={batchCollectionForm.totalCash}
                      onChange={(e) => setBatchCollectionForm(f => ({ ...f, totalCash: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-indigo-600" />
                      Total UPI
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={batchCollectionForm.totalUPI}
                      onChange={(e) => setBatchCollectionForm(f => ({ ...f, totalUPI: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      Total Card
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={batchCollectionForm.totalCard}
                      onChange={(e) => setBatchCollectionForm(f => ({ ...f, totalCard: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div className="flex justify-between p-3 rounded-lg bg-background">
                    <span className="text-sm font-medium">Total Received:</span>
                    <span className="font-bold">{RUPEE}{summary.totalReceived.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between p-3 rounded-lg ${summary.short > 10 ? 'bg-destructive/10 border border-destructive/20' : 'bg-background'}`}>
                    <span className="text-sm font-medium">Short Collection:</span>
                    <span className={`font-bold ${summary.short > 10 ? 'text-destructive' : ''}`}>
                      {RUPEE}{summary.short.toFixed(2)}
                    </span>
                  </div>
                </div>

                {summary.short > 10 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Short collection exceeds ₹10 limit! Please verify your collections.</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Collections will be <strong>automatically distributed proportionally</strong> across all products based on their sale amounts.
                </p>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowSummaryPopup(false)}
                  disabled={isSubmittingBatch}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleBatchSubmit}
                  disabled={saleEntries.length === 0 || isSubmittingBatch || summary.short > 10}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {isSubmittingBatch ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit {saleEntries.length} Sales</>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
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

      {renderBatchSummaryDialog()}

      {/* DSR Dialog */}
      <Dialog open={dsrOpen} onOpenChange={(open) => { if (!open) closeDsrDialog(); }}>
        <DialogContent className="sm:max-w-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Download DSR Report
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
            {/* DSR controls: preset, custom date range, load and export buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Select value={dsrPreset} onValueChange={(val) => { setDsrPreset(val as any); setDateRange(rangeForPreset(val as any)); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dsrPreset === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={from.format("YYYY-MM-DD")}
                    onChange={(e) => setDateRange([dayjs(e.target.value), to])}
                  />
                  <Input
                    type="date"
                    value={to.format("YYYY-MM-DD")}
                    onChange={(e) => setDateRange([from, dayjs(e.target.value)])}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button onClick={fetchDSRRecords} disabled={dsrLoading} className="flex items-center gap-2">
                  {dsrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Load Records
                </Button>
                <Button variant="outline" onClick={downloadDSRcsv} disabled={!dsrRecords.length} className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-sm text-muted-foreground">
                {dsrRecords.length > 0 ? `${dsrRecords.length} records loaded for ${from.format("DD-MM-YYYY")} → ${to.format("DD-MM-YYYY")}` : "No records loaded"}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <Button variant="outline" onClick={() => { setDsrRecords([]); setDsrLoading(false); }}>
                  Clear
                </Button>
                <Button onClick={downloadDSRcsv} disabled={!dsrRecords.length} className="hidden sm:inline-flex">
                  <Download className="mr-2 h-4 w-4" />CSV
                </Button>
              </div>
              <Button className="flex-1 sm:flex-auto" onClick={downloadDSRpdf} disabled={!dsrRecords.length}><Download className="mr-2 h-4 w-4" />PDF</Button>
            </DialogFooter>
            {dsrRecords.length === 0 && !dsrLoading && (
              <span className="text-xs text-muted-foreground italic text-center">No records loaded. Set range and click "Load Records" first.</span>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={closeDsrDialog} className="w-full sm:w-auto sm:ml-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales & Collections</h1>
          <p className="text-muted-foreground">Record sales and track daily collections</p>
        </div>
        {/* Point 2: Hide DSR and Sales History buttons for employees */}
        {!isEmployee && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openDsrDialog}><FileText className="mr-2 h-4 w-4" />Generate DSR</Button>
            <Button variant="secondary" onClick={() => navigate("/sales-history")}><List className="mr-2 h-4 w-4" />View Sales History</Button>
          </div>
        )}
      </div>

      {/* Point 1: Collections Overview - Hidden for employees */}
      {!isEmployee && (
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-primary/10"><Banknote className="h-4 w-4 text-primary" /></div>
              Collections Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <Wallet className="h-5 w-5 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">Cash</Badge>
                  </div>
                  <p className="text-xs opacity-90 mb-0.5">Cash Collected</p>
                  <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.cash.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <Smartphone className="h-5 w-5 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">UPI</Badge>
                  </div>
                  <p className="text-xs opacity-90 mb-0.5">UPI Payments</p>
                  <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.upi.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard className="h-5 w-5 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">Card</Badge>
                  </div>
                  <p className="text-xs opacity-90 mb-0.5">Card Payments</p>
                  <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.card.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="h-5 w-5 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">Short</Badge>
                  </div>
                  <p className="text-xs opacity-90 mb-0.5">Short Collections</p>
                  <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.short.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">Expected</Badge>
                  </div>
                  <p className="text-xs opacity-90 mb-0.5">Expected Total</p>
                  <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.expected.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-5 w-5 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">Received</Badge>
                  </div>
                  <p className="text-xs opacity-90 mb-0.5">Total Received</p>
                  <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.received.toLocaleString()}</p>
                </div>
              </div>

              {/* Point 6: Excess Collections Card - Visible to Owner and Manager */}
              {(isOwner || isManager) && Number(getProp(collectionSummary, 'excess') || collectionSummary?.excess || 0) > 0 && (
                <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-4 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="h-5 w-5 opacity-90" />
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">Excess</Badge>
                    </div>
                    <p className="text-xs opacity-90 mb-0.5">Excess Collections</p>
                    <p className="text-2xl font-bold tracking-tight">{RUPEE}{collectionSummary.excess.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {/* SALE MODE SWITCHER - ONLY 2 BUTTONS */}
      <div className="w-full flex flex-col sm:flex-row items-stretch gap-3 mb-4">
        <Button
          variant={saleMode === "single" ? "default" : "outline"}
          className={`flex-1 flex items-center justify-center gap-2 h-14 font-semibold text-sm shadow-lg transition-all duration-300 ${saleMode === "single"
            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white scale-105"
            : "hover:scale-105"
            }`}
          onClick={() => {
            setSaleMode("single");
            setForm(initialFormState);
            setSaleEntries([]);
          }}
        >
          <Plus className="h-5 w-5" />
          <div className="flex flex-col items-start">
            <span>Single Sale</span>
            <span className="text-xs font-normal opacity-80">With Collections</span>
          </div>
        </Button>

        <Button
          variant={saleMode === "batch" ? "default" : "outline"}
          className={`flex-1 flex items-center justify-center gap-2 h-14 font-semibold text-sm shadow-lg transition-all duration-300 ${saleMode === "batch"
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white scale-105"
            : "hover:scale-105"
            }`}
          onClick={() => {
            setSaleMode("batch");
            setForm(initialFormState);
            setSaleEntries([]);
          }}
        >
          <Layers className="h-5 w-5" />
          <div className="flex flex-col items-start">
            <span>Batch Sale</span>
            <span className="text-xs font-normal opacity-80">Multiple Products</span>
          </div>
        </Button>
      </div>

      {/* RECORD SALE FORM */}
      <Card className="w-full shadow-2xl rounded-2xl border-0 bg-gradient-to-br from-background via-muted/5 to-background overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-xl bg-primary/10 shadow-inner">
                {saleMode === "single" ? <Plus className="h-5 w-5 text-primary" /> : <Layers className="h-5 w-5 text-primary" />}
              </div>
              <span className="font-bold">
                {saleMode === "single" ? "Record Single Sale & Collection" : "Batch Sale Entry"}
              </span>
            </CardTitle>
            {saleMode === "batch" && saleEntries.length > 0 && (
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md px-2 py-1 text-xs">
                <Fuel className="h-3 w-3 mr-1" />
                <span className="font-semibold">{saleEntries.length} {saleEntries.length === 1 ? 'Item' : 'Items'}</span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="p-4">
            <div className="space-y-4">

              {/* Employee No Duty Warning */}
              {isEmployee && productGunPairs.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">No Active Duty Assigned</p>
                      <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                        You don't have any active pump duties assigned. Please contact your manager to assign you a duty before recording sales.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Employee ID */}
              <div className="space-y-2">
                <Label htmlFor="empId" className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Employee ID
                </Label>
                <Input id="empId" name="empId" value={empId || ""} readOnly disabled className="bg-muted/50" />
              </div>

              {/* Product & Gun Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel-type" className="text-sm font-semibold flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-blue-600" />
                    Fuel Type *
                  </Label>
                  <Select value={form.fuel} onValueChange={(val) => setForm((f) => ({ ...f, fuel: val }))} disabled={isEmployee && availableProductsForEmployee.length === 0}>
                    <SelectTrigger id="fuel-type" className="w-full shadow-sm">
                      <SelectValue placeholder={isEmployee && availableProductsForEmployee.length === 0 ? "No assigned products" : "Select Fuel"} />
                    </SelectTrigger>
                    <SelectContent className='z-[10000]'>
                      {(isEmployee ? availableProductsForEmployee : productsActive).map((p: any) => (
                        <SelectItem key={p.productName} value={p.productName}>{p.productName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gun" className="text-sm font-semibold flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-orange-600" />
                    Gun *
                  </Label>
                  <Select value={form.gun} onValueChange={(val) => setForm((f) => ({ ...f, gun: val }))} disabled={!form.fuel}>
                    <SelectTrigger id="gun" className="w-full shadow-sm">
                      <SelectValue placeholder={!form.fuel ? "Select Fuel First" : "Select Gun"} />
                    </SelectTrigger>
                    <SelectContent className='z-[10000]'>
                      {filteredGuns.map((g: any) => (
                        <SelectItem key={g.id} value={g.guns}>{g.guns} ({g.serialNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date & Time Selection */}
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-3 border border-amber-200/50 dark:border-amber-800/50">
                <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <Clock className="h-3.5 w-3.5" />
                  Sales Date & Time
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">Select the date and time for this sale entry. Leave as current time for auto-timestamp.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="saleDate" className="text-xs font-medium">Sale Date</Label>
                    <Input
                      id="saleDate"
                      name="saleDate"
                      type="date"
                      value={form.saleDate}
                      onChange={handleFormChange}
                      className="font-semibold text-sm h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="saleTime" className="text-xs font-medium">Sale Time</Label>
                    <Input
                      id="saleTime"
                      name="saleTime"
                      type="time"
                      value={form.saleTime}
                      onChange={handleFormChange}
                      className="font-semibold text-sm h-9"
                    />
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Selected: {dayjs(`${form.saleDate}T${form.saleTime}`).format("DD MMM YYYY, hh:mm A")}
                </p>
              </div>

              {/* Stock Readings */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 border border-blue-200/50 dark:border-blue-800/50">
                <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Target className="h-3.5 w-3.5" />
                  Stock Readings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="openingStock" className="text-xs font-medium">Opening Stock (L)</Label>
                    <Input id="openingStock" name="openingStock" type="number" step="0.001" value={form.openingStock} readOnly disabled className="bg-white/70 dark:bg-slate-900/70 h-9 text-sm" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="closingStock" className="text-xs font-medium">Closing Stock (L) *</Label>
                    <Input id="closingStock" name="closingStock" type="number" step="0.001" value={form.closingStock} onChange={handleFormChange} min={Number(form.openingStock || 0) + 0.001} required className="font-semibold h-9 text-sm" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="testingTotal" className="text-xs font-medium">Testing (L)</Label>
                    <Input id="testingTotal" name="testingTotal" type="number" min="0" step="0.01" value={form.testingTotal} placeholder="0.00" onChange={handleFormChange} className="h-9 text-sm" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="saleLiters" className="text-xs font-medium">Net Sale (L)</Label>
                    <Input id="saleLiters" name="saleLiters" type="number" step="0.001" value={form.saleLiters} readOnly disabled className="bg-green-50 dark:bg-green-950/30 font-bold text-green-700 dark:text-green-300 h-9 text-sm" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                </div>
              </div>

              {/* Sales Calculation */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-3 border border-emerald-200/50 dark:border-emerald-800/50">
                <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Sales Calculation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="price" className="text-xs font-medium">Price per Liter</Label>
                    <Input id="price" name="price" type="number" step="0.01" value={form.price} readOnly disabled className="bg-white/70 dark:bg-slate-900/70 h-9 text-sm" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salesInRupees" className="text-xs font-medium">Total Sale Amount</Label>
                    <Input id="salesInRupees" name="salesInRupees" type="number" step="0.01" value={form.salesInRupees} readOnly disabled className="bg-emerald-100 dark:bg-emerald-950/50 font-bold text-emerald-700 dark:text-emerald-300 h-9 text-sm" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                </div>
              </div>

              {/* Collection Details - Only for Single Mode */}
              {saleMode === "single" && (
                <>
                  <Separator className="my-2" />

                  <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-3 border border-purple-200/50 dark:border-purple-800/50 shadow-sm">
                    <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                      <div className="p-1 rounded-lg bg-purple-500/10">
                        <Wallet className="h-3 w-3 text-purple-600" />
                      </div>
                      Collection Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="cashReceived" className="text-xs font-semibold flex items-center gap-1 text-foreground">
                          <Banknote className="h-3 w-3 text-green-600" />
                          Cash Received
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
                          <Input
                            id="cashReceived"
                            name="cashReceived"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.cashReceived}
                            onChange={handleFormChange}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="pl-7 font-medium h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="phonePay" className="text-xs font-semibold flex items-center gap-1 text-foreground">
                          <Smartphone className="h-3 w-3 text-indigo-600" />
                          UPI Payment
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
                          <Input
                            id="phonePay"
                            name="phonePay"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.phonePay}
                            onChange={handleFormChange}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="pl-7 font-medium h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="creditCard" className="text-xs font-semibold flex items-center gap-1 text-foreground">
                          <CreditCard className="h-3 w-3 text-blue-600" />
                          Card Payment
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
                          <Input
                            id="creditCard"
                            name="creditCard"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.creditCard}
                            onChange={handleFormChange}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="pl-7 font-medium h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/50">
                      <Label htmlFor="shortCollections" className="text-xs font-semibold flex items-center gap-1 mb-1 text-foreground">
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                        Short Collection
                      </Label>
                      <Input
                        id="shortCollections"
                        name="shortCollections"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.shortCollections}
                        readOnly
                        disabled
                        className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold text-sm border-amber-200 dark:border-amber-800 h-9"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      />
                      {Number(form.shortCollections) > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Short amount: ₹{Number(form.shortCollections).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Batch Mode Info */}
              {saleMode === "batch" && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 border border-blue-200 dark:border-blue-800 shadow-sm">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 shrink-0">
                      <Fuel className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-xs text-blue-900 dark:text-blue-100">Batch Mode Active</p>
                        <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 px-2 py-0.5">
                          {saleEntries.length} {saleEntries.length === 1 ? 'item' : 'items'}
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        Add all your sales first, then enter collections once for all products at the end. Collections will be distributed proportionally.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </CardContent>

          {/* ACTION BUTTONS */}
          <div className="px-4 py-3 bg-muted/20 border-t border-border">
            <div className="flex flex-col sm:flex-row gap-2">
              {saleMode === "single" && (
                <Button
                  type="submit"
                  className="w-full h-10 font-medium shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  disabled={saleCollectionMutation.isPending || submittingRef.current || validationError !== null || (isEmployee && productGunPairs.length === 0)}
                >
                  {saleCollectionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : validationError ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Fix Validation Error
                    </>
                  ) : isEmployee && productGunPairs.length === 0 ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      No Active Duty
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Record Sale & Collection
                    </>
                  )}
                </Button>
              )}

              {saleMode === "batch" && (
                <>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-10 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    onClick={handleAddAnotherSale}
                    disabled={isSubmittingBatch || validationError !== null || (isEmployee && productGunPairs.length === 0)}
                  >
                    {validationError ? (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Fix Validation Error
                      </>
                    ) : isEmployee && productGunPairs.length === 0 ? (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        No Active Duty
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Sale to Batch
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 h-10 font-medium shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm"
                    onClick={handleShowBatchSummary}
                    disabled={(saleEntries.length === 0 && !form.fuel) || isSubmittingBatch || (isEmployee && productGunPairs.length === 0)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Show Summary & Submit ({saleEntries.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Point 1: TODAY'S SALES - Hidden for employees */}
      {!isEmployee && (
        <div className="w-full mt-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
            <CardHeader className="border-b bg-gradient-to-r from-blue-500/5 to-indigo-500/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-blue-500/10"><Clock className="h-4 w-4 text-blue-600" /></div>
                  Today's Sales
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">{todaySalesRaw.length} {todaySalesRaw.length === 1 ? 'Entry' : 'Entries'}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                    <p className="text-muted-foreground text-sm">Loading sales...</p>
                  </div>
                ) : todaySales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-2">
                      <Fuel className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium text-sm">No sales entries today</p>
                    <p className="text-xs text-muted-foreground">Record your first sale to see it here</p>
                  </div>
                ) : (
                  todaySales.map((sale: any, index: number) => (
                    <div
                      key={getAnyId(sale) || `${getProp(sale, 'productName')}-${getProp(sale, 'guns')}-${index}`}
                      className="group relative overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 p-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer hover:scale-[1.005]"
                      onClick={() => {
                        setSelectedSale(sale);
                      }}
                      title="Click to view full sale details"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-indigo-600" />

                      {/* Hover indicator */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          View Details
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-2 ml-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="shrink-0 p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                            <Droplet className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <h4 className="font-bold text-sm text-foreground truncate">{String(getProp(sale, 'productName') || '').toUpperCase()}</h4>
                              <Badge variant="outline" className="shrink-0 text-xs px-1.5 py-0.5">{String(getProp(sale, 'guns') || '').toUpperCase()}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="text-xs">{getProp(sale, 'dateTime') ? dayjs(getProp(sale, 'dateTime')).format("hh:mm A") : "--"}</span>
                              </div>
                              <div className="h-2.5 w-px bg-border" />
                              <div className="flex items-center gap-0.5">
                                <Droplet className="h-2.5 w-2.5" />
                                <span className="font-semibold text-foreground text-xs">{(Number(getProp(sale, 'salesInLiters')) || 0).toFixed(3)}L</span>
                                <span className="text-xs">× ₹{(Number(getProp(sale, 'price')) || 0).toFixed(2)}</span>
                              </div>
                              <div className="h-2.5 w-px bg-border" />
                              <div className="flex items-center gap-0.5">
                                <User className="h-2.5 w-2.5" />
                                <span className="text-xs">{getProp(sale, 'empId')}</span>
                              </div>
                              {((Number(getProp(sale, 'testingTotal')) || 0) > 0) && (
                                <>
                                  <div className="h-2.5 w-px bg-border" />
                                  <div className="flex items-center gap-0.5">
                                    <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
                                    <span className="text-xs">Testing: {(Number(getProp(sale, 'testingTotal')) || 0).toFixed(3)}L</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-muted-foreground mb-0.5">Total Sale</p>
                          <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            ₹{(Number(getProp(sale, 'salesInRupees')) || 0).toLocaleString()}
                          </p>
                          <div className="flex gap-0.5 mt-1 justify-end">
                            {/* Eye icon to view details */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSale(sale);
                              }}
                              className="h-7 w-7 bg-blue-100 text-blue-600 hover:bg-blue-200 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {/* Point 3: Delete button only for latest sale and hidden for employees */}
                              {index === 0 && !isEmployee && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete Sale"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Use MongoDB ID for deletion
                                  const mongoId = getProp(sale, 'id');
                                  if (mongoId) {
                                    setDeleteSaleId(mongoId);
                                    setDeleteSaleTarget(sale);
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "MongoDB ID not found. Please refresh the page.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                className="h-7 w-7 bg-red-100 text-destructive hover:bg-red-200"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {todaySalesRaw.length > SALES_PER_PAGE && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={handlePrevPage} className="hover:bg-muted h-8 text-xs">
                    <ChevronLeft className="h-3 w-3 mr-0.5" />Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong></span>
                  </div>
                  <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={handleNextPage} className="hover:bg-muted h-8 text-xs">
                    Next<ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              )}
            </CardContent>

            {/* Delete Dialog for latest sale */}
            {deleteSaleId && (
              <div
                className={
                  "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
                  (deleteSaleId ? 'opacity-100' : 'opacity-0 pointer-events-none')
                }
                style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
                onClick={() => setDeleteSaleId(null)}
              >
                <div
                  className="bg-gradient-to-br from-white/95 via-slate-50/90 to-red-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-red-900/90 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PopupClose onClick={() => setDeleteSaleId(null)} />

                  <div className="mb-4 flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 shadow-lg shadow-red-500/30">
                      <Trash2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">Delete Sale Record</h2>
                      <p className="text-xs text-muted-foreground">This action is permanent</p>
                    </div>
                  </div>

                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200/50 dark:border-red-800/50">
                    <p className="text-xs text-muted-foreground">
                      Are you sure you want to delete this sale record?
                    </p>
                    <p className="text-xs font-bold text-destructive mt-1">
                      ⚠️ This action cannot be undone and will permanently remove the sale data.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteSaleId(null)}
                      className="h-9 px-4 text-sm"
                      disabled={deleteSaleMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteSaleId && deleteSaleMutation.mutate(deleteSaleId)}
                      disabled={deleteSaleMutation.isPending}
                      className="h-9 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-sm"
                    >
                      {deleteSaleMutation.isPending ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Deleting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Sale</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Validation Error Dialog */}
      {validationError && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => {
            setValidationError(null);
          }}
        >
          <div
            className="bg-gradient-to-br from-white/95 via-slate-50/90 to-amber-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-amber-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupClose onClick={() => setValidationError(null)} />

            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-2xl text-foreground">{validationError.title}</h2>
                <p className="text-sm text-muted-foreground">Validation Error</p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200/50 dark:border-amber-800/50">
              <p className="text-sm text-foreground">
                {validationError.message}
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setValidationError(null);
                }}
                className="h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                OK, Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Point 4: Fuel-wise Sales Breakdown - Hidden for employees */}
      {!isEmployee && (
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
          <CardHeader className="border-b bg-gradient-to-r from-accent/5 to-primary/5">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Fuel className="h-5 w-5 text-accent" />
              </div>
              Fuel-wise Sales Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {summary.products.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Fuel className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No sales recorded today</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {summary.products.map((prod, idx) => {
                  const colors = [
                    { from: "from-blue-500", to: "to-indigo-600", icon: "bg-blue-500" },
                    { from: "from-orange-500", to: "to-red-600", icon: "bg-orange-500" },
                    { from: "from-emerald-500", to: "to-teal-600", icon: "bg-emerald-500" },
                    { from: "from-purple-500", to: "to-pink-600", icon: "bg-purple-500" },
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <div key={prod.name} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r ${color.from} ${color.to} p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${color.icon} bg-white/20`}><Droplet className="h-6 w-6" /></div>
                          <div>
                            <p className="text-sm opacity-90 mb-1">Product</p>
                            <p className="text-2xl font-bold">{String(prod.name || '').toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm opacity-90 mb-1">Total Sales</p>
                          <p className="text-3xl font-bold tracking-tight">{RUPEE}{prod.value.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sale Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => {
        if (!open) {
          setSelectedSale(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-5 border-b shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Sale Transaction Details
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Comprehensive overview of this sale transaction
            </DialogDescription>
          </DialogHeader>

          {collectionsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Loader2 className="h-14 w-14 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-sm">Loading transaction details...</p>
            </div>
          ) : selectedSale ? (
            <>
              <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
                {/* Transaction Header */}
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40 p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction Date</p>
                      <p className="text-2xl font-bold text-foreground">
                        {getProp(selectedSale, 'dateTime') ? dayjs(getProp(selectedSale, 'dateTime')).format("DD MMM YYYY") : "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getProp(selectedSale, 'dateTime') ? dayjs(getProp(selectedSale, 'dateTime')).format("hh:mm A") : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="text-base px-4 py-1.5 font-semibold">
                        {String(getProp(selectedSale, 'productName') || '').toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium text-foreground">{getProp(selectedSale, 'empId')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product & Gun - Modernized */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-5 border border-blue-200/60 dark:border-blue-800/60 transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                        <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{String(getProp(selectedSale, 'productName') || '').toUpperCase()}</p>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-5 border border-orange-200/60 dark:border-orange-800/60 transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                        <Fuel className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pump</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{String(getProp(selectedSale, 'guns') || '').toUpperCase()}</p>
                  </div>
                </div>

                {/* Stock Readings - Enhanced Grid */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Stock Analysis
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-4 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Opening</p>
                      <p className="text-xl font-bold text-emerald-900 dark:text-emerald-300">
                        {(Number(getProp(selectedSale, 'openingStock')) || 0).toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Liters</p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 p-4 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                      <p className="text-xs font-medium text-sky-700 dark:text-sky-400 mb-1.5">Closing</p>
                      <p className="text-xl font-bold text-sky-900 dark:text-sky-300">
                        {(Number(getProp(selectedSale, 'closingStock')) || 0).toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Liters</p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-4 border border-amber-200 dark:border-amber-800/60 shadow-sm">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">Testing</p>
                      <p className="text-xl font-bold text-amber-900 dark:text-amber-300">
                        {(Number(getProp(selectedSale, 'testingTotal')) || 0).toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Liters</p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4 border border-violet-200 dark:border-violet-800/60 shadow-sm">
                      <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-1.5">Net Sale</p>
                      <p className="text-xl font-bold text-violet-900 dark:text-violet-300">
                        {(Number(getProp(selectedSale, 'salesInLiters')) || 0).toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Liters</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    Financial Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 dark:from-teal-950/30 dark:via-emerald-950/30 dark:to-green-950/30 p-5 border border-teal-200 dark:border-teal-800/60 shadow-sm">
                      <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-2">Rate per Liter</p>
                      <p className="text-3xl font-bold text-teal-900 dark:text-teal-300">
                        ₹{(Number(getProp(selectedSale, 'price')) || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-violet-950/30 p-5 border border-blue-200 dark:border-blue-800/60 shadow-sm">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Total Amount</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                        ₹{(Number(getProp(selectedSale, 'salesInRupees')) || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collection Details - Modernized */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Payment Collection
                  </h3>
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 p-5 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                    {saleCollections.length > 0 ? (
                      <div className="space-y-3">
                        {saleCollections.map((col: any, idx: number) => (
                          <div key={getProp(col, 'id') || idx} className="rounded-lg bg-white/80 dark:bg-slate-900/60 p-4 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-foreground">
                                {getProp(col, 'dateTime') ? dayjs(getProp(col, 'dateTime')).format("hh:mm A") : "Collection"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                  <Banknote className="h-3.5 w-3.5 text-green-600" />
                                  <span>Cash</span>
                                </div>
                                <span className="text-lg font-bold text-foreground">₹{(Number(getProp(col, 'cashReceived')) || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                  <Smartphone className="h-3.5 w-3.5 text-purple-600" />
                                  <span>UPI</span>
                                </div>
                                <span className="text-lg font-bold text-foreground">₹{(Number(getProp(col, 'phonePay')) || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                                  <span>Card</span>
                                </div>
                                <span className="text-lg font-bold text-foreground">₹{(Number(getProp(col, 'creditCard')) || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Separator className="my-4" />

                        <div className="flex justify-between items-center px-2">
                          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Total Collected</span>
                          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{saleCollections.reduce((s: number, c: any) =>
                              s + (Number(getProp(c, 'cashReceived')) || 0) + (Number(getProp(c, 'phonePay')) || 0) + (Number(getProp(c, 'creditCard')) || 0), 0
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No payment records available</p>
                      </div>
                    )}

                    {/* Short Collection Alert */}
                    {(() => {
                      const totalCollected = saleCollections.length > 0
                        ? saleCollections.reduce((s: number, c: any) => s + (Number(getProp(c, 'cashReceived')) || 0) + (Number(getProp(c, 'phonePay')) || 0) + (Number(getProp(c, 'creditCard')) || 0), 0)
                        : 0;
                      const shortAmount = (Number(getProp(selectedSale, 'salesInRupees')) || 0) - totalCollected;
                      if (shortAmount > 0) {
                        return (
                          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-0.5">Outstanding Amount</p>
                                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                                  ₹{shortAmount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Transaction Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Opening Stock</span>
                      <span className="text-base font-semibold text-foreground">{(Number(selectedSale.OpeningStock || selectedSale.openingStock) || 0).toFixed(3)} L</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Closing Stock</span>
                      <span className="text-base font-semibold text-rose-600">- {(Number(selectedSale.ClosingStock || selectedSale.closingStock) || 0).toFixed(3)} L</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Testing</span>
                      <span className="text-base font-semibold text-rose-600">- {(Number(selectedSale.TestingTotal || selectedSale.testingTotal) || 0).toFixed(3)} L</span>
                    </div>

                    <Separator className="my-2" />

                    <div className="flex justify-between items-center py-2 bg-violet-50 dark:bg-violet-950/30 px-3 rounded-lg">
                      <span className="text-sm font-bold text-violet-900 dark:text-violet-300">Net Sale Volume</span>
                      <span className="text-lg font-bold text-violet-700 dark:text-violet-400">{(Number(selectedSale.SalesInLiters || selectedSale.salesInLiters) || 0).toFixed(3)} L</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Rate per Liter</span>
                      <span className="text-base font-semibold text-foreground">× ₹{(Number(selectedSale.Price || selectedSale.price) || 0).toFixed(2)}</span>
                    </div>

                    <Separator className="my-2" />

                    <div className="flex justify-between items-center py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 px-4 rounded-lg">
                      <span className="text-base font-bold text-blue-900 dark:text-blue-300">Final Amount</span>
                      <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        ₹{(Number(selectedSale.SalesInRupees || selectedSale.salesInRupees) || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t px-6 py-4 shrink-0 bg-slate-50 dark:bg-slate-900/40">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSale(null)}
                  className="w-full sm:w-auto min-w-[120px]"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <AlertCircle className="h-14 w-14 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Transaction data unavailable</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}