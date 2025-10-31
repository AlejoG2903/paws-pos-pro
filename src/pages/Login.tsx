// pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const success = await login(username, password);

      if (success) {
        toast.success('¡Bienvenido!');
        navigate('/dashboard');
      } else {
        toast.error('Usuario o contraseña incorrectos');
      }
    } catch (error) {
      toast.error('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Para demo rápida con documento
  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/fondomi.png')" }} // <-- coloca tu imagen aquí (ej: fondo.png en /public)
    >
      {/* Contenido del login */}
      <Card className="relative z-10 w-full max-w-md bg-white/90 shadow-xl backdrop-blur-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-white shadow">
            <img src="/Logo.png" alt="Mascotas de Impacto" className="object-cover w-full h-full" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Mascotas de Impacto</CardTitle>
            <CardDescription className="text-gray-600">
              Sistema de Punto de Venta
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            <div className="text-xs text-muted-foreground text-center space-y-1 pt-4">
              <p className="font-semibold">Para crear un usuario:</p>
              <p className="text-[10px]">
                Contacta con <span className="text-blue-500">323 732 9477</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
