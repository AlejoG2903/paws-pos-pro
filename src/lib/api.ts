// lib/api.ts
const API_BASE_URL = 'http://localhost:8000';

// Función para obtener el token del localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Función helper para hacer requests
const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || 'Error en la petición');
  }

  // Para respuestas 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// AUTH
export const authAPI = {
  login: async (username: string, password: string) => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  register: async (userData: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    role?: string;
  }) => {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getMe: async () => {
    return fetchAPI('/users/me'); // ✅ Cambiado de /auth/me a /users/me
  },
};

// CATEGORIES
export const categoriesAPI = {
  getAll: async () => {
    return fetchAPI('/categories/'); // ✅ Mantiene el mismo endpoint
  },

  create: async (category: { name: string; description?: string }) => {
    return fetchAPI('/categories/', { // ✅ Mantiene el mismo endpoint
      method: 'POST',
      body: JSON.stringify(category),
    });
  },
};

// PRODUCTS
export const productsAPI = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    is_active?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return fetchAPI(`/products/${query ? `?${query}` : ''}`); // ✅ Mantiene el mismo endpoint
  },

  getById: async (id: number) => {
    return fetchAPI(`/products/${id}`); // ✅ Mantiene el mismo endpoint
  },

  create: async (product: {
    name: string;
    description?: string;
    price: number;
    cost?: number;
    stock?: number;
    barcode?: string;
    category_id: number;
    image_url?: string;
  }) => {
    return fetchAPI('/products/', { // ✅ Mantiene el mismo endpoint
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  update: async (id: number, product: Partial<{
    name: string;
    description: string;
    price: number;
    cost: number;
    stock: number;
    barcode: string;
    category_id: number;
    image_url: string;
    is_active: boolean;
  }>) => {
    return fetchAPI(`/products/${id}`, { // ✅ Mantiene el mismo endpoint
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  delete: async (id: number) => {
    return fetchAPI(`/products/${id}`, { // ✅ Mantiene el mismo endpoint
      method: 'DELETE',
    });
  },
};

// SALES
export const salesAPI = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    today?: boolean;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convertir booleanos a string
          if (typeof value === 'boolean') {
            queryParams.append(key, value ? 'true' : 'false');
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    const query = queryParams.toString();
    return fetchAPI(`/sales/${query ? `?${query}` : ''}`); // ✅ Mantiene el mismo endpoint
  },

  getTodaySummary: async () => {
    return fetchAPI('/sales/?today=true&summary=true'); // ✅ Nuevo endpoint para resumen del día
  },

  getById: async (id: number) => {
    return fetchAPI(`/sales/${id}`); // ✅ Mantiene el mismo endpoint
  },

  create: async (sale: {
    items: Array<{
      product_id: number;
      quantity: number;
      price: number;
    }>;
    payment_method: string;
    customer_name?: string;
    customer_email?: string;
    discount?: number;
    notes?: string;
  }) => {
    return fetchAPI('/sales/', { // ✅ Mantiene el mismo endpoint
      method: 'POST',
      body: JSON.stringify(sale),
    });
  },
};

// DASHBOARD
export const dashboardAPI = {
  getStats: async () => {
    return fetchAPI('/dashboard/stats'); // ✅ Nuevo endpoint específico para dashboard
  },

  getTodaySales: async () => {
    return fetchAPI('/sales/?today=true'); // ✅ Alternativa para ventas de hoy
  },
};

// USERS (nuevo módulo)
export const usersAPI = {
  getMe: async () => {
    return fetchAPI('/users/me'); // ✅ Endpoint específico para usuario actual
  },

  updateProfile: async (userData: Partial<{
    email: string;
    username: string;
    full_name: string;
  }>) => {
    return fetchAPI('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
};

// Helper para guardar token
export const saveAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

// Helper para eliminar token
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

// Helper para verificar si está autenticado
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Tipo para errores de API
export interface APIError {
  detail: string;
  [key: string]: any;
}

// Interfaz para respuestas paginadas
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// Función mejorada con manejo de errores más detallado
export const fetchWithErrorHandling = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  try {
    return await fetchAPI(endpoint, options);
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error);
    throw error;
  }
};

// Exportar una instancia única con todas las APIs
export const api = {
  auth: authAPI,
  categories: categoriesAPI,
  products: productsAPI,
  sales: salesAPI,
  dashboard: dashboardAPI,
  users: usersAPI,
  utils: {
    saveAuthToken,
    removeAuthToken,
    isAuthenticated,
  },
};

export default api;