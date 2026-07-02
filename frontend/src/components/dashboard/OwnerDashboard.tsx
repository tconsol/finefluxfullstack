import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, Fuel, CreditCard, TrendingUp, DollarSign, AlertTriangle, BarChart3, Eye, RotateCcw,
  Activity, Droplets, Package
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

const safeArray = (v: any) =>
  Array.isArray(v) ? v :
    Array.isArray(v?.content) ? v.content : [];

// Indian number format helper
const formatIndianNumber = (num: number): string => {
  return num.toLocaleString('en-IN');
};

// Format large numbers in Indian format (Lakhs, Crores)
const formatIndianCurrency = (num: number): string => {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  let formatted = '';
  if (absNum >= 10000000) { // 1 Crore
    formatted = `₹${(absNum / 10000000).toFixed(2)} Cr`;
  } else if (absNum >= 100000) { // 1 Lakh
    formatted = `₹${(absNum / 100000).toFixed(2)} L`;
  } else if (absNum >= 1000) { // 1 Thousand
    formatted = `₹${(absNum / 1000).toFixed(2)} K`;
  } else {
    formatted = `₹${formatIndianNumber(absNum)}`;
  }
  
  return isNegative ? `-${formatted}` : formatted;
};

export function OwnerDashboard() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem("organizationId") || "";
  const [mounted, setMounted] = useState(false);

  const [employees, setEmployees] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState({ 
    employees: true, 
    tanks: true, 
    borrowers: true,
    sales: true,
    expenses: true,
    inventory: true
  });
  const [error, setError] = useState<{ 
    employees: string | null; 
    tanks: string | null; 
    borrowers: string | null;
    sales: string | null;
    expenses: string | null;
    inventory: string | null;
  }>({
    employees: null, 
    tanks: null, 
    borrowers: null,
    sales: null,
    expenses: null,
    inventory: null
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAll = useCallback(() => {
    if (!orgId) {
      setError({
        employees: "No Organization ID",
        tanks: "No Organization ID",
        borrowers: "No Organization ID",
        sales: "No Organization ID",
        expenses: "No Organization ID",
        inventory: "No Organization ID",
      });
      setLoading({ employees: false, tanks: false, borrowers: false, sales: false, expenses: false, inventory: false });
      return;
    }
    setLoading({ employees: true, tanks: true, borrowers: true, sales: true, expenses: true, inventory: true });
    setError({ employees: null, tanks: null, borrowers: null, sales: null, expenses: null, inventory: null });
    
    // Get today's date in YYYY-MM-DD format for sales filter
    const today = new Date().toISOString().split('T')[0];
    
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/employees`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/products`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/customers`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/sales`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/api/organizations/${orgId}/expenses`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/api/organizations/${orgId}/inventories`).catch(() => ({ data: [] })),
    ])
      .then(([empRes, tankRes, borrowRes, salesRes, expensesRes, inventoryRes]) => {
        setEmployees(safeArray(empRes.data));
        setTanks(safeArray(tankRes.data));
        setBorrowers(safeArray(borrowRes.data));
        setSales(safeArray(salesRes.data));
        setExpenses(safeArray(expensesRes.data));
        setInventory(safeArray(inventoryRes.data));
        setLoading({ employees: false, tanks: false, borrowers: false, sales: false, expenses: false, inventory: false });
      })
      .catch(err => {
        const errMsg = err?.message || 'Error loading data.';
        setError({
          employees: errMsg,
          tanks: errMsg,
          borrowers: errMsg,
          sales: errMsg,
          expenses: errMsg,
          inventory: errMsg,
        });
        setLoading({ employees: false, tanks: false, borrowers: false, sales: false, expenses: false, inventory: false });
      });
  }, [orgId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => {
    // Today's sales calculation
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s: any) => s.saleDate?.startsWith(today) || s.date?.startsWith(today));
    const todayRevenue = todaySales.reduce((sum, s) => {
      const amount = Number(s.totalAmount) || Number(s.amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Today's expenses
    const todayExpenses = expenses.filter((e: any) => e.expenseDate?.startsWith(today) || e.date?.startsWith(today));
    const todayExpenseTotal = todayExpenses.reduce((sum, e) => {
      const amount = Number(e.amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Profit calculation
    const todayProfit = todayRevenue - todayExpenseTotal;
    
    // Active employees
    const activeEmployees = employees.filter((e: any) => 
      e.status?.toLowerCase() === 'active' || e.status?.toUpperCase() === 'ACTIVE'
    ).length;
    
    // Outstanding credit calculation with safety check
    const outstandingCredit = borrowers.reduce((sum, b) => {
      const amount = Number(b.amountBorrowed) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    return [
      {
        title: 'Today\'s Revenue',
        value: formatIndianCurrency(todayRevenue),
        change: `${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''}`,
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
      },
      {
        title: 'Today\'s Profit',
        value: formatIndianCurrency(todayProfit),
        change: todayProfit >= 0 ? 'Profit' : 'Loss',
        icon: DollarSign,
        color: todayProfit >= 0 ? 'text-blue-600' : 'text-red-600',
        bgColor: todayProfit >= 0 ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-red-100 dark:bg-red-900/20',
      },
      {
        title: 'Active Employees',
        value: loading.employees ? '...' : String(activeEmployees),
        change: `${employees.length} total`,
        icon: Users,
        color: 'text-primary',
        bgColor: 'bg-primary-soft',
      },
      {
        title: 'Today\'s Expenses',
        value: formatIndianCurrency(todayExpenseTotal),
        change: `${todayExpenses.length} expense${todayExpenses.length !== 1 ? 's' : ''}`,
        icon: CreditCard,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      },
      {
        title: 'Active Fuel Tanks',
        value: loading.tanks ? '...' : String(tanks.filter((t: any) => t.status).length),
        change: `${tanks.length} total`,
        icon: Fuel,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      },
      {
        title: 'Outstanding Credit',
        value: formatIndianCurrency(outstandingCredit),
        change: `${borrowers.length} borrower${borrowers.length !== 1 ? 's' : ''}`,
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      },
    ];
  }, [employees, tanks, borrowers, sales, expenses, loading.employees, loading.tanks, loading.borrowers]);

  const tankData = useMemo(() => safeArray(tanks).map((tank: any) => ({
    id: tank.id,
    name: tank.productName,
    capacity: Number(tank.tankCapacity) || 0,
    current: Number(tank.currentLevel) || 0,
    lastRefill: tank.lastUpdated ? new Date(tank.lastUpdated).toLocaleDateString('en-IN') : '',
    sales: 0
  })), [tanks]);

  const recentBorrowers = useMemo(() => safeArray(borrowers).slice(0, 4).map((borrower: any) => ({
    id: borrower.id,
    name: borrower.customerName,
    amount: Number(borrower.amountBorrowed) || 0,
    lastPayment: borrower.borrowDate || '',
    status: borrower.status === 'overdue' ? 'overdue' : 'current',
  })), [borrowers]);

  const financialSummary = useMemo(() => {
    // Total stock value with safety checks
    const totalStockValue = safeArray(tanks).reduce(
      (sum: number, tank: any) => {
        const currentLevel = Number(tank.currentLevel) || 0;
        const rate = Number(tank.ratePerLitre) || Number(tank.productRate) || Number(tank.price) || 0;
        const value = currentLevel * rate;
        return sum + (isNaN(value) ? 0 : value);
      },
      0
    );
    
    // Today's date for filtering
    const today = new Date().toISOString().split('T')[0];
    
    // Today's sales revenue with safety checks
    const todaySales = sales.filter((s: any) => 
      s.saleDate?.startsWith(today) || s.date?.startsWith(today)
    );
    const todayRevenue = todaySales.reduce((sum, s) => {
      const amount = Number(s.totalAmount) || Number(s.amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Today's expenses with safety checks
    const todayExpenses = expenses.filter((e: any) => 
      e.expenseDate?.startsWith(today) || e.date?.startsWith(today)
    );
    const todayExpenseTotal = todayExpenses.reduce((sum, e) => {
      const amount = Number(e.amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Total outstanding credit with safety checks
    const totalOutstanding = safeArray(borrowers).reduce(
      (sum: number, b: any) => {
        const amount = Number(b.amountBorrowed) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 
      0
    );
    
    // Net position (today's profit)
    const netPosition = todayRevenue - todayExpenseTotal;
    
    return {
      totalStockValue,
      todayRevenue,
      todayExpenseTotal,
      totalOutstanding,
      netPosition,
    };
  }, [tanks, borrowers, sales, expenses]);

  const getStockPercentage = (current: number, capacity: number) =>
    capacity ? Math.round((current / capacity) * 100) : 0;

  const getStockStatus = (percentage: number) => {
    if (percentage < 20) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', label: 'Critical' };
    if (percentage < 50) return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', label: 'Medium' };
    return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', label: 'Good' };
  };

  return (
    <div className={`space-y-8 -mt-8 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes progress-fill {
          from { width: 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        .animate-progress {
          animation: progress-fill 1s ease-out forwards;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
        .stagger-6 { animation-delay: 0.6s; }
      `}</style>

      {/* Header */}
      {/* Header */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] sm:items-center gap-3 opacity-0 animate-slide-up">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Owner Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2 mt-1">
            <Activity className="h-4 w-4" />
            Real-time overview of your petrol bunk operations
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-start sm:justify-end mt-2 sm:mt-0 shrink-0">
          <Button
            onClick={fetchAll}
            variant="outline"
            title="Refresh Data"
            className="border-border/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            className="bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => navigate('/analytics')}
          >
            <BarChart3 className="mr-2 h-4 w-4 text-white" />
            <span className="text-white">View Analytics</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={`stat-card hover-lift opacity-0 animate-slide-up stagger-${idx + 1} shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div>
                      <p className="text-base font-bold text-foreground mt-0.5">{stat.value}</p>
                      {stat.change && <p className="text-[10px] text-muted-foreground mt-0.5">{stat.change}</p>}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Tank Inventory */}
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-slide-up stagger-1">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Droplets className="h-5 w-5 text-primary" />
              </div>
              Tank Inventory Status
              {!loading.tanks && <Badge variant="secondary" className="ml-auto">{tankData.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {loading.tanks ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error.tanks ? (
              <p className="text-destructive text-center py-8">{error.tanks}</p>
            ) : tankData.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="text-muted-foreground">No tanks found</p>
              </div>
            ) : (
              tankData.map((tank, idx) => {
                const percentage = getStockPercentage(tank.current, tank.capacity);
                const status = getStockStatus(percentage);

                return (
                  <div
                    key={tank.id}
                    className="space-y-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {tank.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatIndianNumber(tank.current)}L / {formatIndianNumber(tank.capacity)}L
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${status.color} whitespace-nowrap`}
                      >
                        {percentage}% • {status.label}
                      </Badge>
                    </div>

                    <div className="relative w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 ${status.bg} rounded-full transition-all duration-1000 ease-out shadow-lg animate-progress`}
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Last refill: {tank.lastRefill}
                      </span>
                      <span>Sales: {tank.sales}L today</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Borrowers Overview */}
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-slide-up stagger-2">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Borrowers Overview
              {!loading.borrowers && <Badge variant="secondary" className="ml-auto">{recentBorrowers.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {loading.borrowers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error.borrowers ? (
              <p className="text-destructive text-center py-8">{error.borrowers}</p>
            ) : recentBorrowers.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="text-muted-foreground">No borrowers found</p>
              </div>
            ) : (
              <>
                {recentBorrowers.map((borrower) => (
                  <div
                    key={borrower.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {borrower.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last payment: {borrower.lastPayment}
                      </p>
                    </div>
                    <div className="text-right space-y-1.5">
                      <p className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        ₹{formatIndianNumber(borrower.amount)}
                      </p>
                      <Badge
                        variant={borrower.status === 'overdue' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {borrower.status === 'overdue' ? (
                          <>
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Overdue
                          </>
                        ) : (
                          'Current'
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
                {borrowers.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                    onClick={() => navigate('/borrowers')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View All {borrowers.length} Borrowers
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden opacity-0 animate-slide-up stagger-3">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Money Management Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Stock Value</p>
              <p className="text-base font-bold text-primary">
                {formatIndianCurrency(financialSummary.totalStockValue)}
              </p>
              <p className="text-[10px] text-muted-foreground">Current Inventory</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Today's Revenue</p>
              <p className="text-base font-bold text-green-600 dark:text-green-400">
                {formatIndianCurrency(financialSummary.todayRevenue)}
              </p>
              <p className="text-[10px] text-muted-foreground">Sales Income</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Today's Expenses</p>
              <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                {formatIndianCurrency(financialSummary.todayExpenseTotal)}
              </p>
              <p className="text-[10px] text-muted-foreground">Operating Costs</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Outstanding Credit</p>
              <p className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                {formatIndianCurrency(financialSummary.totalOutstanding)}
              </p>
              <p className="text-[10px] text-muted-foreground">Pending Recovery</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Today's Profit</p>
              <p className={`text-base font-bold ${
                financialSummary.netPosition >= 0 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatIndianCurrency(financialSummary.netPosition)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {financialSummary.netPosition >= 0 ? 'Net Profit' : 'Net Loss'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
