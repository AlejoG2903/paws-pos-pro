import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'vendedor';

export interface User {
  documento: string;
  nombre: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (documento: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuarios predefinidos
const USERS: User[] = [
  { documento: '1234567890', nombre: 'Admin Principal', role: 'admin' },
  { documento: '0987654321', nombre: 'Vendedor', role: 'vendedor' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (documento: string): boolean => {
    const foundUser = USERS.find(u => u.documento === documento);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('pos_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
