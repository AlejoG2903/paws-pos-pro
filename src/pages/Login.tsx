import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PawPrint } from 'lucide-react';

const Login = () => {
  const [documento, setDocumento] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documento.trim()) {
      toast.error('Por favor ingresa tu número de documento');
      return;
    }

    const success = login(documento);
    
    if (success) {
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } else {
      toast.error('Documento no encontrado');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <PawPrint className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">PawsPOS Pro</CardTitle>
            <CardDescription>Sistema de Punto de Venta para Petshop</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="documento" className="text-sm font-medium">
                Número de Documento
              </label>
              <Input
                id="documento"
                type="text"
                placeholder="Ingresa tu documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full">
              Iniciar Sesión
            </Button>
            <div className="text-xs text-muted-foreground text-center space-y-1 pt-4">
              <p>Usuarios de prueba:</p>
              <p>Admin: 1234567890</p>
              <p>Vendedor: 0987654321</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
