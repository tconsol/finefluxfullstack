import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  DollarSign,
  TrendingDown,
  Plus,
  FileText,
  Fuel,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { API_CONFIG } from '@/lib/api-config';

const API_BASE = API_CONFIG.BASE_URL;
const safeArray = (v: any) => Array.isArray(v) ? v : Array.isArray(v?.content) ? v.content : [];
const isSameDay = (dateStr: any, day: dayjs.Dayjs) => dateStr && dayjs(dateStr).isSame(day, 'day');

function formatMinsAsHours(mins: number) {
  if (!mins || mins <= 0) return '0h';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ManagerDashboard() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    const today = dayjs();
    const start = today.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const end = today.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/employees?page=0&size=500`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/attendance/daterange?start=${start}&end=${end}`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/api/organizations/${orgId}/sales`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/api/organizations/${orgId}/expenses`).catch(() => ({ data: [] })),
    ])
      .then(([empRes, attRes, salesRes, expensesRes]) => {
        setEmployees(safeArray(empRes.data));
        setAttendanceToday(safeArray(attRes.data));
        setSales(safeArray(salesRes.data));
        setExpenses(safeArray(expensesRes.data));
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const employeeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const emp of employees) map[emp.empId] = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    return map;
  }, [employees]);

  const activeEmployees = useMemo(
    () => employees.filter((e: any) => String(e.status || '').toUpperCase() === 'ACTIVE'),
    [employees]
  );

  const presentCount = useMemo(
    () => attendanceToday.filter((a: any) => a.present === 'YES').length,
    [attendanceToday]
  );

  const totalShiftMins = useMemo(
    () => attendanceToday.reduce((sum, a: any) => sum + (Number(a.workingMins) || 0), 0),
    [attendanceToday]
  );

  const todaySales = useMemo(() => sales.filter((s: any) => isSameDay(s.dateTime, dayjs())), [sales]);
  const todaySalesTotal = useMemo(
    () => todaySales.reduce((sum, s: any) => sum + (Number(s.salesInRupees) || 0), 0),
    [todaySales]
  );

  const todayExpenses = useMemo(() => expenses.filter((e: any) => isSameDay(e.expenseDate, dayjs())), [expenses]);
  const todayExpensesTotal = useMemo(
    () => todayExpenses.reduce((sum, e: any) => sum + (Number(e.amount) || 0), 0),
    [todayExpenses]
  );

  const recentExpenses = useMemo(
    () => [...expenses].sort((a: any, b: any) => new Date(b.expenseDate || b.createdAt).getTime() - new Date(a.expenseDate || a.createdAt).getTime()).slice(0, 4),
    [expenses]
  );

  const recentSales = useMemo(
    () => [...sales].sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0, 4),
    [sales]
  );

  const todayStats = [
    {
      title: 'Present Today',
      value: loading ? '...' : `${presentCount}/${activeEmployees.length}`,
      change: loading ? '' : `${Math.max(0, activeEmployees.length - presentCount)} absent`,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Shift Hours',
      value: loading ? '...' : formatMinsAsHours(totalShiftMins),
      change: 'Total today',
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Sales Today',
      value: loading ? '...' : `₹${todaySalesTotal.toLocaleString('en-IN')}`,
      change: `${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''}`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: "Today's Expenses",
      value: loading ? '...' : `₹${todayExpensesTotal.toLocaleString('en-IN')}`,
      change: `${todayExpenses.length} expense${todayExpenses.length !== 1 ? 's' : ''}`,
      icon: TrendingDown,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
  ];

  const quickActions = [
    { title: 'Record Sales Entry', icon: DollarSign, color: 'btn-gradient-success', action: () => navigate('/sales') },
    { title: 'Log Expense', icon: TrendingDown, color: 'btn-gradient-accent', action: () => navigate('/expenses') },
    { title: 'Update Stock', icon: Fuel, color: 'btn-gradient-primary', action: () => navigate('/inventory') },
    { title: 'Set Employee Duty', icon: Users, color: 'btn-gradient-warning', action: () => navigate('/employee-duty') },
    { title: 'Generate DSR', icon: FileText, color: 'btn-gradient-primary', action: () => navigate('/reports') },
  ];

  const getStatusBadge = (present: string) => {
    return present === 'YES' ? (
      <Badge className="bg-success-soft text-success">Present</Badge>
    ) : (
      <Badge className="bg-destructive-soft text-destructive">Absent</Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] sm:items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground">Daily operations and team management</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-start sm:justify-end mt-2 sm:mt-0 shrink-0">
          <Button variant="outline" onClick={() => navigate('/employee-duty-info')}>
            <Calendar className="mr-2 h-4 w-4" />
            Today's Schedule
          </Button>
          <Button className="btn-gradient-primary" onClick={() => navigate('/reports')}>
            <FileText className="mr-2 h-4 w-4" />
            Generate DSR
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {todayStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <div className="space-y-0.5">
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

      {/* Quick Actions */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.title}
                  className={`${action.color} h-auto p-4 flex-col gap-2`}
                  size="lg"
                  onClick={action.action}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.title}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Today's Attendance */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div className="text-muted-foreground text-sm">Loading...</div>}
            {!loading && attendanceToday.length === 0 && (
              <div className="text-muted-foreground text-sm">No attendance recorded today</div>
            )}
            {attendanceToday.slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{employeeNameById[a.empId] || a.empId}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.checkIn ? `Checked in ${dayjs(a.checkIn).format('hh:mm A')}` : 'Not checked in'}
                  </p>
                </div>
                {getStatusBadge(a.present)}
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/employee-attendance')}>
              <Plus className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div className="text-muted-foreground text-sm">Loading...</div>}
            {!loading && recentExpenses.length === 0 && (
              <div className="text-muted-foreground text-sm">No expenses recorded yet</div>
            )}
            {recentExpenses.map((expense: any) => (
              <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{expense.description || expense.categoryName}</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.expenseDate ? dayjs(expense.expenseDate).format('DD MMM YYYY') : ''}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-foreground">
                    ₹{Number(expense.amount || 0).toLocaleString('en-IN')}
                  </p>
                  <Badge className="bg-muted text-muted-foreground">{expense.categoryName}</Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/expenses')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading && <div className="text-muted-foreground text-sm">Loading...</div>}
            {!loading && recentSales.length === 0 && (
              <div className="text-muted-foreground text-sm">No sales recorded yet</div>
            )}
            {recentSales.map((sale: any) => (
              <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">{dayjs(sale.dateTime).format('hh:mm A')}</div>
                  <div>
                    <p className="font-medium text-foreground">{sale.productName}</p>
                    <p className="text-sm text-muted-foreground">{Number(sale.salesInLiters || 0).toFixed(2)}L</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">
                  ₹{Number(sale.salesInRupees || 0).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/sales')}>
              <Plus className="mr-2 h-4 w-4" />
              Record New Sale
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
