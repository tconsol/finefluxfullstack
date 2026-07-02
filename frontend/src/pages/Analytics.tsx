import { useState, useMemo, useTransition, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_CONFIG } from '@/lib/api-config';

import { 
  CalendarDays, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Download, 
  Droplets, 
  Users,
  FileText,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const RUPEE = '₹';

// Indian number format helper
const formatIndianNumber = (num: number): string => {
  return num.toLocaleString('en-IN');
};

export default function Analytics() {
  const orgId = localStorage.getItem('organizationId') || '';
  const [timeRange, setTimeRange] = useState('30d');
  const [isPending, startTransition] = useTransition();

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = dayjs();
    switch (timeRange) {
      case '7d':
        return { from: now.subtract(7, 'day'), to: now };
      case '30d':
        return { from: now.subtract(30, 'day'), to: now };
      case '90d':
        return { from: now.subtract(90, 'day'), to: now };
      case '1y':
        return { from: now.subtract(1, 'year'), to: now };
      default:
        return { from: now.subtract(30, 'day'), to: now };
    }
  };

  const { from, to } = getDateRange();
  const fromIso = from.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
  const toIso = to.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

  // Fetch Sales with real-time updates - UPDATED TO USE SALES API
  const { data: salesData = [], isLoading: loadingSales, isFetching: fetchingSales, refetch: refetchSales } = useQuery({
    queryKey: ['sales-analytics', orgId, fromIso, toIso],
    queryFn: async () => {
      try {
        // Use the sales API endpoint instead of sale-history
        const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sales`;
        const res = await axios.get(url, { timeout: API_CONFIG.TIMEOUT });
        const data = Array.isArray(res.data) ? res.data : [];
        
        // Filter by date range on the client side
        return data.filter((sale: any) => {
          if (!sale.dateTime) return false;
          const saleDate = dayjs(sale.dateTime);
          return saleDate.isAfter(from.subtract(1, 'day')) && saleDate.isBefore(to.add(1, 'day'));
        });
      } catch (error) {
        console.error('Error fetching sales:', error);
        return [];
      }
    },
    enabled: !!orgId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Transform sales data to match expected format - FIXED
  const salesHistory = useMemo(() => {
    if (!salesData || !Array.isArray(salesData)) return [];
    
    return salesData.map((sale: any) => {
      // Handle different possible field names from API
      const amount = Number(sale.salesInRupees || sale.totalAmount || sale.amount || 0);
      const liters = Number(sale.salesInLiters || sale.quantity || sale.liters || 0);
      const product = sale.productName || sale.product || 'Unknown';
      const date = sale.dateTime || sale.saleDate || sale.createdAt;
      
      return {
        ...sale,
        salesInRupees: amount,
        salesInLiters: liters,
        productName: product,
        dateTime: date
      };
    });
  }, [salesData]);

  // Fetch Expenses with real-time updates - FIXED
  const { data: expensesData = [], isLoading: loadingExpenses, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses-analytics', orgId],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/expenses`, { timeout: API_CONFIG.TIMEOUT });
        const data = Array.isArray(res.data) ? res.data : [];
        return data;
      } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }
    },
    enabled: !!orgId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Filter expenses by date range
  const expenses = useMemo(() => {
    if (!expensesData || !Array.isArray(expensesData)) return [];
    
    return expensesData.filter(e => {
      if (!e.expenseDate && !e.date && !e.createdAt) return false;
      const expDate = dayjs(e.expenseDate || e.date || e.createdAt);
      return expDate.isAfter(from.subtract(1, 'day')) && expDate.isBefore(to.add(1, 'day'));
    }).map(e => ({
      ...e,
      amount: Number(e.amount || e.totalAmount || e.expenseAmount || 0),
      expenseDate: e.expenseDate || e.date || e.createdAt
    }));
  }, [expensesData, from, to]);

  // Fetch Latest Finance Summary
  const { data: financeSummary, isLoading: loadingFinance, refetch: refetchFinance } = useQuery({
    queryKey: ['finance-summary-latest', orgId],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/finance-summary/latest`, { timeout: API_CONFIG.TIMEOUT });
        
        // Ensure all fields are numbers
        const data = res.data;
        return {
          id: data.id,
          organizationId: data.organizationId,
          createdAt: data.createdAt,
          cashReceived: Number(data.cashReceived) || 0,
          phonePay: Number(data.phonePay) || 0,
          creditCard: Number(data.creditCard) || 0,
          petrolInventory: Number(data.petrolInventory) || 0,
          dieselInventory: Number(data.dieselInventory) || 0,
          premiumPetrolInventory: Number(data.premiumPetrolInventory) || 0,
          cngInventory: Number(data.cngInventory) || 0,
          twoTInventory: Number(data.twoTInventory) || 0,
          totalExpenses: Number(data.totalExpenses) || 0,
          description: data.description || '',
          total: Number(data.total) || 0,
        };
      } catch (error: any) {
        console.error('❌ Error fetching finance summary:', error?.response?.status, error?.response?.data);
        return null;
      }
    },
    enabled: !!orgId,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  // Manual refresh all data
  const handleRefresh = () => {
    refetchSales();
    refetchExpenses();
    refetchFinance();
  };

  // Calculate KPIs - FIXED with proper data validation
  const kpis = useMemo(() => {
    // Calculate total revenue from sales
    const totalRevenue = salesHistory.reduce((sum, s) => {
      const amount = Number(s.salesInRupees) || 0;
      return sum + amount;
    }, 0);
    
    // Calculate total expenses - already filtered by date range
    const totalExpenses = expenses.reduce((sum, e) => {
      const amount = Number(e.amount) || 0;
      return sum + amount;
    }, 0);
    
    // Calculate net profit
    const netProfit = totalRevenue - totalExpenses;
    
    // Calculate total liters sold
    const totalLiters = salesHistory.reduce((sum, s) => {
      const liters = Number(s.salesInLiters) || 0;
      return sum + liters;
    }, 0);


    return { 
      totalRevenue: Math.round(totalRevenue * 100) / 100, 
      netProfit: Math.round(netProfit * 100) / 100, 
      totalExpenses: Math.round(totalExpenses * 100) / 100, 
      totalLiters: Math.round(totalLiters * 100) / 100 
    };
  }, [salesHistory, expenses]);

  // Monthly Sales & Profit Data (for line chart) - FIXED
  const monthlySalesData = useMemo(() => {
    const monthlyMap: Record<string, { sales: number; expenses: number; profit: number; timestamp: number }> = {};

    // Aggregate sales by month
    salesHistory.forEach(sale => {
      if (!sale.dateTime) return;
      const saleDate = dayjs(sale.dateTime);
      const month = saleDate.format('MMM YYYY'); // Changed to full year format
      if (!monthlyMap[month]) {
        monthlyMap[month] = { 
          sales: 0, 
          expenses: 0, 
          profit: 0, 
          timestamp: saleDate.startOf('month').unix() 
        };
      }
      const amount = Number(sale.salesInRupees) || 0;
      monthlyMap[month].sales += amount;
    });

    // Aggregate expenses by month - expenses already filtered
    expenses.forEach(exp => {
      if (!exp.expenseDate) return;
      const expDate = dayjs(exp.expenseDate);
      const month = expDate.format('MMM YYYY'); // Changed to full year format
      if (!monthlyMap[month]) {
        monthlyMap[month] = { 
          sales: 0, 
          expenses: 0, 
          profit: 0, 
          timestamp: expDate.startOf('month').unix() 
        };
      }
      const amount = Number(exp.amount) || 0;
      monthlyMap[month].expenses += amount;
    });

    // Calculate profit for each month and sort by timestamp
    const result = Object.entries(monthlyMap)
      .map(([name, data]) => ({
        name,
        sales: Math.round(data.sales),
        expenses: Math.round(data.expenses),
        profit: Math.round(data.sales - data.expenses),
        timestamp: data.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return result.slice(-6); // Last 6 months
  }, [salesHistory, expenses]);

  // Fuel Type Distribution (Pie Chart) - FIXED
  const fuelTypeData = useMemo(() => {
    const fuelMap: Record<string, number> = {};
    
    salesHistory.forEach(sale => {
      const product = (sale.productName || 'Unknown').trim();
      const amount = Number(sale.salesInRupees) || 0;
      fuelMap[product] = (fuelMap[product] || 0) + amount;
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const result = Object.entries(fuelMap)
      .map(([name, value], idx) => ({
        name,
        value: Math.round(value),
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.value - a.value); // Sort by revenue descending

    return result;
  }, [salesHistory]);

  // Daily Sales (Last 7 days - Bar Chart) - FIXED with timezone
  const dailySalesData = useMemo(() => {
    const today = dayjs();
    const last7Days = Array.from({ length: 7 }, (_, i) => today.subtract(6 - i, 'day'));
    
    const result = last7Days.map(day => {
      const dayStr = day.format('DD MMM');
      
      // Filter sales for this specific day
      const daySales = salesHistory.filter(s => {
        if (!s.dateTime) return false;
        const saleDate = dayjs(s.dateTime);
        return saleDate.isSame(day, 'day');
      });
      
      // Group by product
      const productMap: Record<string, number> = {};
      let totalDaySales = 0;
      
      daySales.forEach(s => {
        const product = (s.productName || 'Unknown').trim();
        const amount = Number(s.salesInRupees) || 0;
        productMap[product] = (productMap[product] || 0) + amount;
        totalDaySales += amount;
      });

      // Create result object with product data
      const dayData: Record<string, any> = { 
        day: dayStr,
        date: day.format('YYYY-MM-DD'),
        total: Math.round(totalDaySales)
      };
      
      // Add each product with normalized key
      Object.entries(productMap).forEach(([product, amount]) => {
        // Normalize product name for chart key
        const key = product.toLowerCase().replace(/[^a-z0-9]/g, '');
        dayData[key] = Math.round(amount);
        dayData[`${key}_name`] = product; // Store original name for legend
      });

      return dayData;
    });

    return result;
  }, [salesHistory]);

  // Get all unique products for bar chart - FIXED
  const uniqueProducts = useMemo(() => {
    const productsSet = new Set<string>();
    const productsMap = new Map<string, string>(); // normalized -> original name
    
    dailySalesData.forEach(day => {
      Object.keys(day).forEach(key => {
        if (key !== 'day' && key !== 'date' && key !== 'total' && !key.endsWith('_name')) {
          productsSet.add(key);
          // Store original name if available
          const originalName = day[`${key}_name`];
          if (originalName) {
            productsMap.set(key, originalName);
          }
        }
      });
    });
    
    const products = Array.from(productsSet).map(key => ({
      key,
      name: productsMap.get(key) || key.charAt(0).toUpperCase() + key.slice(1)
    }));

    return products;
  }, [dailySalesData]);

  // Export as CSV
  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const kpiRows = [
      ['Total Revenue', `${RUPEE}${formatIndianNumber(kpis.totalRevenue)}`],
      ['Net Profit', `${RUPEE}${formatIndianNumber(kpis.netProfit)}`],
      ['Total Expenses', `${RUPEE}${formatIndianNumber(kpis.totalExpenses)}`],
      ['Fuel Sold (Liters)', formatIndianNumber(kpis.totalLiters)],
      ['Total Transactions', salesHistory.length.toString()],
    ];

    const csvContent = [
      headers.join(','),
      ...kpiRows.map(row => row.join(',')),
      '',
      'Monthly Sales Data',
      'Month,Sales,Expenses,Profit',
      ...monthlySalesData.map(m => `${m.name},${m.sales},${m.expenses},${m.profit}`),
      '',
      'Fuel Distribution',
      'Product,Revenue',
      ...fuelTypeData.map(f => `${f.name},${f.value}`),
      '',
      `Exported: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      `Period: ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${orgId}-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report - ${dayjs().format('DD MMM YYYY')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #3b82f6; color: white; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .kpi-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .kpi-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .section { margin: 30px 0; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>Analytics Report - ${orgId}</h1>
        <p>Generated: ${dayjs().format('DD MMMM YYYY, HH:mm')}</p>
        <p>Period: ${from.format('DD MMM YYYY')} to ${to.format('DD MMM YYYY')}</p>
        
        <div class="section">
          <h2>Key Performance Indicators</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div>Total Revenue</div>
              <div class="kpi-value">${RUPEE}${formatIndianNumber(kpis.totalRevenue)}</div>
            </div>
            <div class="kpi-card">
              <div>Net Profit</div>
              <div class="kpi-value">${RUPEE}${formatIndianNumber(kpis.netProfit)}</div>
            </div>
            <div class="kpi-card">
              <div>Fuel Sold</div>
              <div class="kpi-value">${formatIndianNumber(kpis.totalLiters)} L</div>
            </div>
            <div class="kpi-card">
              <div>Transactions</div>
              <div class="kpi-value">${salesHistory.length}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Monthly Sales Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Sales</th>
                <th>Expenses</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${monthlySalesData.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td>${RUPEE}${formatIndianNumber(m.sales)}</td>
                  <td>${RUPEE}${formatIndianNumber(m.expenses)}</td>
                  <td>${RUPEE}${formatIndianNumber(m.profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Fuel Type Distribution</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${fuelTypeData.map(f => `
                <tr>
                  <td>${f.name}</td>
                  <td>${RUPEE}${formatIndianNumber(f.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Finance Summary</h2>
          ${financeSummary ? `
            <table>
              <thead>
                <tr>
                  <th colspan="2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Cash Received</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.cashReceived)}</td></tr>
                <tr><td><strong>UPI/PhonePe</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.phonePay)}</td></tr>
                <tr><td><strong>Credit Card</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.creditCard)}</td></tr>
              </tbody>
            </table>
            ${(financeSummary.petrolInventory > 0 || financeSummary.dieselInventory > 0 || 
                financeSummary.premiumPetrolInventory > 0 || financeSummary.cngInventory > 0 || 
                financeSummary.twoTInventory > 0) ? `
              <table style="margin-top: 20px;">
                <thead>
                  <tr>
                    <th colspan="2">Inventory Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${financeSummary.petrolInventory > 0 ? `<tr><td><strong>Petrol</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.petrolInventory)}</td></tr>` : ''}
                  ${financeSummary.dieselInventory > 0 ? `<tr><td><strong>Diesel</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.dieselInventory)}</td></tr>` : ''}
                  ${financeSummary.premiumPetrolInventory > 0 ? `<tr><td><strong>Premium Petrol</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.premiumPetrolInventory)}</td></tr>` : ''}
                  ${financeSummary.cngInventory > 0 ? `<tr><td><strong>CNG</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.cngInventory)}</td></tr>` : ''}
                  ${financeSummary.twoTInventory > 0 ? `<tr><td><strong>2T Oil</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.twoTInventory)}</td></tr>` : ''}
                </tbody>
              </table>
            ` : ''}
            <table style="margin-top: 20px;">
              <tbody>
                <tr><td><strong>Total Expenses</strong></td><td style="color: #dc2626;">${RUPEE}${formatIndianNumber(financeSummary.totalExpenses)}</td></tr>
                <tr style="background: #f0f0f0; font-weight: bold;">
                  <td><strong>Net Total</strong></td>
                  <td style="color: ${financeSummary.total >= 0 ? '#16a34a' : '#dc2626'};">
                    <strong>${RUPEE}${formatIndianNumber(financeSummary.total)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            ${financeSummary.description ? `<p style="margin-top: 10px; font-style: italic; color: #666;">${financeSummary.description}</p>` : ''}
            ${financeSummary.createdAt ? `<p style="margin-top: 10px; font-size: 12px; color: #666;">Updated: ${dayjs(financeSummary.createdAt).format('DD MMMM YYYY, HH:mm')}</p>` : ''}
          ` : '<p>No finance summary available</p>'}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Handle time range change with transition
  const handleTimeRangeChange = (value: string) => {
    startTransition(() => {
      setTimeRange(value);
    });
  };

  const isLoading = loadingSales || loadingExpenses || loadingFinance;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading real-time analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Comprehensive business insights and performance metrics
            {fetchingSales && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Period: {from.format('DD MMM YYYY')} to {to.format('DD MMM YYYY')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={fetchingSales}
            className="hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchingSales ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Select value={timeRange} onValueChange={handleTimeRangeChange} disabled={isPending || fetchingSales}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className='z-[10000]' >
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Loading overlay when fetching */}
      {(isPending || fetchingSales) && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: "1rem", minHeight: "100vh", minWidth: "100vw" }}
        >
          <div
            className="relative bg-background shadow-2xl rounded-xl sm:rounded-2xl p-8 flex flex-col border border-border/50 animate-fade-in"
            style={{ maxWidth: "400px" }}
          >
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Loading Data
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Fetching real-time analytics...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-300">Total Revenue</CardTitle>
            <IndianRupee className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {RUPEE}{formatIndianNumber(kpis.totalRevenue)}
            </div>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center mt-0.5">
              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
              {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : timeRange === '90d' ? 'Last 3 months' : 'Last year'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-green-700 dark:text-green-300">Net Profit</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-green-900 dark:text-green-100">
              {RUPEE}{formatIndianNumber(kpis.netProfit)}
            </div>
            <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center mt-0.5">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-orange-700 dark:text-orange-300">Fuel Sold</CardTitle>
            <Droplets className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
              {formatIndianNumber(kpis.totalLiters)} L
            </div>
            <p className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center mt-0.5">
              Total liters sold
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-purple-700 dark:text-purple-300">Transactions</CardTitle>
            <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {formatIndianNumber(salesHistory.length)}
            </div>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center mt-0.5">
              Total sales recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Revenue & Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <CardDescription>Monthly performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySalesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${RUPEE}${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => [`${RUPEE}${formatIndianNumber(value as number)}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fuel Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Type Distribution</CardTitle>
            <CardDescription>Sales breakdown by fuel type</CardDescription>
          </CardHeader>
          <CardContent>
            {fuelTypeData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No fuel sales data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fuelTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${RUPEE}${formatIndianNumber(value)}`}
                  >
                    {fuelTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${RUPEE}${formatIndianNumber(value as number)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Sales by Fuel Type - FIXED */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales (Last 7 Days)</CardTitle>
            <CardDescription>
              Sales from {dayjs().subtract(6, 'day').format('DD MMM')} to {dayjs().format('DD MMM')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailySalesData.length === 0 || dailySalesData.every(d => d.total === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No daily sales data available for the last 7 days
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(value) => `${RUPEE}${(value / 1000).toFixed(0)}K`} />
                    <Tooltip 
                      formatter={(value, name) => {
                        // Find the product name from uniqueProducts
                        const product = uniqueProducts.find(p => p.key === name);
                        const displayName = product ? product.name : String(name);
                        return [`${RUPEE}${formatIndianNumber(value as number)}`, displayName];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                    />
                    <Legend 
                      formatter={(value) => {
                        const product = uniqueProducts.find(p => p.key === value);
                        return product ? product.name : value;
                      }}
                    />
                    {uniqueProducts.length > 0 ? (
                      uniqueProducts.map((product, idx) => (
                        <Bar 
                          key={product.key} 
                          dataKey={product.key} 
                          fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'][idx % 7]} 
                          name={product.name}
                        />
                      ))
                    ) : (
                      <Bar dataKey="total" fill="#3b82f6" name="Total Sales" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Summary Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-right p-2 font-medium">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySalesData.map((day, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50">
                          <td className="p-2">{day.day}</td>
                          <td className="p-2 text-right font-semibold">{RUPEE}{formatIndianNumber(day.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Finance Summary</CardTitle>
            <CardDescription>
              Current financial overview
              {financeSummary?.createdAt && (
                <span className="block text-xs mt-1">
                  Updated: {dayjs(financeSummary.createdAt).format('DD MMM YYYY, HH:mm')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!financeSummary ? (
              <div className="text-muted-foreground text-center py-8">
                <p>No finance summary available</p>
                <p className="text-xs mt-2">Create one from the Finance section</p>
              </div>
            ) : (
              <>
                {/* Revenue Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Revenue</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cash Received</span>
                    <span className="text-sm font-bold text-green-600">{RUPEE}{formatIndianNumber(financeSummary.cashReceived)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">UPI/PhonePe</span>
                    <span className="text-sm font-bold text-green-600">{RUPEE}{formatIndianNumber(financeSummary.phonePay)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Credit Card</span>
                    <span className="text-sm font-bold text-green-600">{RUPEE}{formatIndianNumber(financeSummary.creditCard)}</span>
                  </div>
                </div>

                {/* Inventory Section */}
                {(financeSummary.petrolInventory > 0 || financeSummary.dieselInventory > 0 || 
                  financeSummary.premiumPetrolInventory > 0 || financeSummary.cngInventory > 0 || 
                  financeSummary.twoTInventory > 0) && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Inventory Value</h4>
                      {financeSummary.petrolInventory > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Petrol</span>
                          <span className="text-sm font-bold text-blue-600">{RUPEE}{formatIndianNumber(financeSummary.petrolInventory)}</span>
                        </div>
                      )}
                      {financeSummary.dieselInventory > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Diesel</span>
                          <span className="text-sm font-bold text-blue-600">{RUPEE}{formatIndianNumber(financeSummary.dieselInventory)}</span>
                        </div>
                      )}
                      {financeSummary.premiumPetrolInventory > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Premium Petrol</span>
                          <span className="text-sm font-bold text-blue-600">{RUPEE}{formatIndianNumber(financeSummary.premiumPetrolInventory)}</span>
                        </div>
                      )}
                      {financeSummary.cngInventory > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">CNG</span>
                          <span className="text-sm font-bold text-blue-600">{RUPEE}{formatIndianNumber(financeSummary.cngInventory)}</span>
                        </div>
                      )}
                      {financeSummary.twoTInventory > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">2T Oil</span>
                          <span className="text-sm font-bold text-blue-600">{RUPEE}{formatIndianNumber(financeSummary.twoTInventory)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="h-px bg-border" />
                
                {/* Expenses */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Expenses</span>
                  <span className="text-sm font-bold text-destructive">{RUPEE}{formatIndianNumber(financeSummary.totalExpenses)}</span>
                </div>
                
                <div className="h-px bg-border my-2" />
                
                {/* Net Total */}
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <span className="text-base font-bold">Net Total</span>
                  <span className={`text-lg font-bold ${financeSummary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {RUPEE}{formatIndianNumber(financeSummary.total)}
                  </span>
                </div>

                {/* Description if available */}
                {financeSummary.description && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground italic">{financeSummary.description}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>Key observations from your real-time data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis.netProfit > 0 ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Positive Profit Margin</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your business is generating {RUPEE}{formatIndianNumber(kpis.netProfit)} in net profit for the selected period.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">Review Expenses</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Expenses exceed revenue by {RUPEE}{formatIndianNumber(Math.abs(kpis.netProfit))}. Consider cost optimization.
                  </p>
                </div>
              </div>
            )}

            {fuelTypeData.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Top Selling Fuel</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {fuelTypeData[0].name} is your best-performing product with {RUPEE}{formatIndianNumber(fuelTypeData[0].value)} in sales.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <IndianRupee className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Transaction Volume</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  You processed {formatIndianNumber(salesHistory.length)} transactions totaling {formatIndianNumber(kpis.totalLiters)} liters of fuel.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
