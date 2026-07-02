import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign, Plus, TrendingDown, Clock, CheckCircle, XCircle, Calendar, Receipt, Filter, Edit, Trash2, X, Eye, Search, FileText, Wallet, Tag, ArrowUpDown, LayoutGrid, LayoutList
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import PopupClose from "@/components/PopupClose";
import { API_CONFIG } from '@/lib/api-config';
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";

// Removed - using API_CONFIG

const getLocal = (k: string) => {
  const v = localStorage.getItem(k);
  return v ?? "";
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  categoryName: string;
  expenseDate: string;
  organizationId: string;
  empId?: string;
  status?: string;
  requestedBy?: string;
  approvedBy?: string | null;
  receipt?: boolean;
};

type ExpenseCategory = {
  id: string;
  categoryName: string;
  organizationId: string;
};

export default function Expenses() {
  const { toast } = useToast();

  const orgId = getLocal("organizationId") || getLocal("orgId") || "FOS-8127";
  const empId = getLocal("empId") || "EMP001";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCat, setExpenseCat] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [deleteExpenseConfirmId, setDeleteExpenseConfirmId] = useState<string | null>(null);
  const [deleteExpenseLoading, setDeleteExpenseLoading] = useState(false);

  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expenses`)
      .then(res => setExpenses(res.data))
      .catch(() => setExpenses([]));

    axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expense-categories`)
      .then(res => {
        setCategories(res.data);
        if (res.data.length && !expenseCat) setExpenseCat(res.data[0].categoryName);
      })
      .catch(() => setCategories([]));
  }, [orgId, refreshToken]);

  const categoryStats = categories.map(cat => {
    const catExpenses = expenses.filter(exp => exp.categoryName === cat.categoryName);
    return {
      ...cat,
      total: catExpenses.reduce((sum, e) => sum + e.amount, 0),
      count: catExpenses.length
    };
  });

  const stats = [
    {
      title: 'Total Expenses',
      value: `₹${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`,
      change: 'This month',
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive-soft',
    },
    {
      title: 'Categories',
      value: categories.length.toString(),
      change: 'Expense categories',
      icon: Filter,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Average Expense',
      value: expenses.length ? `₹${Math.round(expenses.reduce((s, e) => s + e.amount, 0) / expenses.length).toLocaleString()}` : '₹0',
      change: 'Per expense',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    }
  ];

  const openCreateCategoryModal = () => {
    setEditingCategory(null); setNewCategoryName(''); setCategoryError(''); setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: ExpenseCategory) => {
    setEditingCategory(cat); setNewCategoryName(cat.categoryName); setCategoryError(''); setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setEditingCategory(null); setShowCategoryModal(false); setCategoryLoading(false);
    setCategoryError(''); setNewCategoryName('');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    if (!newCategoryName.trim()) { setCategoryError("Category name required."); return; }
    setCategoryLoading(true);
    try {
      let message = '';
      if (editingCategory) {
        const res = await axios.put(
          `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expense-categories/${editingCategory.id}`,
          { categoryName: newCategoryName.trim(), organizationId: orgId }
        );
        message = `Category "${res.data.categoryName}" updated.`;
      } else {
        const res = await axios.post(
          `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expense-categories`,
          { categoryName: newCategoryName.trim(), organizationId: orgId }
        );
        message = `Category "${res.data.categoryName}" created.`;
      }
      closeCategoryModal();
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: message, variant: "default" });
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || (editingCategory ? "Failed to update category." : "Failed to create category."));
      toast({ title: "Error", description: (editingCategory ? "Failed to update category." : "Failed to create category."), variant: "destructive" });
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryLoading(true); setCategoryError('');
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expense-categories/${id}`);
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: "Category deleted.", variant: "default" });
      setDeleteCategoryConfirmId(null);
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || "Delete failed.");
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    } finally {
      setCategoryLoading(false);
    }
  };

  const openCreateExpenseModal = () => {
    setEditingExpense(null);
    setShowExpenseModal(true);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCat(categories[0]?.categoryName || '');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setExpenseError('');
  };

  const openEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseDesc(expense.description);
    setExpenseAmount(expense.amount.toString());
    setExpenseCat(expense.categoryName);
    setExpenseDate(expense.expenseDate);
    setExpenseError('');
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setEditingExpense(null);
    setShowExpenseModal(false);
    setExpenseLoading(false);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCat(categories[0]?.categoryName || '');
    setExpenseError('');
  };

  const handleCreateOrUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');
    if (!expenseDesc.trim() || !expenseAmount || !expenseCat) {
      setExpenseError('All fields required.');
      toast({ title: "Error", description: "All fields required.", variant: "destructive" });
      return;
    }
    setExpenseLoading(true);
    try {
      const payload = {
        description: expenseDesc,
        amount: parseFloat(expenseAmount),
        categoryName: expenseCat,
        expenseDate: expenseDate,
        organizationId: orgId,
        empId: empId
      };

      if (editingExpense) {
        await axios.put(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expenses/${editingExpense.id}`, payload);
        toast({ title: "Success", description: "Expense updated successfully.", variant: "default" });
      } else {
        await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expenses`, payload);
        toast({ title: "Success", description: "Expense created successfully.", variant: "default" });
      }
      setRefreshToken(v => v + 1);
      closeExpenseModal();
    } catch (err: any) {
      setExpenseError(err?.response?.data?.message || "Failed to save expense.");
      toast({ title: "Error", description: "Failed to save expense.", variant: "destructive" });
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeleteExpenseLoading(true);
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expenses/${id}`);
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: "Expense deleted.", variant: "default" });
      setDeleteExpenseConfirmId(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete expense.",
        variant: "destructive"
      });
    } finally {
      setDeleteExpenseLoading(false);
    }
  };

  const formatDate = (date: string) => dayjs(date).format("DD MMM YYYY");

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.empId?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = filterCategory === 'all' || expense.categoryName === filterCategory;
      
      // Date filter
      let matchesDate = true;
      const expenseDate = dayjs(expense.expenseDate);
      const today = dayjs();
      
      if (dateFilter === 'today') {
        matchesDate = expenseDate.isSame(today, 'day');
      } else if (dateFilter === 'week') {
        matchesDate = expenseDate.isAfter(today.subtract(7, 'day')) && expenseDate.isBefore(today.add(1, 'day'));
      } else if (dateFilter === 'month') {
        matchesDate = expenseDate.isSame(today, 'month');
      } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
        matchesDate = expenseDate.isAfter(dayjs(customDateFrom).subtract(1, 'day')) && 
                     expenseDate.isBefore(dayjs(customDateTo).add(1, 'day'));
      }
      
      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [expenses, searchQuery, filterCategory, dateFilter, customDateFrom, customDateTo]);

  const totalExpenses = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0), 
    [filteredExpenses]
  );

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const colors = { pending: "bg-warning-soft text-warning", approved: "bg-success-soft text-success", rejected: "bg-destructive-soft text-destructive" };
    const icons = { pending: Clock, approved: CheckCircle, rejected: XCircle };
    const Icon = icons[status as keyof typeof icons];
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-muted text-muted-foreground"}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-muted-foreground">Track and approve business expenses</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="btn-gradient-primary w-full sm:w-auto" onClick={openCreateExpenseModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={openCreateCategoryModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Expense Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryStats.map((category, index) => {
              const colors = [
                { bg: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", text: "text-blue-600", badge: "bg-blue-500" },
                { bg: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-600", badge: "bg-emerald-500" },
                { bg: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", text: "text-purple-600", badge: "bg-purple-500" },
                { bg: "from-orange-500/10 to-orange-600/5", border: "border-orange-500/20", text: "text-orange-600", badge: "bg-orange-500" },
                { bg: "from-pink-500/10 to-pink-600/5", border: "border-pink-500/20", text: "text-pink-600", badge: "bg-pink-500" },
                { bg: "from-cyan-500/10 to-cyan-600/5", border: "border-cyan-500/20", text: "text-cyan-600", badge: "bg-cyan-500" },
              ];
              const color = colors[index % colors.length];
              const percentage = totalExpenses > 0 ? ((category.total / totalExpenses) * 100).toFixed(1) : 0;

              return (
                <div 
                  key={category.id} 
                  className={`relative p-4 rounded-xl bg-gradient-to-br ${color.bg} border ${color.border} hover:shadow-lg transition-all duration-200 group`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${color.badge} bg-opacity-10`}>
                        <Tag className={`h-4 w-4 ${color.text}`} />
                      </div>
                      <Badge className={`${color.badge} text-white border-0`}>
                        {category.categoryName}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 bg-amber-100 text-amber-600 hover:bg-amber-200"
                        onClick={() => openEditCategoryModal(category)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 bg-red-100 text-red-600 hover:bg-red-200"
                        onClick={() => setDeleteCategoryConfirmId(category.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${color.text}`}>
                        ₹{category.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{category.count} expense{category.count !== 1 ? 's' : ''}</span>
                      <span className="font-medium">{percentage}%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full ${color.badge} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {!categories.length && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No categories found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Expenses ({filteredExpenses.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.categoryName}>
                      {cat.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full sm:w-36"
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full sm:w-36"
                    placeholder="To"
                  />
                </>
              )}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">
                  {searchQuery || filterCategory !== 'all' ? 'No expenses found' : 'No expenses recorded'}
                </p>
                <p className="text-sm">
                  {searchQuery || filterCategory !== 'all' ? 'Try adjusting your filters' : 'Add your first expense to get started'}
                </p>
              </div>
            ) : (
              viewMode === 'table' ? (
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs">Date</TableHead>
                        <TableHead className="font-semibold text-xs">Description</TableHead>
                        <TableHead className="font-semibold text-xs">Category</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
                        <TableHead className="font-semibold text-xs">Requested By</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setViewingExpense(expense)}>
                          <TableCell className="text-xs">{formatDate(expense.expenseDate)}</TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate">{expense.description}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] px-1.5 py-0">{expense.categoryName}</Badge></TableCell>
                          <TableCell className="text-right text-xs font-bold text-destructive">₹{expense.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{expense.requestedBy || expense.empId || '—'}</TableCell>
                          <TableCell>{getStatusBadge(expense.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 bg-blue-100 text-blue-600 hover:bg-blue-200" onClick={() => setViewingExpense(expense)}><Eye className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 bg-amber-100 text-amber-600 hover:bg-amber-200" onClick={() => openEditExpenseModal(expense)}><Edit className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 bg-red-100 text-red-600 hover:bg-red-200" onClick={() => setDeleteExpenseConfirmId(expense.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
              filteredExpenses.map((expense) => (
                <div 
                  key={expense.id} 
                  className="group relative p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-border hover:border-primary/50 cursor-pointer"
                  onClick={() => setViewingExpense(expense)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="bg-destructive-soft p-3 rounded-lg shrink-0">
                        <Wallet className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{expense.description}</h3>
                          <Badge variant="outline">{expense.categoryName}</Badge>
                          {getStatusBadge(expense.status)}
                          {expense.receipt && (
                            <Badge className="bg-accent-soft text-accent">
                              <Receipt className="mr-1 h-3 w-3" />
                              Receipt
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(expense.expenseDate)}</span>
                          </div>
                          <div className="h-3 w-px bg-border" />
                          <span>By {expense.requestedBy || expense.empId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-2">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-xl font-bold text-destructive">₹{expense.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-blue-100 text-blue-600 hover:bg-blue-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingExpense(expense);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-amber-100 text-amber-600 hover:bg-amber-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditExpenseModal(expense);
                          }}
                          title="Edit Expense"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-red-100 text-red-600 hover:bg-red-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteExpenseConfirmId(expense.id);
                          }}
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCategoryModal();
          }}
        >
          <div className="bg-background rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <PopupClose onClick={closeCategoryModal} />
            <div className="mb-6">
              <h3 className="text-2xl font-bold">{editingCategory ? "Edit" : "New"} Expense Category</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {editingCategory ? 'Update category name' : 'Create a new expense category'}
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleCategorySubmit}>
              <div className="space-y-2">
                <Label htmlFor="expense-cat-name">Category Name <span className="text-destructive">*</span></Label>
                <Input
                  id="expense-cat-name"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g., Office Supplies, Travel, etc."
                />
              </div>
              {categoryError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{categoryError}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeCategoryModal}>Cancel</Button>
                <Button type="submit" disabled={categoryLoading} className="btn-gradient-primary">
                  {categoryLoading ? "Saving..." : editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeExpenseModal();
          }}
        >
          <div className="bg-background rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <PopupClose onClick={closeExpenseModal} />
            <div className="mb-6">
              <h3 className="text-2xl font-bold">{editingExpense ? 'Edit' : 'Add'} Expense</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {editingExpense ? 'Update expense details' : 'Record a new business expense'}
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleCreateOrUpdateExpense}>
              <div className="space-y-2">
                <Label htmlFor="date">Expense Date <span className="text-destructive">*</span></Label>
                <Input
                  id="date" 
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Category <span className="text-destructive">*</span></Label>
                <Select value={expenseCat} onValueChange={(value) => setExpenseCat(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className='z-[10000]'>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.categoryName}>
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description <span className="text-destructive">*</span></Label>
                <Textarea
                  id="desc" 
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  required 
                  autoFocus
                  placeholder="Enter expense description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) <span className="text-destructive">*</span></Label>
                <Input
                  id="amount" 
                  type="number" 
                  min={1} 
                  step="0.01"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>
              {expenseError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{expenseError}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeExpenseModal}>Cancel</Button>
                <Button type="submit" disabled={expenseLoading} className="btn-gradient-primary">
                  {expenseLoading ? "Saving..." : editingExpense ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CATEGORY CONFIRMATION */}
      {deleteCategoryConfirmId && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteCategoryConfirmId(null);
          }}
        >
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Confirm Delete Category</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteCategoryConfirmId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteCategory(deleteCategoryConfirmId!)}
                disabled={categoryLoading}
              >
                {categoryLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EXPENSE CONFIRMATION */}
      {deleteExpenseConfirmId && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteExpenseConfirmId(null);
          }}
        >
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Confirm Delete Expense</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteExpenseConfirmId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteExpense(deleteExpenseConfirmId!)}
                disabled={deleteExpenseLoading}
              >
                {deleteExpenseLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW EXPENSE DETAIL MODAL */}
      {viewingExpense && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingExpense(null);
          }}
        >
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border rounded-t-2xl p-6">
              <PopupClose onClick={() => setViewingExpense(null)} />

              <div className="flex items-start gap-4 pr-10">
                <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 shrink-0">
                  <Wallet className="h-8 w-8 text-destructive" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{viewingExpense.description}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-sm">
                      {viewingExpense.categoryName}
                    </Badge>
                    {getStatusBadge(viewingExpense.status)}
                    {viewingExpense.receipt && (
                      <Badge className="bg-accent-soft text-accent">
                        <Receipt className="mr-1 h-3 w-3" />
                        Has Receipt
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Amount and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <DollarSign className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
                      <p className="text-2xl font-bold text-destructive">₹{viewingExpense.amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                      <p className="text-lg font-semibold">{formatDate(viewingExpense.expenseDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Requested By</p>
                    <p className="font-medium">{viewingExpense.requestedBy || viewingExpense.empId || 'N/A'}</p>
                  </div>
                  {viewingExpense.approvedBy && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Approved By</p>
                      <p className="font-medium">{viewingExpense.approvedBy}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Organization ID</p>
                    <p className="font-medium font-mono text-sm">{viewingExpense.organizationId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-background border-t border-border p-6 rounded-b-2xl">
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setViewingExpense(null);
                    openEditExpenseModal(viewingExpense);
                  }}
                  variant="outline"
                  className="flex-1 h-11"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Expense
                </Button>
                <Button
                  onClick={() => setViewingExpense(null)}
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



