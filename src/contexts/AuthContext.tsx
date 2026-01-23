// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, saveAuthToken, removeAuthToken } from '@/lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'manager';
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay un token guardado al cargar la app
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    const cachedUser = localStorage.getItem('cached_user');
    
    if (!token) {
      localStorage.removeItem('cached_user');
      setLoading(false);
      return;
    }

    // Siempre restaurar del caché si existe
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parseando usuario cacheado:', e);
      }
    }
    
    setLoading(false);

    // Comentado temporalmente: verificación con servidor
    // Si necesitas reactivarla, descomenta este bloque
    /*
    try {
      const userData = await authAPI.getMe();
      setUser(userData);
      localStorage.setItem('cached_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('401') || errorMsg.includes('403')) {
        console.log('Token inválido, cerrando sesión');
        removeAuthToken();
        localStorage.removeItem('cached_user');
        setUser(null);
      } else {
        console.warn('Error temporal, manteniendo sesión:', errorMsg);
      }
    }
    */
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(username, password);
      saveAuthToken(response.access_token);
      
      // Obtener datos del usuario
      const userData = await authAPI.getMe();
      setUser(userData);
      
      // Guardar usuario en caché
      localStorage.setItem('cached_user', JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem('cached_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};