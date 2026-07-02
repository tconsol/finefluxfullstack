import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const orgId = searchParams.get('orgId');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!newPassword || !confirm) {
      setMsg('Please fill both fields.');
      return;
    }
    if (newPassword !== confirm) {
      setMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/organizations/${orgId}/employees/reset-password`, {
        token,
        newPassword
      });
      setMsg('Password successfully reset. Redirecting to sign in…');
      setTimeout(() => navigate('/'), 2000); // Go to login page after 2 sec
    } catch (err: any) {
      setMsg(
        err?.response?.status === 400
          ? 'Reset failed: Invalid or expired link.'
          : 'Reset failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token || !orgId)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid or Broken Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This reset password link is invalid or missing some parameters.</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading || !newPassword || !confirm}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            {msg && (
              <div className="text-sm text-muted-foreground text-center mt-2">{msg}</div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
