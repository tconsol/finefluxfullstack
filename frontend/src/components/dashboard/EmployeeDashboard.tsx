import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar,
  DollarSign,
  CheckCircle,
  User,
  FileText,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG } from '@/lib/api-config';

const API_BASE = API_CONFIG.BASE_URL;

export function EmployeeDashboard() {
  const { user } = useAuth();

  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';

  const todayStats = [
    {
      title: 'Shift Status',
      value: 'Active',
      change: 'Started 08:00 AM',
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Hours Today',
      value: '6.5h',
      change: '1.5h remaining',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'This Month',
      value: '162h',
      change: 'Target: 180h',
      icon: Calendar,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Performance',
      value: '92%',
      change: 'Above average',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const recentShifts = [
    { date: '2024-01-08', shift: 'Morning', hours: '8h', status: 'completed' },
    { date: '2024-01-07', shift: 'Morning', hours: '8h', status: 'completed' },
    { date: '2024-01-06', shift: 'Afternoon', hours: '8h', status: 'completed' },
    { date: '2024-01-05', shift: 'Morning', hours: '7.5h', status: 'completed' },
  ];

  const upcomingShifts = [
    { date: '2024-01-09', shift: 'Morning', time: '08:00 AM - 04:00 PM' },
    { date: '2024-01-10', shift: 'Morning', time: '08:00 AM - 04:00 PM' },
    { date: '2024-01-11', shift: 'Afternoon', time: '02:00 PM - 10:00 PM' },
    { date: '2024-01-12', shift: 'Morning', time: '08:00 AM - 04:00 PM' },
  ];

  const salaryInfo = {
    currentMonth: {
      basic: 25000,
      overtime: 3500,
      incentives: 2000,
      deductions: 1200,
      net: 29300,
    },
    lastPaid: '2023-12-31',
    nextPayday: '2024-01-31',
  };

  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!orgId || !empId) return;
    setLoadingTasks(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=pending`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=in-progress`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`)
    ])
      .then(([res1, res2, res3]) => {
        const pendingInProgress = [...(res1?.data || []), ...(res2?.data || [])].filter(t => t.dueDate === todayStr);
        const completedTasks = (res3?.data || []).slice(-2).reverse();
        setTodayTasks([...pendingInProgress, ...completedTasks]);
      })
      .finally(() => setLoadingTasks(false));
  }, [orgId, empId]);

  const handleTaskAction = async (taskId: string, newStatus: string) => {
    await axios.put(`${API_BASE}/api/organizations/${orgId}/tasks/${taskId}/status?status=${encodeURIComponent(newStatus)}`);
    setTodayTasks(ts => ts.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const getShiftStatusBadge = (status: string) => {
    return status === 'completed' ? (
      <Badge className="bg-success-soft text-success">Completed</Badge>
    ) : (
      <Badge className="bg-warning-soft text-warning">Pending</Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-4">
      {/* Header: stack on mobile, wrap buttons, prevent shrinking */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your shifts, attendance, and performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 justify-start sm:justify-end shrink-0">
          <Button variant="outline" onClick={() => (window.location.href = '/profile')}>
            <User className="mr-2 h-4 w-4" />
            My Profile
          </Button>
          <Button className="btn-gradient-success">
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Stats Grid: already responsive, ensure icon doesn’t shrink */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {todayStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Today's Tasks + Last 2 Completed: stack content/buttons on mobile */}
        <Card className="card-gradient">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CheckCircle className="h-5 w-5" />
              Today's Tasks & Recent Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {loadingTasks && <div className="text-muted-foreground text-sm">Loading tasks...</div>}
            {!loadingTasks && todayTasks.length === 0 && (
              <span className="text-muted-foreground text-sm">No tasks to display</span>
            )}
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground truncate">{task.taskTitle}</p>
                    {task.priority === "High" && (
                      <Badge className="bg-destructive-soft text-destructive">High</Badge>
                    )}
                    {isOverdue(task.dueDate) && task.status !== "completed" && (
                      <span className="text-xs text-destructive animate-pulse font-semibold">Overdue!</span>
                    )}
                    {task.status === "completed" && (
                      <Badge className="bg-success-soft text-success">
                        <CheckCircle className="h-3 w-3 mr-1 inline" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground break-words">{task.description}</p>
                  )}
                  <p className="text-xs">
                    Due: <span className={isOverdue(task.dueDate) ? "text-destructive" : ""}>{task.dueDate}</span>
                    {" | "}Shift: {task.shift}
                  </p>
                </div>
                <div className="flex gap-2 sm:ml-2">
                  {task.status === "pending" && !isOverdue(task.dueDate) && (
                    <Button
                      size="sm"
                      className="btn-gradient-primary w-full sm:w-auto"
                      onClick={() => handleTaskAction(task.id, 'in-progress')}
                    >
                      Start
                    </Button>
                  )}
                  {task.status === "in-progress" && !isOverdue(task.dueDate) && (
                    <Button
                      size="sm"
                      className="btn-gradient-success w-full sm:w-auto"
                      onClick={() => handleTaskAction(task.id, 'completed')}
                    >
                      Complete
                    </Button>
                  )}
                </div>
                {isOverdue(task.dueDate) && task.status !== "completed" && (
                  <span className="text-xs text-destructive font-semibold sm:ml-2">Overdue</span>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/employee-duty-info")}
            >
              <FileText className="mr-2 h-4 w-4" />
              View All Tasks
            </Button>
          </CardContent>
        </Card>

        {/* Salary Information */}
        <Card className="card-gradient">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <DollarSign className="h-5 w-5" />
              Salary Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="font-medium">₹{salaryInfo.currentMonth.basic.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overtime</span>
                <span className="font-medium text-success">₹{salaryInfo.currentMonth.overtime.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incentives</span>
                <span className="font-medium text-accent">₹{salaryInfo.currentMonth.incentives.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deductions</span>
                <span className="font-medium text-destructive">₹{salaryInfo.currentMonth.deductions.toLocaleString()}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Net Salary</span>
                <span className="text-primary">₹{salaryInfo.currentMonth.net.toLocaleString()}</span>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Last paid: {salaryInfo.lastPaid}
              </p>
              <p className="text-sm text-muted-foreground">
                Next payday: {salaryInfo.nextPayday}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Shifts: stack on mobile */}
        <Card className="card-gradient">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Clock className="h-5 w-5" />
              Recent Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {recentShifts.map((shift, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{shift.date}</p>
                  <p className="text-sm text-muted-foreground">{shift.shift} Shift</p>
                </div>
                <div className="text-left sm:text-right space-y-1">
                  <p className="font-semibold text-foreground">{shift.hours}</p>
                  {getShiftStatusBadge(shift.status)}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              View All Shifts
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Shifts: stack on mobile */}
        <Card className="card-gradient">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {upcomingShifts.map((shift, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{shift.date}</p>
                  <p className="text-sm text-muted-foreground">{shift.shift} Shift</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-medium text-foreground">{shift.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              View Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
