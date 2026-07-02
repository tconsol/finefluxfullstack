import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center relative overflow-hidden">
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.5; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
        .animate-rotate {
          animation: rotate 2s linear infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>

      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
      </div>

      {/* Loading Content */}
      <div className={`relative z-10 flex flex-col items-center justify-center space-y-8 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Spinner Container */}
        <div className="relative">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse-ring" style={{ width: '120px', height: '120px' }} />
          
          {/* Middle Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-pulse-ring" style={{ width: '120px', height: '120px', animationDelay: '0.5s' }} />
          
          {/* Spinning Loader */}
          <div className="relative w-28 h-28 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-rotate shadow-xl" />
          
          {/* Center Dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Loading...
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md">
            Preparing your workspace
          </p>
        </div>

        {/* Loading Progress Dots */}
        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
