import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Coffee,
  LogOut,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Loader2,
  BarChart3,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { API_CONFIG } from '@/lib/api-config';
import { format } from "date-fns";

// Backend DTOs matching your Java backend
interface EmployeeAttendanceCreateDTO {
  organizationId: string;
  empId: string;
  username: string;
  checkIn: string; // LocalDateTime as ISO string
  checkOut?: string;
  breakIn?: string;
  breakOut?: string;
  description?: string;
}

interface EmployeeAttendanceUpdateDTO {
  present?: boolean;
  absent?: boolean;
  checkIn?: string;
  checkOut?: string;
  breakIn?: string;
  breakOut?: string;
  description?: string;
}

interface EmployeeAttendanceResponseDTO {
  id: string;
  organizationId: string;
  empId: string;
  username: string;
  checkIn: string;
  checkOut: string;
  breakIn: string;
  breakOut: string;
  breakTime: string;
  working: string;
  shortTime: string;
  extraHours: string;
  description: string;
  present: boolean;
  absent: boolean;
  attendanceRate: string;
  avgHours: string;
}

// Removed - using API_CONFIG

export default function EmployeeAttendance() {
  const { toast } = useToast();
  
  const [todayAttendance, setTodayAttendance] = useState<EmployeeAttendanceResponseDTO | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendanceResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Live tracking state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveWorkingTime, setLiveWorkingTime] = useState("00:00:00");
  const [liveBreakTime, setLiveBreakTime] = useState("00:00:00");

  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";
  
  // Get username from user object in localStorage
  let username = "";
  try {
    const userStr = localStorage.getItem("petrol_bunk_user") || sessionStorage.getItem("petrol_bunk_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      username = user.username || user.name || user.email || "";
    }
  } catch (error) {
    console.error("Failed to parse user from storage:", error);
  }

  // Format date to LocalDateTime string in IST (ISO 8601 format for Java backend)
  const toLocalDateTime = (date: Date): string => {
    // Convert to IST (UTC +5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(date.getTime() + istOffset);
    
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(istDate.getUTCDate()).padStart(2, "0");
    const hours = String(istDate.getUTCHours()).padStart(2, "0");
    const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(istDate.getUTCSeconds()).padStart(2, "0");
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Fetch today's attendance and all records - useCallback to prevent infinite loops
  const fetchAttendance = useCallback(async () => {
    if (!orgId || !empId) {
      return;
    }
    
    setLoading(true);
    try {
      // GET /api/organizations/{organizationId}/attendance/employee/{empId}
      const response = await axios.get<EmployeeAttendanceResponseDTO[]>(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/attendance/employee/${empId}`
      );

      const records = response.data || [];
      
      // Sort records by checkIn date descending (newest first)
      const sortedRecords = records.sort((a, b) => {
        const dateA = a.checkIn ? new Date(a.checkIn).getTime() : 0;
        const dateB = b.checkIn ? new Date(b.checkIn).getTime() : 0;
        return dateB - dateA;
      });
      
      setAttendanceRecords(sortedRecords);

      // Find today's record
      const today = format(new Date(), "yyyy-MM-dd");
      const todayRecord = sortedRecords.find((record) => {
        if (record.checkIn) {
          const recordDate = record.checkIn.split("T")[0];
          return recordDate === today;
        }
        return false;
      });

      setTodayAttendance(todayRecord || null);
    } catch (error: any) {
      console.error("Failed to fetch attendance:", error);
      
      // Don't show error toast on initial load if no records exist
      if (error.response?.status !== 404) {
        toast({
          title: "Error fetching attendance",
          description: error.response?.data?.message || error.message || "Failed to fetch attendance records",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, empId, toast]);

  useEffect(() => {
    if (orgId && empId) {
      fetchAttendance();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchAttendance, 30000);
      return () => clearInterval(interval);
    }
  }, [orgId, empId, fetchAttendance]);

  // Check In - POST /api/organizations/{organizationId}/attendance
  const handleCheckIn = async () => {
    if (!orgId || !empId || !username) {
      toast({
        title: "Error",
        description: "Missing required information. Please login again.",
        variant: "destructive",
      });
      console.error("Missing credentials:", { orgId, empId, username });
      return;
    }

    // Check if already checked in today
    if (todayAttendance) {
      toast({
        title: "Already Checked In",
        description: "You have already checked in today.",
        variant: "destructive",
      });
      return;
    }
    
    setActionLoading("checkin");
    try {
      const now = new Date();
      const checkInTime = toLocalDateTime(now);
      
      const createDTO: EmployeeAttendanceCreateDTO = {
        organizationId: orgId,
        empId,
        username,
        checkIn: checkInTime,
      };


      // POST to backend
      const response = await axios.post<EmployeeAttendanceResponseDTO>(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/attendance`,
        createDTO,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      
      setTodayAttendance(response.data);
      toast({
        title: "✓ Checked In Successfully",
        description: `Welcome ${username}! Your attendance has been recorded at ${formatTime(response.data.checkIn)}`,
      });
      
      // Refresh to get latest data with calculated metrics
      await fetchAttendance();
    } catch (error: any) {
      console.error("Check-in failed - Full error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      let errorMessage = "Failed to check in. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Check-in Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Break In - PUT /api/organizations/{organizationId}/attendance/{id}
  const handleBreakIn = async () => {
    if (!todayAttendance) {
      toast({
        title: "Cannot Start Break",
        description: "Please check in first before taking a break.",
        variant: "destructive",
      });
      return;
    }

    if (!canBreakIn) {
      toast({
        title: "Cannot Start Break",
        description: isOnBreak 
          ? "You are already on a break. Please end your break first."
          : hasCheckedOut
          ? "You have already checked out for today."
          : "Please check in first.",
        variant: "destructive",
      });
      return;
    }
    
    setActionLoading("breakin");
    try {
      const now = new Date();
      const breakInTime = toLocalDateTime(now);
      
      const updateDTO: EmployeeAttendanceUpdateDTO = {
        breakIn: breakInTime,
      };


      // PUT to backend
      const response = await axios.put<EmployeeAttendanceResponseDTO>(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/attendance/${todayAttendance.id}`,
        updateDTO
      );

      
      setTodayAttendance(response.data);
      toast({
        title: "☕ Break Started",
        description: `Break started at ${formatTime(response.data.breakIn)}. Enjoy your break!`,
      });
      
      // Refresh to get latest calculated metrics
      await fetchAttendance();
    } catch (error: any) {
      console.error("Break-in failed - Full error:", error);
      console.error("Error response:", error.response?.data);
      
      toast({
        title: "Break Start Failed",
        description: error.response?.data?.message || error.message || "Failed to start break. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Break Out - PUT /api/organizations/{organizationId}/attendance/{id}
  const handleBreakOut = async () => {
    if (!todayAttendance) {
      toast({
        title: "Cannot End Break",
        description: "No active attendance record found.",
        variant: "destructive",
      });
      return;
    }

    if (!canBreakOut) {
      toast({
        title: "Cannot End Break",
        description: !isOnBreak 
          ? "You need to start a break before you can end it."
          : hasCheckedOut
          ? "You have already checked out for today."
          : "Please start a break first.",
        variant: "destructive",
      });
      return;
    }
    
    setActionLoading("breakout");
    try {
      const now = new Date();
      const breakOutTime = toLocalDateTime(now);
      
      const updateDTO: EmployeeAttendanceUpdateDTO = {
        breakOut: breakOutTime,
      };


      // PUT to backend
      const response = await axios.put<EmployeeAttendanceResponseDTO>(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/attendance/${todayAttendance.id}`,
        updateDTO
      );

      
      setTodayAttendance(response.data);
      toast({
        title: "✓ Break Ended",
        description: `Break ended at ${formatTime(response.data.breakOut)}. Welcome back!`,
      });
      
      // Refresh to get latest calculated metrics
      await fetchAttendance();
    } catch (error: any) {
      console.error("Break-out failed - Full error:", error);
      console.error("Error response:", error.response?.data);
      
      toast({
        title: "Break End Failed",
        description: error.response?.data?.message || error.message || "Failed to end break. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Check Out - PUT /api/organizations/{organizationId}/attendance/{id}
  const handleCheckOut = async () => {
    if (!todayAttendance) {
      toast({
        title: "Cannot Check Out",
        description: "Please check in first before checking out.",
        variant: "destructive",
      });
      return;
    }

    if (hasCheckedOut) {
      toast({
        title: "Already Checked Out",
        description: "You have already checked out for today.",
        variant: "destructive",
      });
      return;
    }

    // Check if on break - must end break before checkout
    if (isOnBreak) {
      toast({
        title: "Cannot Check Out",
        description: "Please end your break before checking out.",
        variant: "destructive",
      });
      return;
    }

    if (!canCheckOut) {
      toast({
        title: "Cannot Check Out",
        description: "Please complete your break cycle before checking out.",
        variant: "destructive",
      });
      return;
    }
    
    setActionLoading("checkout");
    try {
      const now = new Date();
      const checkOutTime = toLocalDateTime(now);
      
      const updateDTO: EmployeeAttendanceUpdateDTO = {
        checkOut: checkOutTime,
      };


      // PUT to backend
      const response = await axios.put<EmployeeAttendanceResponseDTO>(
        `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/attendance/${todayAttendance.id}`,
        updateDTO
      );

      
      setTodayAttendance(response.data);
      toast({
        title: "✓ Checked Out Successfully",
        description: `Good job today! Total working time: ${response.data.working || "Calculated by backend"}`,
      });
      
      // Refresh to get final calculated metrics
      await fetchAttendance();
    } catch (error: any) {
      console.error("Check-out failed - Full error:", error);
      console.error("Error response:", error.response?.data);
      
      toast({
        title: "Check-out Failed",
        description: error.response?.data?.message || error.message || "Failed to check out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Format time from LocalDateTime string
  const formatTime = (dateTimeStr: string | null | undefined): string => {
    if (!dateTimeStr) return "--:--";
    try {
      const date = new Date(dateTimeStr);
      return format(date, "HH:mm");
    } catch {
      return "--:--";
    }
  };

  // Format date from LocalDateTime string
  const formatDate = (dateTimeStr: string | null | undefined): string => {
    if (!dateTimeStr) return "--";
    try {
      const date = new Date(dateTimeStr);
      return format(date, "dd MMM yyyy");
    } catch {
      return "--";
    }
  };

  // Calculate duration between two times in HH:MM:SS format
  const calculateDuration = (start: Date, end: Date): string => {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Live tracking - update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate live working time and break time
  useEffect(() => {
    if (!todayAttendance) {
      setLiveWorkingTime("00:00:00");
      setLiveBreakTime("00:00:00");
      return;
    }

    try {
      const checkInTime = todayAttendance.checkIn ? new Date(todayAttendance.checkIn) : null;
      const checkOutTime = todayAttendance.checkOut && todayAttendance.checkOut !== "" 
        ? new Date(todayAttendance.checkOut) 
        : null;
      const breakInTime = todayAttendance.breakIn && todayAttendance.breakIn !== ""
        ? new Date(todayAttendance.breakIn)
        : null;
      const breakOutTime = todayAttendance.breakOut && todayAttendance.breakOut !== ""
        ? new Date(todayAttendance.breakOut)
        : null;

      // Debug logging

      if (checkInTime) {
        // Calculate total elapsed time
        const endTime = checkOutTime || currentTime;

        // Calculate break time - MUST show if breakIn exists
        let breakDuration = 0;
        if (breakInTime) {
          const breakEnd = breakOutTime || currentTime;
          breakDuration = breakEnd.getTime() - breakInTime.getTime();
          
          // Ensure positive duration
          if (breakDuration < 0) breakDuration = 0;
          
          const breakTime = calculateDuration(breakInTime, breakEnd);
          setLiveBreakTime(breakTime);
        } else {
          setLiveBreakTime("00:00:00");
        }

        // Calculate working time (total - break)
        const totalMs = endTime.getTime() - checkInTime.getTime();
        const workingMs = Math.max(0, totalMs - breakDuration);
        const workingHours = Math.floor(workingMs / (1000 * 60 * 60));
        const workingMinutes = Math.floor((workingMs % (1000 * 60 * 60)) / (1000 * 60));
        const workingSeconds = Math.floor((workingMs % (1000 * 60)) / 1000);
        
        setLiveWorkingTime(`${String(workingHours).padStart(2, "0")}:${String(workingMinutes).padStart(2, "0")}:${String(workingSeconds).padStart(2, "0")}`);
      }
    } catch (error) {
      console.error("Error calculating live time:", error);
    }
  }, [todayAttendance, currentTime]);

  const hasCheckedIn = todayAttendance !== null;
  const hasCheckedOut = !!(todayAttendance?.checkOut && todayAttendance.checkOut !== "");
  const hasBreakIn = !!(todayAttendance?.breakIn && todayAttendance.breakIn !== "");
  const hasBreakOut = !!(todayAttendance?.breakOut && todayAttendance.breakOut !== "");
  const isOnBreak = hasBreakIn && !hasBreakOut;

  // Button states based on flow
  const canCheckIn = !hasCheckedIn;
  const canBreakIn = hasCheckedIn && !hasCheckedOut && !isOnBreak;
  const canBreakOut = hasCheckedIn && !hasCheckedOut && isOnBreak;
  const canCheckOut = hasCheckedIn && !hasCheckedOut && !isOnBreak;

  // Show loading only on initial load
  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading attendance data...</p>
      </div>
    );
  }

  // Show error if no organization or employee ID
  if (!orgId || !empId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Missing Information</h2>
        <p className="text-muted-foreground">Please login again to access attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance and working hours</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {format(new Date(), "EEEE, dd MMMM yyyy")}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAttendance}
            disabled={loading}
            title="Refresh attendance data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={handleCheckIn}
              disabled={!canCheckIn || actionLoading !== null}
              className="w-full h-16 text-lg"
              variant={hasCheckedIn ? "secondary" : "default"}
            >
              {actionLoading === "checkin" ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Check In
            </Button>

            <Button
              onClick={handleBreakIn}
              disabled={!canBreakIn || actionLoading !== null}
              className="w-full h-16 text-lg"
              variant="outline"
            >
              {actionLoading === "breakin" ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Coffee className="h-5 w-5 mr-2" />
              )}
              Break In
            </Button>

            <Button
              onClick={handleBreakOut}
              disabled={!canBreakOut || actionLoading !== null}
              className="w-full h-16 text-lg"
              variant="outline"
            >
              {actionLoading === "breakout" ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Coffee className="h-5 w-5 mr-2" />
              )}
              Break Out
            </Button>

            <Button
              onClick={handleCheckOut}
              disabled={!canCheckOut || actionLoading !== null}
              className="w-full h-16 text-lg"
              variant={hasCheckedOut ? "secondary" : "destructive"}
            >
              {actionLoading === "checkout" ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <LogOut className="h-5 w-5 mr-2" />
              )}
              Check Out
            </Button>
          </div>

          {/* Live Tracking Timer */}
          {hasCheckedIn && !hasCheckedOut && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                <h3 className="text-lg font-semibold">Live Tracking</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">Working Time (Live)</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {liveWorkingTime}
                  </p>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">Break Time (Live)</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                    {liveBreakTime}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Today's Times */}
          {hasCheckedIn && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Check In</p>
                <p className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatTime(todayAttendance?.checkIn)}
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Break In</p>
                <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {formatTime(todayAttendance?.breakIn)}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Break Out</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {formatTime(todayAttendance?.breakOut)}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Check Out</p>
                <p className="text-base font-bold text-red-600 dark:text-red-400">
                  {formatTime(todayAttendance?.checkOut)}
                </p>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          {hasCheckedIn && (
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              {hasCheckedOut ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Completed for today</span>
                </>
              ) : isOnBreak ? (
                <>
                  <Coffee className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Currently on break</span>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Active - Working</span>
                </>
              )}
            </div>
          )}

          {/* Calculated Metrics - All calculated by backend */}
          {hasCheckedIn && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="text-center p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Working Time</p>
                <p className="text-base font-bold">{todayAttendance?.working || "--"}</p>
              </div>
              <div className="text-center p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Break Time</p>
                <p className="text-base font-bold">{todayAttendance?.breakTime || "--"}</p>
              </div>
              <div className="text-center p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Short Time</p>
                <p className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                  {todayAttendance?.shortTime || "--"}
                </p>
              </div>
              <div className="text-center p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <p className="text-xs text-muted-foreground mb-0.5">Extra Hours</p>
                <p className="text-base font-bold text-green-600 dark:text-green-400">
                  {todayAttendance?.extraHours || "--"}
                </p>
              </div>
            </div>
          )}

          {/* No attendance message */}
          {!hasCheckedIn && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No attendance recorded for today</p>
              <p className="text-sm">Click "Check In" to start your work day</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Statistics */}
      {todayAttendance && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full shrink-0">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  <p className="text-base font-bold">{todayAttendance.attendanceRate || "0%"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full shrink-0">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
                  <p className="text-base font-bold">{todayAttendance.avgHours || "0h"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Attendance Records */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendanceRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records found</p>
            ) : (
              attendanceRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{formatDate(record.checkIn)}</span>
                    </div>
                    <Badge variant={record.present ? "default" : "destructive"}>
                      {record.present ? "Present" : "Absent"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Check In</p>
                      <p className="font-medium">{formatTime(record.checkIn)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check Out</p>
                      <p className="font-medium">{formatTime(record.checkOut)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Working</p>
                      <p className="font-medium">{record.working || "--"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Break</p>
                      <p className="font-medium">{record.breakTime || "--"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Short Time</p>
                      <p className="font-medium text-yellow-600">{record.shortTime || "--"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Extra Hours</p>
                      <p className="font-medium text-green-600">{record.extraHours || "--"}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

