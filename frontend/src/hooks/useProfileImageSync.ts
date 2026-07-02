// src/hooks/useProfileImageSync.ts
import { useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const PROFILE_URL_KEY = "profileImageUrl";

export function useProfileImageSync() {
  useEffect(() => {
    // On load: try to get and sync image
    const orgId = localStorage.getItem("organizationId");
    const empId = localStorage.getItem("empId");
    if (orgId && empId) {
      axios.get(`${API_BASE}/api/organizations/${orgId}/employees?page=0&size=100`)
        .then(res => {
          const items = Array.isArray(res.data?.content)
            ? res.data.content
            : Array.isArray(res.data)
              ? res.data
              : [];
          const emp = items.find((x: any) => x.empId === empId);
          if (emp && emp.profileImageUrl) {
            localStorage.setItem(PROFILE_URL_KEY, emp.profileImageUrl);
          } else {
            localStorage.removeItem(PROFILE_URL_KEY);
          }
        })
        .catch(() => localStorage.removeItem(PROFILE_URL_KEY));
    }
    // On tab close/refresh: clear image
    const clearImg = () => localStorage.removeItem(PROFILE_URL_KEY);
    window.addEventListener("beforeunload", clearImg);
    return () => window.removeEventListener("beforeunload", clearImg);
  }, []);
}
