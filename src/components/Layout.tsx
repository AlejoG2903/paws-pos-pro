import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { LogOut, LayoutDashboard, Package, ShoppingCart, Moon, Sun, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('pos_theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('pos_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PawsPOS Pro</h1>
              <p className="text-xs text-muted-foreground">
                {user?.nombre} - {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6">
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant={isActive('/inventario') ? 'default' : 'ghost'}
              onClick={() => navigate('/inventario')}
            >
              <Package className="w-4 h-4 mr-2" />
              Inventario
            </Button>
          )}
          <Button
            variant={isActive('/ventas') ? 'default' : 'ghost'}
            onClick={() => navigate('/ventas')}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Ventas
          </Button>
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
