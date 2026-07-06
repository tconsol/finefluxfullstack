import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
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

function formatMinsAsHours(mins?: number) {
  if (!mins || mins <= 0) return '0h';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function EmployeeDashboard() {
  const { user } = useAuth();

  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';

  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [employeeRecord, setEmployeeRecord] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [upcomingDuties, setUpcomingDuties] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

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

  useEffect(() => {
    if (!orgId || !empId) return;
    setLoadingStats(true);
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/employees?page=0&size=500`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/attendance/employee/${empId}`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/api/organizations/${orgId}/employee-duties/employee/${empId}`).catch(() => ({ data: [] })),
    ])
      .then(([empRes, attRes, dutyRes]) => {
        const empList = Array.isArray(empRes.data?.content) ? empRes.data.content : Array.isArray(empRes.data) ? empRes.data : [];
        setEmployeeRecord(empList.find((e: any) => e.empId === empId) || null);

        const attList = Array.isArray(attRes.data) ? attRes.data : [];
        attList.sort((a: any, b: any) => new Date(b.checkIn || b.createdAt || 0).getTime() - new Date(a.checkIn || a.createdAt || 0).getTime());
        setAttendanceRecords(attList);

        const dutyList = Array.isArray(dutyRes.data) ? dutyRes.data : [];
        const today = dayjs().startOf('day');
        const upcoming = dutyList
          .filter((d: any) => d.status === 'SCHEDULED' && d.dutyDate && !dayjs(d.dutyDate).isBefore(today))
          .sort((a: any, b: any) => new Date(a.dutyDate).getTime() - new Date(b.dutyDate).getTime())
          .slice(0, 4);
        setUpcomingDuties(upcoming);
      })
      .finally(() => setLoadingStats(false));
  }, [orgId, empId]);

  const todayAttendance = attendanceRecords.find((a: any) => dayjs(a.checkIn || a.createdAt).isSame(dayjs(), 'day'));
  const latestAttendance = attendanceRecords[0];

  const todayStats = [
    {
      title: 'Shift Status',
      value: todayAttendance?.present === 'YES' ? 'Checked In' : 'Not Checked In',
      change: todayAttendance?.checkIn ? `Started ${dayjs(todayAttendance.checkIn).format('hh:mm A')}` : 'No check-in today',
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Hours Today',
      value: formatMinsAsHours(todayAttendance?.workingMins),
      change: todayAttendance?.shortTimeMins
        ? `${formatMinsAsHours(todayAttendance.shortTimeMins)} short`
        : todayAttendance?.extraHoursMins
        ? `${formatMinsAsHours(todayAttendance.extraHoursMins)} extra`
        : 'On duty target',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Attendance Rate',
      value: latestAttendance?.attendanceRate !== undefined ? `${Math.round(latestAttendance.attendanceRate)}%` : '—',
      change: 'This month',
      icon: Calendar,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Avg Hours/Day',
      value: latestAttendance?.avgHours !== undefined ? `${latestAttendance.avgHours.toFixed(1)}h` : '—',
      change: 'This month',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const recentShifts = attendanceRecords.slice(0, 4).map((a: any) => ({
    date: a.checkIn ? dayjs(a.checkIn).format('DD MMM YYYY') : dayjs(a.createdAt).format('DD MMM YYYY'),
    hours: formatMinsAsHours(a.workingMins),
    status: a.present === 'YES' ? 'completed' : 'absent',
  }));

  const upcomingShifts = upcomingDuties.map((d: any) => ({
    date: dayjs(d.dutyDate).format('DD MMM YYYY'),
    time: d.shiftStart && d.shiftEnd ? `${d.shiftStart} - ${d.shiftEnd}` : 'Not set',
  }));

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
      <Badge className="bg-success-soft text-success">Present</Badge>
    ) : (
      <Badge className="bg-destructive-soft text-destructive">Absent</Badge>
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

        {/* Employment Details */}
        <Card className="card-gradient">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <DollarSign className="h-5 w-5" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {loadingStats ? (
              <div className="text-muted-foreground text-sm">Loading...</div>
            ) : !employeeRecord ? (
              <div className="text-muted-foreground text-sm">No employee record found</div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Salary</span>
                  <span className="font-medium text-primary">
                    {employeeRecord.salary !== undefined && employeeRecord.salary !== null
                      ? `₹${Number(employeeRecord.salary).toLocaleString()}`
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{employeeRecord.department || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{employeeRecord.role || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift Timing</span>
                  <span className="font-medium">
                    {employeeRecord.shiftTiming?.start && employeeRecord.shiftTiming?.end
                      ? `${employeeRecord.shiftTiming.start} - ${employeeRecord.shiftTiming.end}`
                      : 'Not set'}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium">
                    {employeeRecord.joinedDate ? dayjs(employeeRecord.joinedDate).format('DD MMM YYYY') : '—'}
                  </span>
                </div>
              </div>
            )}
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
            {loadingStats && <div className="text-muted-foreground text-sm">Loading...</div>}
            {!loadingStats && recentShifts.length === 0 && (
              <div className="text-muted-foreground text-sm">No attendance records yet</div>
            )}
            {recentShifts.map((shift, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{shift.date}</p>
                </div>
                <div className="text-left sm:text-right space-y-1">
                  <p className="font-semibold text-foreground">{shift.hours}</p>
                  {getShiftStatusBadge(shift.status)}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => (window.location.href = '/employee-attendance')}>
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
            {loadingStats && <div className="text-muted-foreground text-sm">Loading...</div>}
            {!loadingStats && upcomingShifts.length === 0 && (
              <div className="text-muted-foreground text-sm">No upcoming duties scheduled</div>
            )}
            {upcomingShifts.map((shift, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{shift.date}</p>
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
