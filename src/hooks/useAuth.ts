// src/hooks/useAuth.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: authAPI.getMe,
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authAPI.login(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Inicio de sesión exitoso');
      navigate('/dashboard');
    },
    onError: () => {
      toast.error('Usuario o contraseña incorrectos');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: () => {
      toast.success('Usuario registrado exitosamente');
      navigate('/login');
    },
    onError: () => {
      toast.error('Error al registrar usuario');
    },
  });

  const logout = () => {
    authAPI.logout();
    queryClient.clear();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}

// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI, Product } from '@/lib/api';
import { toast } from 'sonner';

export function useProducts(params?: {
  search?: string;
  category_id?: number;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsAPI.getAll(params),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productsAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear producto');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      productsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto actualizado exitosamente');
    },
    onError: () => {
      toast.error('Error al actualizar producto');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado exitosamente');
    },
    onError: () => {
      toast.error('Error al eliminar producto');
    },
  });
}

// src/hooks/useCategories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '@/lib/api';
import { toast } from 'sonner';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesAPI.getAll,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoría creada exitosamente');
    },
    onError: () => {
      toast.error('Error al crear categoría');
    },
  });
}

// src/hooks/useSales.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesAPI } from '@/lib/api';
import { toast } from 'sonner';

export function useSales(params?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => salesAPI.getAll(params),
  });
}

export function useSale(id: number) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Venta registrada exitosamente');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Error al registrar venta';
      toast.error(message);
    },
  });
}

// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardAPI.getStats,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}