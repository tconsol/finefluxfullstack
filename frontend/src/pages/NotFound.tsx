import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search, Map, Compass, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4 py-5 relative overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-rotate {
          animation: rotate 20s linear infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
      `}</style>

      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className={`relative max-w-4xl w-full transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Main Content */}
        <div className="text-center space-y-4">
          {/* 404 Illustration - Compact */}
          <div className="relative inline-flex items-center justify-center opacity-0 animate-fade-in">
            {/* Rotating compass background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Compass className="w-48 h-48 md:w-64 md:h-64 text-primary animate-rotate" />
            </div>
            
            {/* Large 404 - More compact */}
            <div className="relative z-10">
              <h1 className="text-[100px] md:text-[140px] font-black leading-none">
                <span className="bg-gradient-to-br from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  4
                </span>
                <span className="relative inline-block animate-float">
                  <span className="bg-gradient-to-br from-accent via-primary/80 to-primary bg-clip-text text-transparent">
                    0
                  </span>
                  {/* Floating compass icon inside 0 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background rounded-full p-2 md:p-3 shadow-xl animate-pulse-scale">
                      <Navigation className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                    </div>
                  </div>
                </span>
                <span className="bg-gradient-to-br from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  4
                </span>
              </h1>
            </div>
          </div>

          {/* Text Content - Compact */}
          <div className="space-y-2 opacity-0 animate-fade-in delay-100">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Lost in Space
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              The page you're searching for doesn't exist in our universe.
            </p>
          </div>

          {/* Action Buttons - REDESIGNED GO BACK */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center opacity-0 animate-fade-in delay-200 max-w-md mx-auto pt-2">
            {/* REDESIGNED GO BACK BUTTON */}
            <button
              onClick={() => navigate(-1)}
              className="group relative w-full sm:w-auto h-10 px-6 text-sm font-medium rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/80 to-muted transition-all duration-300 group-hover:from-primary/20 group-hover:via-accent/20 group-hover:to-primary/20" />
              
              {/* Border */}
              <div className="absolute inset-0 rounded-lg border-2 border-border/50 group-hover:border-primary/50 transition-all duration-300" />
              
              {/* Content */}
              <div className="relative flex items-center justify-center gap-2 text-foreground group-hover:text-primary transition-colors duration-300">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                <span>Go Back</span>
              </div>
            </button>

            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto h-10 px-6 text-sm bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <Home className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Back to Home
            </Button>
          </div>

          {/* Quick Navigation Cards - More Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-4 opacity-0 animate-fade-in delay-300">
            <button
              onClick={() => navigate('/dashboard')}
              className="group p-3 rounded-xl border-2 border-border/50 hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 transition-colors">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Dashboard</h3>
                  <p className="text-xs text-muted-foreground">Main overview</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/products')}
              className="group p-3 rounded-xl border-2 border-border/50 hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-colors">
                  <Map className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Products</h3>
                  <p className="text-xs text-muted-foreground">View inventory</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/sales')}
              className="group p-3 rounded-xl border-2 border-border/50 hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-colors">
                  <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Sales</h3>
                  <p className="text-xs text-muted-foreground">View reports</p>
                </div>
              </div>
            </button>
          </div>

          {/* Help Message - Compact */}
          <div className="opacity-0 animate-fade-in delay-400 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-xs text-muted-foreground">
                Need help? <button onClick={() => navigate('/help')} className="text-primary hover:underline font-medium">Contact support</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
