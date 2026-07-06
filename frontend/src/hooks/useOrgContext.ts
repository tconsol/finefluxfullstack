import { useState, useEffect } from 'react';

/**
 * Custom hook to access organization and employee context from localStorage
 * This centralizes the pattern used across multiple components
 */
export const useOrgContext = () => {
  const [orgId, setOrgId] = useState('');
  const [empId, setEmpId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Fetch organization ID
    const storedOrgId = localStorage.getItem('organizationId') || '';
    setOrgId(storedOrgId);

    // Fetch employee ID
    const storedEmpId = localStorage.getItem('empId') || '';
    setEmpId(storedEmpId);

    // Fetch username from user object
    const userStr = localStorage.getItem('petrol_bunk_user') || sessionStorage.getItem('petrol_bunk_user') || '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUsername(user.username || '');
      } catch (error) {
        console.error('Failed to parse user from storage:', error);
      }
    }
  }, []);

  return { orgId, empId, username };
};
