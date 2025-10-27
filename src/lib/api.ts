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
    return fetchAPI('/auth/me');
  },
};

// CATEGORIES
export const categoriesAPI = {
  getAll: async () => {
    return fetchAPI('/categories');
  },

  create: async (category: { name: string; description?: string }) => {
    return fetchAPI('/categories', {
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
    return fetchAPI(`/products${query ? `?${query}` : ''}`);
  },

  getById: async (id: number) => {
    return fetchAPI(`/products/${id}`);
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
    return fetchAPI('/products', {
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
    return fetchAPI(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  delete: async (id: number) => {
    return fetchAPI(`/products/${id}`, {
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
    summary?: boolean;
    start_date?: string;
    end_date?: string;
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
    return fetchAPI(`/sales${query ? `?${query}` : ''}`);
  },

  getById: async (id: number) => {
    return fetchAPI(`/sales/${id}`);
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
    return fetchAPI('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  },
};

// DASHBOARD
export const dashboardAPI = {
  getStats: async () => {
    return fetchAPI('/dashboard/stats');
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