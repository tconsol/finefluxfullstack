import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Plus, Search, IndianRupee, Calendar, Phone, Mail, TrendingUp,
  TrendingDown, AlertTriangle, Clock, History as HistoryIcon,
  CreditCard, ArrowUpDown, Trash2, X, Loader2, Edit, Filter, CalendarDays
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Switch } from "@/components/ui/switch";
import { API_CONFIG, buildOrgEndpoint } from '@/lib/api-config';

type Customer = {
  id?: string;
  custId?: string;
  customerName: string;
  customerVehicleNum?: string;
  empId?: string;
  amountBorrowed?: number;
  totalBorrowedAmount?: number;
  borrowDate?: string;
  dueDate?: string;
  status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | string;
  lifecycleStatus?: 'ACTIVE' | 'INACTIVE' | string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

type CustomerCreateRequest = {
  organizationId: string;
  custId: string;
  customerName: string;
  customerVehicleNum: string;
  empId: string;
  amountBorrowed: number;
  borrowDate: string;
  dueDate: string;
  lifecycleStatus?: 'ACTIVE' | 'INACTIVE' | string;
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID';
  phoneNumber: string;
  email?: string;
  notes?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

type HistoryTransaction = {
  id?: string;
  custId: string;
  transactionAmount: number;
  transactionDate: string;
  cumulativeAmount?: number;
  notes?: string;
};

type HistoryPage = {
  content: HistoryTransaction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};

type TransactionRequest = {
  custId: string;
  transactionAmount: number;
  notes?: string;
};

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const IN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

function getBorrowType({ transaction, history }: { transaction: HistoryTransaction; history: HistoryTransaction[]; }) {
  if (transaction.transactionAmount < 0) {
    const sorted = [...history].sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
    const uniqueTransactions = sorted.filter((tx, index, self) => index === self.findIndex((t) => t.id === tx.id));
    const firstNegative = uniqueTransactions.find((tx) => tx.transactionAmount < 0);
    if (firstNegative && firstNegative.id === transaction.id) {
      return "Amount Borrowed";
    }
    return "Additional Borrowed";
  }
  return "Payment Received";
}

export default function Borrowers() {
  const { toast } = useToast();
  const [orgId, setOrgId] = useState('');
  const [empId, setEmpId] = useState('');

  useEffect(() => {
    setOrgId(localStorage.getItem('organizationId') || '');
    setEmpId(localStorage.getItem('empId') || '');
  }, []);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<CustomerCreateRequest>({
    organizationId: orgId,
    custId: '',
    customerName: '',
    customerVehicleNum: '',
    empId: empId,
    amountBorrowed: 0,
    borrowDate: today,
    dueDate: today,
    status: 'PENDING',
    phoneNumber: '',
    email: '',
    notes: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    }
  });
  const [submitting, setSubmitting] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyData, setHistoryData] = useState<HistoryPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState<TransactionRequest>({
    custId: '',
    transactionAmount: 0,
    notes: ''
  });
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBorrower, setDeletingBorrower] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Effect to log filter changes
  useEffect(() => {
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (open || historyOpen || transactionOpen || deleteOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, historyOpen, transactionOpen, deleteOpen]);

  const getDateFilterUrl = () => {
    if (!orgId) return null;
    const base = `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers`;

    switch (dateFilter) {
      case 'today':
        return `${base}/today`;
      case 'week':
        return `${base}/week`;
      case 'month':
        return `${base}/month`;
      case 'custom':
        if (customStartDate && customEndDate) {
          // Convert dates to LocalDateTime format for backend
          const fromDateTime = `${customStartDate}T00:00:00`;
          const toDateTime = `${customEndDate}T23:59:59`;
          return `${base}/range?from=${encodeURIComponent(fromDateTime)}&to=${encodeURIComponent(toDateTime)}`;
        }
        return base;
      case 'all':
      default:
        return base;
    }
  };

  const fetchCustomers = async (): Promise<Customer[]> => {
    const url = getDateFilterUrl();
    if (!url) return [];


    try {
      const res = await axios.get(url, { timeout: 20000 });
      const data = res.data;
      

      // Filter endpoints (today, week, month, range) return List directly
      if (Array.isArray(data)) {
        return data;
      }

      // Default /customers endpoint returns Page with content field
      if (data && typeof data === 'object' && 'content' in data && Array.isArray(data.content)) {
        return data.content;
      }

      // Fallback: try to find any array in the response
      const candidates = ['data', 'items', 'result', 'results', 'records', 'rows'];
      for (const key of candidates) {
        if (Array.isArray((data as any)?.[key])) {
          return (data as any)[key];
        }
      }

      const firstArray = Object.values(data || {}).find((v) => Array.isArray(v)) as Customer[] | undefined;
      if (Array.isArray(firstArray)) {
        return firstArray;
      }

      return [];
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || err?.message || 'Failed to fetch customers',
        variant: 'destructive'
      });
      return [];
    }
  };

  const { data: customers = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['customers', orgId, dateFilter, customStartDate, customEndDate],
    queryFn: fetchCustomers,
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 0, // Changed from 30_000 to ensure filters work immediately
  });

  // Fetch all customer history for total borrowed and recovered stats
  const fetchAllHistory = async (): Promise<HistoryTransaction[]> => {
    if (!orgId) return [];
    try {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers/history`;
      const res = await axios.get(url, { timeout: 20000 });
      const data = res.data;

      if (data && typeof data === 'object' && 'content' in data && Array.isArray(data.content)) {
        return data.content;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (err: any) {
      return [];
    }
  };

  const { data: allHistory = [] } = useQuery({
    queryKey: ['customerHistory', orgId],
    queryFn: fetchAllHistory,
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const fields = [c.customerName, c.customerVehicleNum, c.phoneNumber, c.email, c.status, c.empId, c.custId]
        .filter(Boolean).join(' ').toLowerCase();
      return fields.includes(q);
    });
  }, [customers, search]);

  const groupByStatus = useMemo(() => {
    const norm = (s?: string) => (s || '').toUpperCase();
    const groups = {
      OVERDUE: [] as Customer[],
      PENDING: [] as Customer[],
      PARTIAL: [] as Customer[],
      PAID: [] as Customer[],
      OTHER: [] as Customer[]
    };
    
    for (const c of filtered) {
      const s = norm(c.status);
      if (s === 'OVERDUE') groups.OVERDUE.push(c);
      else if (s === 'PENDING') groups.PENDING.push(c);
      else if (s === 'PARTIAL') groups.PARTIAL.push(c);
      else if (s === 'PAID') groups.PAID.push(c);
      else groups.OTHER.push(c);
    }
    
    // Sort each group: Active customers first, then Inactive customers
    const sortByLifecycleStatus = (a: Customer, b: Customer) => {
      const aActive = a.lifecycleStatus === 'ACTIVE' ? 0 : 1;
      const bActive = b.lifecycleStatus === 'ACTIVE' ? 0 : 1;
      return aActive - bActive;
    };
    
    groups.OVERDUE.sort(sortByLifecycleStatus);
    groups.PENDING.sort(sortByLifecycleStatus);
    groups.PARTIAL.sort(sortByLifecycleStatus);
    groups.PAID.sort(sortByLifecycleStatus);
    groups.OTHER.sort(sortByLifecycleStatus);
    
    return groups;
  }, [filtered]);

  const handleToggleLifecycleStatus = async (customer: Customer) => {
    const newStatus = customer.lifecycleStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    // Prevent inactivating customer with pending balance
    if (newStatus === 'INACTIVE') {
      const currentBalance = Number(customer.amountBorrowed || 0);
      if (currentBalance > 0) {
        toast({
          title: '❌ Cannot Inactive Customer',
          description: `This customer has a pending balance of ₹${currentBalance.toLocaleString()}. Please clear the balance before inactivating.`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    try {
      await axios.put(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers/${customer.id}/lifecycle-status`,
        { lifecycleStatus: newStatus },
        { timeout: 20000 }
      );
      toast({
        title: 'Success',
        description: `Borrower status updated to ${newStatus}`,
        variant: 'default',
      });
      await refetch();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };


  const stats = useMemo(() => {
    const total = customers.length;
    const totalBorrowed = customers.reduce((sum, c) => sum + (Number(c.amountBorrowed) || 0), 0);
    const overdueCount = customers.filter((c) => (c.status || '').toUpperCase() === 'OVERDUE').length;
    const pendingCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PENDING').length;
    const partialCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PARTIAL').length;
    const paidCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PAID').length;
    
    // Calculate total amount borrowed and recovered from history
    let historyTotalBorrowed = 0;
    let historyTotalRecovered = 0;
    
    allHistory.forEach((transaction) => {
      const amount = Number(transaction.transactionAmount) || 0;
      if (amount < 0) {
        // Negative amounts are borrowed (Extra Borrowed)
        historyTotalBorrowed += Math.abs(amount);
      } else if (amount > 0) {
        // Positive amounts are payments (recovered)
        historyTotalRecovered += amount;
      }
    });
    
    const pendingAmount = historyTotalBorrowed - historyTotalRecovered;
    
    return [
      { title: 'Total Borrowers', value: total.toString(), change: 'Active records', icon: Users, color: 'text-primary', bgColor: 'bg-primary-soft' },
      { title: 'Total Borrowed', value: `₹${totalBorrowed.toLocaleString()}`, change: 'Current outstanding', icon: IndianRupee, color: 'text-accent', bgColor: 'bg-accent-soft' },
      { title: 'Amount Borrowed', value: `₹${historyTotalBorrowed.toLocaleString()}`, change: 'From history', icon: TrendingDown, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Amount Recovered', value: `₹${historyTotalRecovered.toLocaleString()}`, change: 'From history', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
      { title: 'Pending Amount', value: `₹${pendingAmount.toLocaleString()}`, change: 'Borrowed - Recovered', icon: CreditCard, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { title: 'Overdue', value: overdueCount.toString(), change: 'Need attention', icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
      { title: 'P/P/P', value: `${pendingCount}/${partialCount}/${paidCount}`, change: 'Pending/Partial/Paid', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' }
    ];
  }, [customers, allHistory]);

  const recentEvents = useMemo(() => {
    return customers.map((c) => ({
      type: 'loan' as const,
      borrower: c.customerName,
      amount: Number(c.amountBorrowed) || 0,
      date: c.borrowDate || ''
    })).filter((e) => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [customers]);

  const updateField = <K extends keyof CustomerCreateRequest>(key: K) => (value: CustomerCreateRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAddress = (k: keyof NonNullable<CustomerCreateRequest['address']>, v: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...(prev.address || {}), [k]: v }
    }));
  };

  const generateCustId = (customerName: string, existingCustomers: Customer[]) => {
    const namePrefix = customerName.trim().toUpperCase().slice(0, 2).padEnd(2, 'X');
    const basePrefix = `${orgId}${namePrefix}`;
    const existingWithPrefix = existingCustomers.filter((c) => c.custId?.startsWith(basePrefix));
    let maxSequence = 0;
    existingWithPrefix.forEach((c) => {
      const custId = c.custId || '';
      const sequencePart = custId.slice(basePrefix.length);
      const sequenceNum = parseInt(sequencePart, 10);
      if (!isNaN(sequenceNum) && sequenceNum > maxSequence) maxSequence = sequenceNum;
    });
    const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
    return `${basePrefix}${nextSequence}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CustomerCreateRequest = editMode && editingCustomer ? {
      ...form,
      custId: editingCustomer.custId || form.custId,
      organizationId: orgId,
      empId: form.empId || empId,
      amountBorrowed: Number(editingCustomer.amountBorrowed) || 0,
    } : {
      ...form,
      custId: generateCustId(form.customerName, customers),
      organizationId: orgId,
      empId: form.empId || empId,
    };

    if (!payload.customerName.trim() || !payload.customerVehicleNum.trim() || !payload.empId.trim() ||
      !payload.borrowDate || !payload.dueDate || !payload.phoneNumber.trim()) {
      toast({
        title: 'Validation error',
        description: 'All required fields must be filled.',
        variant: 'destructive'
      });
      return;
    }

    if (payload.phoneNumber.length !== 10 || !/^\d{10}$/.test(payload.phoneNumber)) {
      toast({
        title: 'Validation error',
        description: 'Phone number must be exactly 10 digits.',
        variant: 'destructive'
      });
      return;
    }

    if (!editMode && !(payload.amountBorrowed > 0)) {
      toast({
        title: 'Validation error',
        description: 'Amount borrowed must be greater than 0.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editMode && editingCustomer?.id) {
        await axios.put(
          `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers/${editingCustomer.id}`,
          payload,
          { timeout: 20000 }
        );
        toast({ title: 'Success', description: 'Customer details updated successfully!', variant: 'default' });
      } else {
        await axios.post(
          `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers`,
          payload,
          { timeout: 20000 }
        );
        toast({ title: 'Success', description: `Borrower created with ID: ${payload.custId}`, variant: 'default' });
      }

      setForm({
        organizationId: orgId,
        custId: '',
        customerName: '',
        customerVehicleNum: '',
        empId: empId,
        amountBorrowed: 0,
        borrowDate: today,
        dueDate: today,
        status: 'PENDING',
        phoneNumber: '',
        email: '',
        notes: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'India'
        }
      });

      await refetch();
      setOpen(false);
      setEditMode(false);
      setEditingCustomer(null);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Operation failed.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (customer: Customer) => {
    setDeletingBorrower(customer);
    setDeleteOpen(true);
  };

  const handleDeleteBorrower = async () => {
    if (!deletingBorrower?.custId) return;
    setDeleteLoading(true);
    try {
      await axios.delete(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers/by-cust/${encodeURIComponent(deletingBorrower.custId)}`
      );
      toast({
        title: 'Success',
        description: `Borrower ${deletingBorrower.customerName} deleted.`
      });
      await refetch();
      setDeleteOpen(false);
      setDeletingBorrower(null);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to delete.',
        variant: 'destructive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditMode(true);
    setEditingCustomer(customer);
    setForm({
      organizationId: orgId,
      custId: customer.custId || '',
      customerName: customer.customerName,
      customerVehicleNum: customer.customerVehicleNum || '',
      empId: customer.empId || empId,
      amountBorrowed: Number(customer.amountBorrowed) || 0,
      borrowDate: customer.borrowDate || today,
      dueDate: customer.dueDate || today,
      status: (customer.status?.toUpperCase() as any) || 'PENDING',
      phoneNumber: customer.phoneNumber || '',
      email: customer.email || '',
      notes: customer.notes || '',
      address: customer.address || {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India'
      }
    });
    setOpen(true);
  };
  const handleOpenTransaction = (customer: Customer) => {
    if (customer.lifecycleStatus === 'INACTIVE') {
      toast({
        title: 'Cannot Add Transaction',
        description: 'This borrower is inactive. Please activate the borrower to add transactions.',
        variant: 'destructive'
      });
      return;
    }
    setSelectedCustomer(customer);
    setTransactionForm({
      custId: customer.custId || '',
      transactionAmount: 0,
      notes: ''
    });
    setTransactionOpen(true);
  };

  const onTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionForm.custId || transactionForm.transactionAmount === 0) {
      toast({
        title: 'Validation error',
        description: 'Customer ID and non-zero amount required.',
        variant: 'destructive'
      });
      return;
    }

    const currentBalance = Number(selectedCustomer?.amountBorrowed || 0);
    
    // Prevent payment if no outstanding balance
    if (transactionForm.transactionAmount > 0 && currentBalance <= 0) {
      toast({
        title: 'Cannot Record Payment',
        description: 'This customer has no outstanding balance (₹0). Only "Extra Borrowed" transactions are allowed.',
        variant: 'destructive'
      });
      return;
    }

    // Prevent payment if amount exceeds current balance
    if (transactionForm.transactionAmount > 0 && transactionForm.transactionAmount > currentBalance) {
      toast({
        title: '❌ Payment Exceeds Balance',
        description: `Cannot accept payment of ₹${transactionForm.transactionAmount.toLocaleString()}. Current outstanding balance is only ₹${currentBalance.toLocaleString()}.`,
        variant: 'destructive'
      });
      return;
    }

    setTransactionSubmitting(true);
    try {
      await axios.post(
        `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers/history`,
        transactionForm,
        { timeout: 20000 }
      );
      toast({ title: 'Success', description: 'Transaction recorded successfully.', variant: 'default' });
      await refetch();
      setTransactionOpen(false);
      if (historyOpen && selectedCustomer?.custId === transactionForm.custId) {
        fetchHistory(transactionForm.custId, historyPage);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to record transaction.',
        variant: 'destructive'
      });
    } finally {
      setTransactionSubmitting(false);
    }
  };

  const fetchHistory = async (custId: string, page: number = 0) => {
    setHistoryLoading(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/customers/history/cust/${encodeURIComponent(custId)}?page=${page}&size=50`;
      const res = await axios.get(url, { timeout: 20000 });
      setHistoryData(res.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to load history.',
        variant: 'destructive'
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryPage(0);
    setHistoryOpen(true);
    if (customer.custId) {
      fetchHistory(customer.custId, 0);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ========== DELETE MODAL ========== */}
      {deleteOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md" style={{ margin: 0, padding: '1rem' }} onClick={() => setDeleteOpen(false)}>
          <div className="relative bg-background shadow-2xl rounded-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDeleteOpen(false)} className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10"><Trash2 className="h-6 w-6 text-destructive" /></div>
              <h3 className="text-2xl font-bold">Delete Borrower?</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingBorrower?.customerName}</span> ({deletingBorrower?.custId})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBorrower} disabled={deleteLoading}>
                {deleteLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>) : ('Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ADD/EDIT BORROWER MODAL ========== */}
      {open && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md" style={{ margin: 0, padding: '1rem' }} onClick={() => setOpen(false)}>
          <div className="relative bg-background shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">{editMode ? 'Edit Borrower' : 'Add New Borrower'}</h2>
                <p className="text-sm text-muted-foreground">Fill in the required details</p>
              </div>
              <button onClick={() => { setOpen(false); setEditMode(false); setEditingCustomer(null); }} className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Organization ID <span className="text-red-500">*</span></Label>
                  <Input value={orgId} readOnly disabled className="bg-muted/50 cursor-not-allowed" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name <span className="text-red-500">*</span></Label>
                    <Input value={form.customerName} onChange={(e) => updateField('customerName')(e.target.value)} placeholder="Enter name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Number <span className="text-red-500">*</span></Label>
                    <Input value={form.customerVehicleNum} onChange={(e) => updateField('customerVehicleNum')((e.target.value || '').toUpperCase())} placeholder="KA01AB1234" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID <span className="text-red-500">*</span></Label>
                    <Input value={form.empId || empId} readOnly disabled className="bg-muted/50 cursor-not-allowed text-muted-foreground" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Amount Borrowed (₹) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amountBorrowed === 0 ? "" : form.amountBorrowed}
                      onChange={e => {
                        const val = e.target.value;
                        updateField('amountBorrowed')(val === "" ? 0 : Number(val));
                      }}
                      placeholder="0.00"
                      required
                      readOnly={editMode}
                      disabled={editMode}
                      className={editMode ? "bg-muted/50 cursor-not-allowed text-muted-foreground" : ""}
                    />

                    {editMode ? (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Amount cannot be modified. Use "Record Transaction" to adjust balance.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Initial borrowed amount (cannot be changed after creation)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Borrow Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={form.borrowDate} onChange={(e) => updateField('borrowDate')(e.target.value)} max={today} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={form.dueDate} onChange={(e) => updateField('dueDate')(e.target.value)} min={today} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status <span className="text-red-500">*</span></Label>
                    <Select value={form.status} onValueChange={(value) => updateField('status')(value as any)} required>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent className='z-[10000]'>
                        <SelectItem value="PENDING"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-yellow-500" /><span>PENDING</span></div></SelectItem>
                        <SelectItem value="PARTIAL"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-500" /><span>PARTIAL</span></div></SelectItem>
                        <SelectItem value="OVERDUE"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500" /><span>OVERDUE</span></div></SelectItem>
                        <SelectItem value="PAID"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500" /><span>PAID</span></div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number <span className="text-red-500">*</span></Label>
                    <Input
                      type="tel"
                      value={form.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        updateField('phoneNumber')(value);
                      }}
                      placeholder="9000000000"
                      pattern="^\d{10}$"
                      maxLength={10}
                      required
                    />
                    {form.phoneNumber && form.phoneNumber.length !== 10 && (
                      <p className="text-xs text-red-500">Phone number must be exactly 10 digits</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email || ''} onChange={(e) => updateField('email')(e.target.value)} placeholder="name@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="Address Line 1" value={form.address?.line1 || ''} onChange={(e) => updateAddress('line1', e.target.value)} />
                    <Input placeholder="Address Line 2" value={form.address?.line2 || ''} onChange={(e) => updateAddress('line2', e.target.value)} />
                    <Input placeholder="City" value={form.address?.city || ''} onChange={(e) => updateAddress('city', e.target.value)} />
                    <Select value={form.address?.state || ''} onValueChange={(value) => updateAddress('state', value)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                      <SelectContent className="z-[10000] max-h-[300px]">
                        {IN_STATES.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Postal Code" value={form.address?.postalCode || ''} onChange={(e) => updateAddress('postalCode', e.target.value)} />
                    <Input value={form.address?.country || 'India'} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea className="min-h-[80px] w-full rounded-md border border-border bg-background p-2" value={form.notes || ''} onChange={(e) => updateField('notes')(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditMode(false); setEditingCustomer(null); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" className="btn-gradient-primary" disabled={submitting}>
                  {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editMode ? 'Updating...' : 'Saving...'}</>) : (editMode ? 'Update Borrower' : 'Save Borrower')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== TRANSACTION MODAL (WITH BALANCE CHECK) ========== */}
      {transactionOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: "1rem" }}
          onClick={() => setTransactionOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />Record Transaction
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer?.customerName} ({selectedCustomer?.custId})
                </p>
              </div>
              <button
                onClick={() => setTransactionOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onTransactionSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Customer ID *</Label>
                  <Input value={transactionForm.custId} readOnly disabled className="bg-muted/50 cursor-not-allowed" required />
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Current Outstanding Balance:</span>
                    <span className="text-2xl font-bold text-foreground">
                      ₹{Number(selectedCustomer?.amountBorrowed || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {Number(selectedCustomer?.amountBorrowed || 0) <= 0 && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">No Outstanding Balance</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          This customer has fully paid their debt. You can only record "Extra Borrowed" transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      // This logic ensures the input stays blank if empty or 0
                      value={
                        transactionForm.transactionAmount === 0
                          ? ""
                          : Math.abs(transactionForm.transactionAmount)
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Keeps input blank if the user clears it
                        const absValue = raw === "" ? 0 : Math.abs(Number(raw));
                        setTransactionForm((prev) => ({
                          ...prev,
                          transactionAmount:
                            prev.transactionAmount < 0 && absValue !== 0 ? -absValue : absValue
                        }));
                      }}
                      placeholder="0.00"
                      required
                      className="pl-8"
                    />
                    <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {transactionForm.transactionAmount < 0 ? (
                      <span className="text-warning">
                        Additional borrowing (+₹{Math.abs(Number(transactionForm.transactionAmount)).toLocaleString()})
                      </span>
                    ) : (
                      <span className="text-success">
                        Payment (−₹{Math.abs(Number(transactionForm.transactionAmount)).toLocaleString()})
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={transactionForm.transactionAmount >= 0 ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() => {
                        const currentBalance = Number(selectedCustomer?.amountBorrowed || 0);
                        if (currentBalance <= 0) {
                          toast({
                            title: "Cannot Record Payment",
                            description: "This customer has no outstanding balance. Payment cannot be recorded.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setTransactionForm((prev) => ({
                          ...prev,
                          transactionAmount: Math.abs(prev.transactionAmount) || 0
                        }));
                      }}
                      disabled={Number(selectedCustomer?.amountBorrowed || 0) <= 0}
                    >
                      <TrendingUp className="h-6 w-6" />
                      Payment Received
                      {Number(selectedCustomer?.amountBorrowed || 0) <= 0 && (
                        <span className="text-xs">(No Balance)</span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant={transactionForm.transactionAmount < 0 ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() =>
                        setTransactionForm((prev) => ({
                          ...prev,
                          transactionAmount: prev.transactionAmount === 0 ? 0 : -Math.abs(prev.transactionAmount)
                        }))
                      }
                    >
                      <TrendingDown className="h-6 w-6" />
                      Extra Borrowed
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    value={transactionForm.notes || ""}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Optional notes"
                    className="min-h-[80px] w-full rounded-md border border-border bg-background p-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTransactionOpen(false)}
                  disabled={transactionSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn-gradient-primary"
                  disabled={transactionSubmitting}
                >
                  {transactionSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Record Transaction"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== HISTORY MODAL ========== */}
      {historyOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md" style={{ margin: 0, padding: '1rem' }} onClick={() => setHistoryOpen(false)}>
          <div className="relative bg-background shadow-2xl rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><HistoryIcon className="h-6 w-6" />Transaction History</h2>
                <p className="text-sm text-muted-foreground">{selectedCustomer?.customerName} ({selectedCustomer?.custId})</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading && (<div className="text-muted-foreground p-4 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />Loading history...</div>)}
              {!historyLoading && historyData && (
                <div className="space-y-4">
                  {historyData.content.length > 0 ? (
                    <div className="space-y-3">
                      {historyData.content.map((transaction, idx) => {
                        const isPayment = transaction.transactionAmount >= 0;
                        const absAmt = Math.abs(Number(transaction.transactionAmount));
                        const label = getBorrowType({ transaction, history: historyData.content });
                        return (
                          <div key={transaction.id || `${transaction.custId}-${transaction.transactionDate}-${idx}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
                            <div className="flex items-center gap-3">
                              <div className={`rounded-lg p-2 ${isPayment ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                                {isPayment ? (<TrendingUp className="h-4 w-4" />) : (<TrendingDown className="h-4 w-4" />)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{label}</p>
                                <p className="text-sm text-muted-foreground">{new Date(transaction.transactionDate).toLocaleString()}</p>
                                {transaction.notes && (<p className="text-sm text-muted-foreground italic">{transaction.notes}</p>)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${isPayment ? 'text-success' : 'text-warning'}`}>
                                {isPayment ? "−" : "+"}₹{absAmt.toLocaleString()}
                              </p>
                              {typeof transaction.cumulativeAmount === 'number' && (
                                <p className="text-xs text-muted-foreground">Balance: ₹{Number(transaction.cumulativeAmount).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">No transaction history available.</div>
                  )}
                  {historyData.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-muted-foreground">Page {historyData.number + 1} of {historyData.totalPages} ({historyData.totalElements} total)</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={historyData.first || historyLoading} onClick={() => { if (selectedCustomer?.custId) { setHistoryPage(historyPage - 1); fetchHistory(selectedCustomer.custId, historyPage - 1); } }}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={historyData.last || historyLoading} onClick={() => { if (selectedCustomer?.custId) { setHistoryPage(historyPage + 1); fetchHistory(selectedCustomer.custId, historyPage + 1); } }}>Next</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-border bg-muted/20 shrink-0">
              <Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PAGE HEADER ========== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Borrower Management</h1>
          <p className="text-muted-foreground">Track loans and manage customer credit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching || !orgId}>{isFetching ? 'Refreshing...' : 'Refresh'}</Button>
          <Button className="btn-gradient-primary" onClick={() => { setEditMode(false); setEditingCustomer(null); setOpen(true); }} disabled={!orgId}><Plus className="mr-2 h-4 w-4" />Add Borrower</Button>
        </div>
      </div>

      {isLoading && (<Card><CardContent className="p-12 text-center"><Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin mx-auto text-primary" /><p className="text-muted-foreground">Loading borrowers...</p></CardContent></Card>)}
      {isError && (<Card><CardContent className="p-6"><div className="text-destructive">Failed to load customers{error instanceof Error ? `: ${error.message}` : ''}.</div></CardContent></Card>)}

      {!isLoading && !isError && (
        <>
          {/* ========== STATS CARDS ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="stat-card hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                        <div><p className="text-2xl font-bold text-foreground">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.change}</p></div>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-lg`}><Icon className={`h-6 w-6 ${stat.color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ========== DATE FILTER SECTION ========== */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter by Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={dateFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('today');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    size="sm"
                  >
                    <CalendarDays className="h-4 w-4 mr-1" />Today
                  </Button>
                  <Button
                    variant={dateFilter === 'week' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('week');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    size="sm"
                  >
                    This Week
                  </Button>
                  <Button
                    variant={dateFilter === 'month' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('month');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    size="sm"
                  >
                    This Month
                  </Button>
                  <Button
                    variant={dateFilter === 'custom' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('custom')}
                    size="sm"
                  >
                    Custom Range
                  </Button>
                </div>
                {dateFilter === 'custom' && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-40"
                      placeholder="Start Date"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-40"
                      placeholder="End Date"
                    />
                    <Button
                      onClick={() => {
                        if (customStartDate && customEndDate) {
                          refetch();
                        } else {
                          toast({
                            title: 'Validation Error',
                            description: 'Please select both start and end dates',
                            variant: 'destructive'
                          });
                        }
                      }}
                      size="sm"
                      disabled={!customStartDate || !customEndDate}
                    >
                      Apply
                    </Button>
                  </div>
                )}
                {dateFilter !== 'all' && dateFilter !== 'custom' && (
                  <p className="text-sm text-muted-foreground">
                    Showing {dateFilter === 'today' ? "today's" : dateFilter === 'week' ? "this week's" : "this month's"} borrowers ({customers.length} records)
                  </p>
                )}
                {dateFilter === 'custom' && customStartDate && customEndDate && (
                  <p className="text-sm text-muted-foreground">
                    Showing borrowers from {new Date(customStartDate).toLocaleDateString('en-IN')} to {new Date(customEndDate).toLocaleDateString('en-IN')} ({customers.length} records)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ========== BORROWER LIST ========== */}
          <Card className="card-gradient">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Borrower Accounts</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search borrowers..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groupByStatus.OVERDUE.length > 0 && (<Section title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />}>{groupByStatus.OVERDUE.map((c) => (<BorrowerRow key={c.id || c.custId} c={c} onHistory={handleOpenHistory} onTransaction={handleOpenTransaction} onEdit={handleEdit} onToggleLifecycleStatus={handleToggleLifecycleStatus} />))}</Section>)}
              {groupByStatus.PENDING.length > 0 && (<Section title="Pending" icon={<Clock className="h-4 w-4 text-warning" />}>{groupByStatus.PENDING.map((c) => (<BorrowerRow key={c.id || c.custId} c={c} onHistory={handleOpenHistory} onTransaction={handleOpenTransaction} onEdit={handleEdit} onToggleLifecycleStatus={handleToggleLifecycleStatus} />))}</Section>)}
              {groupByStatus.PARTIAL.length > 0 && (<Section title="Partial" icon={<TrendingUp className="h-4 w-4 text-accent" />}>{groupByStatus.PARTIAL.map((c) => (<BorrowerRow key={c.id || c.custId} c={c} onHistory={handleOpenHistory} onTransaction={handleOpenTransaction} onEdit={handleEdit} onToggleLifecycleStatus={handleToggleLifecycleStatus} />))}</Section>)}
              {groupByStatus.PAID.length > 0 && (<Section title="Paid" icon={<TrendingUp className="h-4 w-4 text-success" />}>{groupByStatus.PAID.map((c) => (<BorrowerRow key={c.id || c.custId} c={c} onHistory={handleOpenHistory} onTransaction={handleOpenTransaction} onEdit={handleEdit} onToggleLifecycleStatus={handleToggleLifecycleStatus} />))}</Section>)}
              {groupByStatus.OTHER.length > 0 && (<Section title="Other" icon={<Users className="h-4 w-4 text-muted-foreground" />}>{groupByStatus.OTHER.map((c) => (<BorrowerRow key={c.id || c.custId} c={c} onHistory={handleOpenHistory} onTransaction={handleOpenTransaction} onEdit={handleEdit} onToggleLifecycleStatus={handleToggleLifecycleStatus} />))}</Section>)}
              {filtered.length === 0 && (<div className="text-sm text-muted-foreground">No borrowers match the current filter.</div>)}
            </CardContent>
          </Card>

          {/* ========== RECENT EVENTS ========== */}
          <Card className="card-gradient">
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Recent Borrow Events</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentEvents.length > 0 ? (
                  recentEvents.map((tx, idx) => (
                    <div key={`${tx.borrower}-${tx.date}-${idx}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-warning-soft p-2 text-warning"><TrendingUp className="h-4 w-4" /></div>
                        <div><p className="font-medium text-foreground">Loan to {tx.borrower}</p><p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString('en-IN')}</p></div>
                      </div>
                      <p className="font-semibold text-warning">₹{Number(tx.amount).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No recent borrow events available.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ========== HELPER COMPONENTS ==========
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (<div className="mb-6"><div className="mb-2 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div><div className="space-y-3">{children}</div></div>);
}

function BorrowerRow({
  c,
  onHistory,
  onTransaction,
  onEdit,
  onToggleLifecycleStatus,
}: {
  c: Customer;
  onHistory: (customer: Customer) => void;
  onTransaction: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onToggleLifecycleStatus: (customer: Customer) => void;
}) {
  const getUserInitials = (name?: string) => (!name ? "NA" : name.split(" ").map((n) => n[0]).join("").toUpperCase());
  const formatDate = (iso?: string) => (!iso ? "—" : new Date(iso).toLocaleDateString("en-IN"));
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg bg-muted/30 p-4 hover:bg-muted/50">
      <div className="flex items-start sm:items-center gap-3">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {getUserInitials(c.customerName)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{c.customerName}</h3>
            <Badge 
              className={
                (c.status || '').toUpperCase() === 'OVERDUE' ? 'bg-red-500 text-white hover:bg-red-600' :
                (c.status || '').toUpperCase() === 'PENDING' ? 'bg-yellow-500 text-white hover:bg-yellow-600' :
                (c.status || '').toUpperCase() === 'PARTIAL' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                (c.status || '').toUpperCase() === 'PAID' ? 'bg-green-500 text-white hover:bg-green-600' :
                'bg-gray-500 text-white hover:bg-gray-600'
              }
            >
              {(c.status || "N/A").toUpperCase()}
            </Badge>
            {c.amountBorrowed && Number(c.amountBorrowed) > 0 && (
              <Badge className="bg-accent-soft text-accent">
                ₹{Number(c.amountBorrowed).toLocaleString()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {c.customerVehicleNum ? `Vehicle: ${c.customerVehicleNum}` : "Vehicle: —"}
            {c.custId && <span className="ml-2 text-xs">ID: {c.custId}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phoneNumber || "—"}</div>
            <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email || "—"}</div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Borrow: {formatDate(c.borrowDate)}</span>
            <span>Due: {formatDate(c.dueDate)}</span>
            {c.empId && <span>Emp: {c.empId}</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" title="Transaction History" onClick={() => onHistory(c)} disabled={!c.custId}>
          <HistoryIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" title="Record Transaction" onClick={() => onTransaction(c)} disabled={!c.custId}>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" title="Edit Borrower" onClick={() => onEdit(c)}>
          <Edit className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Switch
            checked={c.lifecycleStatus === 'ACTIVE'}
            onCheckedChange={() => onToggleLifecycleStatus(c)}
            className={c.lifecycleStatus === 'ACTIVE' ? "bg-green-500" : "bg-gray-300"}
          />
          <span className="text-sm text-muted-foreground">
            {c.lifecycleStatus === 'ACTIVE' ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}

