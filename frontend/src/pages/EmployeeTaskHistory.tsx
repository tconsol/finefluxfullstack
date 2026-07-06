import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, CheckCircle, Timer, AlertCircle, ArrowLeft, ChevronLeft, 
  ChevronRight, Clock, Calendar, Fuel, Target, Activity, Search as SearchIcon,
  LayoutGrid, LayoutList
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { API_CONFIG } from '@/lib/api-config';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import React from "react";

// Removed - using API_CONFIG
const ITEMS_PER_PAGE = 5;

type DateFilterKey = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function EmployeeTaskHistory() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyDuties, setDailyDuties] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'pending'|'in-progress'|'completed'|'daily-scheduled'|'daily-active'|'daily-completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // New: search and date filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Date helpers
  const normalizeDate = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };  // [memory:10]

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = normalizeDate(new Date());
    const due = normalizeDate(new Date(dueDate));
    return due.getTime() < today.getTime();
  };  // [memory:10]

  const isInDateRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = normalizeDate(new Date(dateStr));
    const now = new Date();
    switch (dateFilter) {
      case 'all':
        return true;
      case 'today':
        return d.getTime() === normalizeDate(now).getTime();
      case 'week': {
        const weekStart = normalizeDate(new Date(now));
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return d >= weekStart && d <= weekEnd;
      }
      case 'month':
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case 'custom': {
        if (!customStartDate || !customEndDate) return true;
        const start = normalizeDate(new Date(customStartDate));
        const end = normalizeDate(new Date(customEndDate));
        return d >= start && d <= end;
      }
      default:
        return true;
    }
  };  // [memory:10]

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return '0.0';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let hours = eh - sh;
    let minutes = em - sm;
    if (minutes < 0) { minutes += 60; hours -= 1; }
    if (hours < 0) hours += 24;
    return (hours + minutes / 60).toFixed(1);
  };  // [memory:10]

  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=pending`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=in-progress`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`),
      axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employee-duties/employee/${empId}`),
    ]).then(([pending, inprogress, completed, duties]) => {
      const p = Array.isArray(pending.data) ? pending.data : [];
      const ip = Array.isArray(inprogress.data) ? inprogress.data : [];
      const c = Array.isArray(completed.data) ? completed.data : [];
      const dd = Array.isArray(duties.data) ? duties.data : [];
      
      setTasks([
        ...p.map((t: any) => ({ ...t, status: 'pending' })),
        ...ip.map((t: any) => ({ ...t, status: 'in-progress' })),
        ...c.map((t: any) => ({ ...t, status: 'completed' })),
      ]);
      setDailyDuties(dd);
    }).catch(err => {
      console.error('Error loading task history:', err);
    }).finally(() => setLoading(false));
  }, [orgId, empId]);  // [memory:10]

  const stats = useMemo(() => {
    let pending = 0, inProgress = 0, completed = 0, overdue = 0;
    for (const t of tasks) {
      if (t.status === 'pending') pending++;
      if (t.status === 'in-progress') inProgress++;
      if (t.status === 'completed') completed++;
      if (t.status !== 'completed' && t.dueDate && isOverdue(t.dueDate)) overdue++;
    }
    const scheduledDuties = dailyDuties.filter(d => d.status === 'SCHEDULED' || !d.status).length;
    const activeDuties = dailyDuties.filter(d => d.status === 'ACTIVE').length;
    const completedDuties = dailyDuties.filter(d => d.status === 'COMPLETED').length;
    return { 
      pending, inProgress, completed, overdue, total: tasks.length,
      dailyTotal: dailyDuties.length, dailyScheduled: scheduledDuties, dailyActive: activeDuties, dailyCompleted: completedDuties
    };
  }, [tasks, dailyDuties]);  // [memory:10]

  const statuses = [
    { key: 'pending', label: 'Pending', color: 'text-warning', bgColor: 'bg-yellow-500', icon: Timer },
    { key: 'in-progress', label: 'In Progress', color: 'text-primary', bgColor: 'bg-blue-500', icon: FileText },
    { key: 'completed', label: 'Completed', color: 'text-success', bgColor: 'bg-green-500', icon: CheckCircle },
    { key: 'daily-scheduled', label: 'Daily Scheduled', color: 'text-yellow-600', bgColor: 'bg-yellow-600', icon: Calendar },
    { key: 'daily-active', label: 'Daily Active', color: 'text-purple-600', bgColor: 'bg-purple-600', icon: Activity },
    { key: 'daily-completed', label: 'Daily Completed', color: 'text-green-600', bgColor: 'bg-green-600', icon: Fuel },
  ] as const;  // [memory:6]

  // Filter by tab + search + date
  const filteredTasks = useMemo(() => {
    let base: any[] = [];
    switch (selectedTab) {
      case 'pending':
      case 'in-progress':
      case 'completed':
        base = tasks.filter(t => t.status === selectedTab);
        break;
      case 'daily-scheduled':
        base = dailyDuties.filter(d => d.status === 'SCHEDULED' || !d.status);
        break;
      case 'daily-active':
        base = dailyDuties.filter(d => d.status === 'ACTIVE');
        break;
      case 'daily-completed':
        base = dailyDuties.filter(d => d.status === 'COMPLETED');
        break;
      default:
        base = [];
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (selectedTab.startsWith('daily')) {
        base = base.filter((d: any) => {
          const productsText = Array.isArray(d.products) ? d.products.join(' ').toLowerCase() : '';
          const gunsText = Array.isArray(d.guns) ? d.guns.join(' ').toLowerCase() : '';
          return (
            String(d.productId || '').toLowerCase().includes(q) ||
            productsText.includes(q) ||
            String(d.empId || '').toLowerCase().includes(q) ||
            String(d.dutyDate || '').toLowerCase().includes(q) ||
            gunsText.includes(q) ||
            String(d.status || '').toLowerCase().includes(q) ||
            String(d.shiftStart || '').toLowerCase().includes(q) ||
            String(d.shiftEnd || '').toLowerCase().includes(q)
          );
        });
      } else {
        base = base.filter((t: any) => {
          const composite = [
            t.taskTitle, t.description, t.assignedToName, t.assignedToEmpId, t.shift, t.priority, t.dueDate, t.status
          ].filter(Boolean).join(' ').toLowerCase();
          return composite.includes(q);
        });
      }
    }

    // Date filter
    if (selectedTab.startsWith('daily')) {
      base = base.filter((d: any) => isInDateRange(d.dutyDate));
    } else {
      base = base.filter((t: any) => isInDateRange(t.dueDate));
    }

    return base;
  }, [tasks, dailyDuties, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);  // [memory:5]

  const paginatedTasks = filteredTasks.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);  // [memory:8]
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));  // [memory:8]

  // Reset page on tab/change
  useEffect(() => { setPage(0); }, [selectedTab, filteredTasks.length]);  // [memory:8]

  const renderDailyDutyCard = (duty: any, index: number) => {
    const productDisplay = duty.productId || (Array.isArray(duty.products) ? duty.products.join(', ') : '—');
    const gunsCount = Array.isArray(duty.gunIds) ? duty.gunIds.length : Array.isArray(duty.guns) ? duty.guns.length : 0;
    return (
      <motion.div
        key={duty.id || `${duty.empId}-${duty.dutyDate}-${index}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group relative p-5 rounded-xl bg-muted/30 border-2 border-transparent hover:border-blue-500/20 hover:shadow-lg transition-all duration-300"
      >
        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-blue-500" />
        
        <div className="space-y-3 ml-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Fuel className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Daily Pump Duty</h4>
                <Badge className={
                  duty.status === 'COMPLETED' 
                    ? 'bg-green-500/10 text-green-700 border-green-500/20'
                    : duty.status === 'ACTIVE'
                    ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                    : 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                }>
                  {String(duty.status || 'SCHEDULED').toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="text-sm font-semibold text-foreground">{duty.dutyDate || '—'}</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Product:</span>
              <span className="text-sm font-semibold text-foreground">{productDisplay}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Shift:</span>
              <span className="text-sm font-semibold text-foreground">
                {(duty.shiftStart || '—')} - {(duty.shiftEnd || '—')}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <Timer className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Hours:</span>
              <span className="text-sm font-semibold text-foreground">
                {duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h
              </span>
            </div>

            {gunsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Fuel className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">Guns:</span>
                <span className="text-sm font-semibold text-foreground">{gunsCount} assigned</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10">
              <div className={`h-2 w-2 rounded-full ${
                duty.status === 'SCHEDULED' ? 'bg-yellow-500 animate-pulse' :
                duty.status === 'ACTIVE' ? 'bg-blue-500 animate-pulse' :
                'bg-green-500'
              }`} />
              <span className="text-sm font-semibold text-foreground capitalize">
                {String(duty.status || 'Scheduled').toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };  // [memory:2]

  const renderTaskCard = (task: any, index: number) => (
    <motion.div
      key={task.id || `${task.taskTitle}-${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative p-5 rounded-xl bg-muted/30 border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
        task.status === 'pending' ? 'bg-yellow-500' :
        task.status === 'in-progress' ? 'bg-blue-500' :
        'bg-green-500'
      }`} />

      <div className="space-y-3 ml-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-lg text-foreground">{task.taskTitle}</h4>
              {String(task.priority).toLowerCase() === "high" && (
                <Badge className="bg-destructive text-destructive-foreground shadow-md">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  High Priority
                </Badge>
              )}
              {isOverdue(task.dueDate) && task.status !== 'completed' && (
                <Badge className="bg-orange-500 text-white shadow-md animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Shift:</span>
            <span className="text-sm font-semibold text-foreground">{task.shift || '—'}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isOverdue(task.dueDate) ? 'bg-destructive/10' : 'bg-muted'
          }`}>
            <Calendar className={`h-4 w-4 ${
              isOverdue(task.dueDate) ? 'text-destructive' : 'text-muted-foreground'
            }`} />
            <span className="text-sm text-muted-foreground">Due:</span>
            <span className={`text-sm font-semibold ${
              isOverdue(task.dueDate) ? 'text-destructive' : 'text-foreground'
            }`}>
              {task.dueDate || '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
            <div className={`h-2 w-2 rounded-full ${
              task.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
              task.status === 'in-progress' ? 'bg-blue-500 animate-pulse' :
              'bg-green-500'
            }`} />
            <span className="text-sm font-semibold text-foreground capitalize">
              {String(task.status || '').replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );  // [memory:5]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Task History</h1>
          <p className="text-muted-foreground">View all your assigned tasks and duties organized by status</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => (window.location.href = '/employee-duty-info')}
          className="shadow-sm hover:shadow-md transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Duties
        </Button>
      </motion.div>

      {/* Filters */}
      <Card className="card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks and duties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Date</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Time' },
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' },
                { key: 'custom', label: 'Custom Range' },
              ].map(f => (
                <Button
                  key={f.key}
                  variant={dateFilter === (f.key as DateFilterKey) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(f.key as DateFilterKey)}
                  className={dateFilter === f.key ? 'btn-gradient-primary' : ''}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>  {/* [memory:5] */}

      {/* Stats Grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Special Tasks</p>
                  <p className="text-base font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="bg-muted p-2 rounded-lg shrink-0">
                  <FileText className="h-4 w-4 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  <p className="text-base font-bold text-foreground">{stats.pending}</p>
                </div>
                <div className="bg-warning-soft p-2 rounded-lg shrink-0">
                  <Timer className="h-4 w-4 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                  <p className="text-base font-bold text-foreground">{stats.inProgress}</p>
                </div>
                <div className="bg-primary-soft p-2 rounded-lg shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Completed</p>
                  <p className="text-base font-bold text-foreground">{stats.completed}</p>
                </div>
                <div className="bg-success-soft p-2 rounded-lg shrink-0">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Daily Duties</p>
                  <p className="text-base font-bold text-foreground">{stats.dailyTotal}</p>
                </div>
                <div className="bg-blue-500/10 p-2 rounded-lg shrink-0">
                  <Fuel className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
                  <p className="text-base font-bold text-foreground">{stats.dailyScheduled}</p>
                </div>
                <div className="bg-yellow-500/10 p-2 rounded-lg shrink-0">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Active Duties</p>
                  <p className="text-base font-bold text-foreground">{stats.dailyActive}</p>
                </div>
                <div className="bg-purple-500/10 p-2 rounded-lg shrink-0">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                  <p className="text-base font-bold text-foreground">{stats.overdue}</p>
                </div>
                <div className="bg-destructive-soft p-2 rounded-lg shrink-0">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>  {/* [memory:6] */}

      {/* Tab Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-3 p-1 bg-muted/30 rounded-xl border shadow-sm"
      >
        {statuses.map(stat => {
          const active = selectedTab === stat.key;
          const count = stat.key === 'pending' ? stats.pending :
                        stat.key === 'in-progress' ? stats.inProgress :
                        stat.key === 'completed' ? stats.completed :
                        stat.key === 'daily-scheduled' ? stats.dailyScheduled :
                        stat.key === 'daily-active' ? stats.dailyActive :
                        stats.dailyCompleted;
          return (
            <Button
              key={stat.key}
              variant={active ? "default" : "ghost"}
              onClick={() => setSelectedTab(stat.key as typeof selectedTab)}
              className={`flex-1 transition-all duration-300 ${active ? 'shadow-md' : ''}`}
            >
              <div className={`p-1.5 rounded-lg mr-2 ${active ? 'bg-white/20 dark:bg-slate-800/50' : 'bg-muted'}`}>
                {React.createElement(stat.icon, { className: `h-4 w-4 ${active ? '' : stat.color}` })}
              </div>
              <span className={active ? 'font-semibold' : ''}>{stat.label}</span>
              <Badge variant={active ? "secondary" : "outline"} className="ml-2">
                {count}
              </Badge>
            </Button>
          );
        })}
      </motion.div>  {/* [memory:5] */}

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-muted rounded-lg">
                  {statuses.find(s => s.key === selectedTab)?.icon && 
                    React.createElement(statuses.find(s => s.key === selectedTab)!.icon, { className: "h-5 w-5" })
                  }
                </div>
                {statuses.find(s => s.key === selectedTab)?.label}
              </CardTitle>
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
          </CardHeader>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading...</p>
                </motion.div>
              )}

              {!loading && filteredTasks.length === 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center py-12">
                  <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
                  <p className="text-muted-foreground">
                    You don't have any {statuses.find(s => s.key === selectedTab)?.label.toLowerCase()} at the moment.
                  </p>
                </motion.div>
              )}

              {!loading && filteredTasks.length > 0 && (
                viewMode === 'table' ? (
                  <div className="overflow-x-auto rounded-lg border border-border/50">
                    <Table className="[&_td]:py-2 [&_th]:py-2 [&_td]:px-3 [&_th]:px-3">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {selectedTab.startsWith('daily') ? (
                            <>
                              <TableHead className="font-semibold text-xs">Date</TableHead>
                              <TableHead className="font-semibold text-xs">Shift Start</TableHead>
                              <TableHead className="font-semibold text-xs">Shift End</TableHead>
                              <TableHead className="font-semibold text-xs">Hours</TableHead>
                              <TableHead className="font-semibold text-xs">Status</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="font-semibold text-xs">Title</TableHead>
                              <TableHead className="font-semibold text-xs">Shift</TableHead>
                              <TableHead className="font-semibold text-xs">Due Date</TableHead>
                              <TableHead className="font-semibold text-xs">Priority</TableHead>
                              <TableHead className="font-semibold text-xs">Status</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTasks.map((item, index) =>
                          selectedTab.startsWith('daily') ? (
                            <TableRow key={item.id || index} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="text-xs font-medium">{item.dutyDate || '—'}</TableCell>
                              <TableCell className="text-xs">{item.shiftStart || '—'}</TableCell>
                              <TableCell className="text-xs">{item.shiftEnd || '—'}</TableCell>
                              <TableCell className="text-xs font-semibold">{item.totalHours || calculateHours(item.shiftStart, item.shiftEnd)}h</TableCell>
                              <TableCell><Badge className={`text-[10px] px-1.5 py-0 ${
                                item.status === 'COMPLETED' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
                                item.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                                'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                              }`}>{item.status || 'SCHEDULED'}</Badge></TableCell>
                            </TableRow>
                          ) : (
                            <TableRow key={item.id || index} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="text-xs font-medium">{item.taskTitle}</TableCell>
                              <TableCell className="text-xs">{item.shift || '—'}</TableCell>
                              <TableCell className={`text-xs ${isOverdue(item.dueDate) && item.status !== 'completed' ? 'text-destructive font-semibold' : ''}`}>{item.dueDate || '—'}</TableCell>
                              <TableCell>{item.priority ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">{String(item.priority).toUpperCase()}</Badge> : '—'}</TableCell>
                              <TableCell><Badge className="bg-muted text-foreground border-border text-[10px] px-1.5 py-0 capitalize">{String(item.status || '').replace('-', ' ')}</Badge></TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                <div className="space-y-4">
                  {paginatedTasks.map((item, index) => 
                    selectedTab.startsWith('daily') 
                      ? renderDailyDutyCard(item, index)
                      : renderTaskCard(item, index)
                  )}
                </div>
                )
              )}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="hover:bg-muted transition-all"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page <= 2) {
                      pageNum = i;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 ${page === pageNum ? 'shadow-md' : 'hover:bg-muted'}`}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="hover:bg-muted transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

