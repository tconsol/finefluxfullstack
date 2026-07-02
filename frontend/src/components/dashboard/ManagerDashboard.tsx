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

export function ManagerDashboard() {
  const navigate = useNavigate();
  const todayStats = [
    {
      title: 'Present Today',
      value: '9/12',
      change: '3 absent',
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Shift Hours',
      value: '72h',
      change: 'Total today',
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Sales Today',
      value: '₹45.2K',
      change: '+8% vs yesterday',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Expenses',
      value: '₹8.5K',
      change: 'Awaiting approval',
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

  const attendanceToday = [
    { id: 1, name: 'Arjun Patel', time: '08:00 AM', shift: 'Morning', status: 'present' },
    { id: 2, name: 'Sunita Sharma', time: '08:15 AM', shift: 'Morning', status: 'present' },
    { id: 3, name: 'Ravi Kumar', time: '02:00 PM', shift: 'Afternoon', status: 'present' },
    { id: 4, name: 'Maya Singh', time: '—', shift: 'Morning', status: 'absent' },
  ];

  const pendingExpenses = [
    { id: 1, item: 'Fuel pump maintenance', amount: 3500, date: '2024-01-08', priority: 'high' },
    { id: 2, item: 'Office supplies', amount: 1200, date: '2024-01-08', priority: 'low' },
    { id: 3, item: 'Equipment repair', amount: 2800, date: '2024-01-07', priority: 'medium' },
  ];

  const recentSales = [
    { time: '09:30 AM', type: 'Petrol Premium', quantity: 25, amount: 2750 },
    { time: '09:45 AM', type: 'Diesel', quantity: 40, amount: 3600 },
    { time: '10:15 AM', type: 'CNG', quantity: 15, amount: 900 },
    { time: '10:30 AM', type: 'Petrol Regular', quantity: 30, amount: 3000 },
  ];

  const getStatusBadge = (status: string) => {
    return status === 'present' ? (
      <Badge className="bg-success-soft text-success">Present</Badge>
    ) : (
      <Badge className="bg-destructive-soft text-destructive">Absent</Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-destructive-soft text-destructive',
      medium: 'bg-warning-soft text-warning',
      low: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[priority as keyof typeof colors]}>{priority}</Badge>;
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
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Today's Schedule
          </Button>
          <Button className="btn-gradient-primary">
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
            {attendanceToday.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{employee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.shift} Shift • {employee.time}
                  </p>
                </div>
                {getStatusBadge(employee.status)}
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          </CardContent>
        </Card>

        {/* Pending Expenses */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{expense.item}</p>
                  <p className="text-sm text-muted-foreground">{expense.date}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-foreground">
                    ₹{expense.amount.toLocaleString()}
                  </p>
                  {getPriorityBadge(expense.priority)}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
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
            {recentSales.map((sale, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">{sale.time}</div>
                  <div>
                    <p className="font-medium text-foreground">{sale.type}</p>
                    <p className="text-sm text-muted-foreground">{sale.quantity}L</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">
                  ₹{sale.amount.toLocaleString()}
                </p>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Record New Sale
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}