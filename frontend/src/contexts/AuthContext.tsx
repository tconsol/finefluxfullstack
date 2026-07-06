// AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_CONFIG } from '@/lib/api-config';

export type UserRole = 'owner' | 'manager' | 'employee';

export interface User {
  profileImageUrl: string;
  username: string;
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  employeeId?: string;
  organizationId?: string;
  empId?: string;
  phone?: string;
  joinDate?: string;
  isActive?: boolean;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Session storage keys (for authentication)
const SESSION_USER_KEY = 'petrol_bunk_user';
const SESSION_LOGGED_IN_KEY = 'isLoggedIn';
const SESSION_ROLE_KEY = 'role';
const SESSION_LAST_ACTIVITY_KEY = 'lastActivityTime';

// LocalStorage keys (for persistent data needed for operations)
const LOCAL_ORG_ID_KEY = 'organizationId';
const LOCAL_EMP_ID_KEY = 'empId';
const LOCAL_USERNAME_KEY = 'username';
const LOCAL_PROFILE_URL_KEY = 'profileImageUrl';

// Auto logout after 30 minutes of inactivity (in milliseconds)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

type ApiResponse = {
  id: string;
  username: string;
  role: string;
  organizationId?: string;
  empId?: string;
  email?: string;
  token?: string;
};

function normalizeRole(r?: string): UserRole {
  const v = String(r ?? '').trim().toLowerCase();
  if (v === 'owner' || v === 'manager' || v === 'employee') return v as UserRole;
  return 'employee';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all session storage
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_LOGGED_IN_KEY);
    sessionStorage.removeItem(SESSION_ROLE_KEY);
    sessionStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  };

  // Clear operational data from localStorage
  const clearLocalStorageData = () => {
    localStorage.removeItem(LOCAL_ORG_ID_KEY);
    localStorage.removeItem(LOCAL_EMP_ID_KEY);
    localStorage.removeItem(LOCAL_USERNAME_KEY);
    localStorage.removeItem(LOCAL_PROFILE_URL_KEY);
    // Also clear legacy items
    localStorage.removeItem('petrol_bunk_user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('loginTime');
  };

  // Check if session is expired
  const isSessionExpired = (): boolean => {
    const lastActivity = sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
    if (!lastActivity) return true;
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
    return timeSinceLastActivity > INACTIVITY_TIMEOUT;
  };

  // Update last activity time
  const updateActivity = () => {
    sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, Date.now().toString());
    resetInactivityTimer();
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      console.warn('Session expired due to inactivity');
      logout();
    }, INACTIVITY_TIMEOUT);
  };

  // Initialize session on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    
    if (raw) {
      // Check if session expired
      if (isSessionExpired()) {
        console.warn('Session expired - logging out');
        clearSession();
        setIsLoading(false);
        return;
      }

      try {
        const parsed: User = JSON.parse(raw);
        setUser(parsed);
        updateActivity();
        
        // Restore operational data from localStorage if available
        const storedOrgId = localStorage.getItem(LOCAL_ORG_ID_KEY);
        const storedEmpId = localStorage.getItem(LOCAL_EMP_ID_KEY);
        const storedProfileUrl = localStorage.getItem(LOCAL_PROFILE_URL_KEY);
        
        if (storedOrgId) parsed.organizationId = storedOrgId;
        if (storedEmpId) parsed.empId = storedEmpId;
        if (storedProfileUrl) parsed.profileImageUrl = storedProfileUrl;
      } catch (error) {
        console.error('Failed to parse user session:', error);
        clearSession();
      }
    }
    
    setIsLoading(false);
    
    return () => {
      try { 
        controllerRef.current?.abort();
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      } catch {}
    };
  }, []);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Start inactivity timer
    resetInactivityTimer();

    return () => {
      // Cleanup event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try { controllerRef.current?.abort(); } catch {}
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      // Sanitize inputs
      const sanitizedUsername = username.trim();
      const sanitizedPassword = password.trim();

      if (!sanitizedUsername || !sanitizedPassword) {
        console.error('Username and password are required');
        return false;
      }

      const res = await axios.post<ApiResponse>(
        API_CONFIG.LOGIN_URL,
        { username: sanitizedUsername, password: sanitizedPassword },
        {
          timeout: API_CONFIG.TIMEOUT,
          signal: controller.signal,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data: ApiResponse = res.data || { id: '', username: '', role: '' };
      const role: UserRole = normalizeRole(data.role);

      const nextUser: User = {
        id: String(data.id ?? sanitizedUsername),
        name: data.username ?? sanitizedUsername,
        role,
        email: data.email,
        employeeId: data.id ? String(data.id) : undefined,
        organizationId: data.organizationId ?? undefined,
        empId: data.empId ?? undefined,
        token: data.token,
        profileImageUrl: '',
        username: sanitizedUsername
      };

      // Store authentication data in session storage only
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(nextUser));
      sessionStorage.setItem(SESSION_LOGGED_IN_KEY, 'true');
      sessionStorage.setItem(SESSION_ROLE_KEY, role);

      // Store operational data in localStorage for persistent access
      if (nextUser.organizationId) {
        localStorage.setItem(LOCAL_ORG_ID_KEY, nextUser.organizationId);
      }
      if (nextUser.empId) {
        localStorage.setItem(LOCAL_EMP_ID_KEY, nextUser.empId);
      }
      if (sanitizedUsername) {
        localStorage.setItem(LOCAL_USERNAME_KEY, sanitizedUsername);
      }

      // Set initial activity time
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, Date.now().toString());

      // Fetch profile image immediately after login
      if (nextUser.organizationId && nextUser.empId) {
        try {
          const employeeRes = await axios.get(
            `${API_CONFIG.BASE_URL}/api/organizations/${nextUser.organizationId}/employees?page=0&size=100`,
            {
              timeout: API_CONFIG.TIMEOUT,
              signal: controller.signal,
            }
          );
          
          const items = Array.isArray(employeeRes.data?.content)
            ? employeeRes.data.content
            : Array.isArray(employeeRes.data)
              ? employeeRes.data
              : [];
          
          const emp = items.find((x: any) => x.empId === nextUser.empId);
          
          if (emp && emp.profileImageUrl) {
            localStorage.setItem(LOCAL_PROFILE_URL_KEY, emp.profileImageUrl);
            nextUser.profileImageUrl = emp.profileImageUrl;
          } else {
            localStorage.removeItem(LOCAL_PROFILE_URL_KEY);
          }
        } catch (error) {
          console.warn('Failed to fetch profile image:', error);
          localStorage.removeItem(LOCAL_PROFILE_URL_KEY);
        }
      }

      setUser(nextUser);
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('Invalid credentials');
        } else if (error.code === 'ECONNABORTED') {
          console.error('Login request timeout');
        }
      }
      
      return false;
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  const logout = () => {
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Clear user state
    setUser(null);

    // Clear session storage (authentication data)
    clearSession();

    // Clear localStorage (operational data)
    clearLocalStorageData();

    console.log('User logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
