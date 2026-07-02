import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Loader2, Lock, User, Mail, Shield, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState<"password" | "username" | null>(null);
  const [mounted, setMounted] = useState(false);

  const [orgList, setOrgList] = useState<{ organizationId: string; organizationName: string }[]>([]);
  const [resetOrgId, setResetOrgId] = useState('');
  const [resetEmailOrUsername, setResetEmailOrUsername] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [recoveryOrgId, setRecoveryOrgId] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (forgotOpen) {
      axios
        .get(`${API_BASE}/api/organizations`)
        .then(res => {
          let arr = Array.isArray(res.data?.content) ? res.data.content : [];
          setOrgList(arr);
        })
        .catch(() => setOrgList([]));
    }
  }, [forgotOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      toast({ title: 'Error', description: 'Please enter both username and password', variant: 'destructive' });
      return;
    }
    try {
      const ok = await login(u, p);
      if (ok) {
        toast({ title: 'Welcome back!', description: 'Login successful' });
        const from = (location.state as any)?.from?.pathname as string | undefined;
        navigate(from || '/dashboard', { replace: true });
      } else {
        toast({ title: 'Login failed', description: 'Invalid username or password', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Login failed', description: 'Unexpected error', variant: 'destructive' });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOrgId || !resetEmailOrUsername.trim()) {
      toast({ title: 'Missing information', description: 'Select organization and enter username/email.', variant: 'destructive' });
      return;
    }
    setResetLoading(true);
    try {
      await axios.post(
        `${API_BASE}/api/organizations/${resetOrgId}/employees/forgot-password`,
        { emailOrUsername: resetEmailOrUsername.trim() }
      );
      toast({
        title: 'Password reset requested',
        description: 'If an account exists, you will receive an email with instructions.',
      });
      handleCloseModal();
    } catch {
      toast({
        title: 'Password reset requested',
        description: 'If an account exists, you will receive an email with instructions.',
      });
      handleCloseModal();
    } finally {
      setResetLoading(false);
    }
  };

  const handleUsernameRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryOrgId || !recoveryEmail.trim()) {
      toast({ title: 'Missing information', description: 'Select organization and enter email.', variant: 'destructive' });
      return;
    }
    setRecoveryLoading(true);
    try {
      await axios.post(
        `${API_BASE}/api/organizations/${recoveryOrgId}/employees/forgot-username`,
        { email: recoveryEmail.trim() }
      );
      toast({
        title: 'Username sent',
        description: 'If an account exists, your username has been emailed.',
      });
      handleCloseModal();
    } catch {
      toast({
        title: 'Username sent',
        description: 'No matching account or server error.',
      });
      handleCloseModal();
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleOpenForgotPassword = () => {
    setForgotOpen('password'); setResetOrgId(''); setResetEmailOrUsername('');
  };
  const handleOpenForgotUsername = () => {
    setForgotOpen('username'); setRecoveryOrgId(''); setRecoveryEmail('');
  };
  const handleCloseModal = () => {
    setForgotOpen(null); setResetOrgId(''); setResetEmailOrUsername(''); setRecoveryOrgId(''); setRecoveryEmail('');
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 flex items-center justify-center px-4 py-6 relative overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-25px) scale(1.05); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .glass-premium {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border: 2px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.08);
        }
        .modal-premium {
          background: linear-gradient(135deg, rgba(20, 20, 35, 0.98) 0%, rgba(30, 20, 50, 0.98) 100%);
          backdrop-filter: blur(40px);
          border: 2px solid rgba(255, 255, 255, 0.15);
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 4s linear infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.7s ease-out forwards; }
      `}</style>

      {/* Advanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-purple-600/40 to-pink-600/40 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-blue-600/40 to-cyan-600/40 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      {/* Sparkle Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse-glow"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className={`w-full max-w-md space-y-4 relative z-10 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Logo Section */}
        <div className="text-center space-y-3 animate-fade-in-up">
          <div className="flex justify-center">
            <div className="glass-premium p-5 rounded-[24px] shadow-2xl animate-float relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-[24px] blur-xl group-hover:blur-2xl transition-all duration-500" />
              <Building2 className="h-12 w-12 text-white drop-shadow-2xl relative z-10" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white via-pink-200 to-white bg-clip-text text-transparent animate-shimmer drop-shadow-lg" style={{ backgroundSize: '300% 100%' }}>
              FineFlux
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-3 w-3 text-purple-300 animate-pulse" />
              <p className="text-white/80 text-sm font-semibold tracking-wide">Petrol Station Management</p>
              <Sparkles className="h-3 w-3 text-pink-300 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="glass-premium shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30">
                <Shield className="h-5 w-5 text-white" />
              </div>
              Welcome Back
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-white/95 text-sm font-bold flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-purple-300" />
                  Username <span className="text-red-400">*</span>
                </Label>
                <div className="relative group">
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-white/10 border-2 border-white/25 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 transition-all duration-300 font-medium"
                    required
                    spellCheck={false}
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/95 text-sm font-bold flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-pink-300" />
                  Password <span className="text-red-400">*</span>
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 pr-11 bg-white/10 border-2 border-white/25 text-white placeholder:text-white/50 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 transition-all duration-300 font-medium"
                    required
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 hover:bg-white/15 text-white/70 hover:text-white transition-all"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                
                {/* Forgot Links */}
                <div className="flex justify-between text-xs pt-1.5">
                  <button
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-purple-300 hover:text-purple-100 underline underline-offset-2 transition-colors font-semibold"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenForgotUsername}
                    className="text-pink-300 hover:text-pink-100 underline underline-offset-2 transition-colors font-semibold"
                  >
                    Forgot username?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white font-bold text-base shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all duration-300 mt-4 animate-shimmer disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundSize: '200% 100%' }}
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Sign In Securely
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-white/70 text-xs space-y-0.5 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="font-semibold">© {currentYear} FineFlux System</p>
          <p className="text-white/50">Secure Management Platform</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen === 'password' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="modal-premium rounded-3xl shadow-2xl w-full max-w-md p-7 relative border-2">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all hover:rotate-90 duration-300"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Lock className="h-6 w-6 text-purple-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Reset Password</h2>
                <p className="text-white/60 text-xs">Recover your account access</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handlePasswordReset}>
              <div className="space-y-2">
                <Label className="text-white/95 text-sm font-bold">Organization</Label>
                <Select value={resetOrgId} onValueChange={setResetOrgId}>
                  <SelectTrigger className="h-11 bg-white/10 border-2 border-white/25 text-white focus:border-purple-400 hover:bg-white/15 transition-all">
                    <SelectValue placeholder="Select your organization" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-2 border-white/20 text-white">
                    {orgList.map(org => (
                      <SelectItem 
                        key={org.organizationId} 
                        value={org.organizationId} 
                        className="focus:bg-white/10 cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{org.organizationName}</span>
                          <span className="text-xs text-white/60">ID: {org.organizationId}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/95 text-sm font-bold flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-purple-300" />
                  Email or Username
                </Label>
                <Input
                  type="text"
                  autoFocus
                  placeholder="Enter your email or username"
                  value={resetEmailOrUsername}
                  onChange={e => setResetEmailOrUsername(e.target.value)}
                  className="h-11 bg-white/10 border-2 border-white/25 text-white placeholder:text-white/50 focus:border-purple-400 font-medium"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={resetLoading || !resetOrgId || !resetEmailOrUsername}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg"
                >
                  {resetLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Send Reset Link
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseModal}
                  className="w-full h-11 bg-white/5 border-2 border-white/25 text-white hover:bg-white/15"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Username Modal */}
      {forgotOpen === 'username' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="modal-premium rounded-3xl shadow-2xl w-full max-w-md p-7 relative border-2">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all hover:rotate-90 duration-300"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <User className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Find Username</h2>
                <p className="text-white/60 text-xs">Retrieve your account username</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleUsernameRecovery}>
              <div className="space-y-2">
                <Label className="text-white/95 text-sm font-bold">Organization</Label>
                <Select value={recoveryOrgId} onValueChange={setRecoveryOrgId}>
                  <SelectTrigger className="h-11 bg-white/10 border-2 border-white/25 text-white focus:border-blue-400 hover:bg-white/15 transition-all">
                    <SelectValue placeholder="Select your organization" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-2 border-white/20 text-white">
                    {orgList.map(org => (
                      <SelectItem 
                        key={org.organizationId} 
                        value={org.organizationId} 
                        className="focus:bg-white/10 cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{org.organizationName}</span>
                          <span className="text-xs text-white/60">ID: {org.organizationId}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/95 text-sm font-bold flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-blue-300" />
                  Email Address
                </Label>
                <Input
                  type="email"
                  autoFocus
                  placeholder="Enter your registered email"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  className="h-11 bg-white/10 border-2 border-white/25 text-white placeholder:text-white/50 focus:border-blue-400 font-medium"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={recoveryLoading || !recoveryOrgId || !recoveryEmail}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold shadow-lg"
                >
                  {recoveryLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Send Username
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseModal}
                  className="w-full h-11 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
