import { Producto, Venta } from '@/types';

const PRODUCTOS_KEY = 'pos_productos';
const VENTAS_KEY = 'pos_ventas';

// Productos iniciales
const PRODUCTOS_INICIALES: Producto[] = [
  {
    id: '1',
    nombre: 'Alimento Premium Perros',
    precio: 45000,
    stock: '15 unidades',
    categoria: 'Alimento',
    imagen: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&h=300&fit=crop'
  },
  {
    id: '2',
    nombre: 'Collar Ajustable',
    precio: 12000,
    stock: '25 unidades',
    categoria: 'Accesorio',
    imagen: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300&h=300&fit=crop'
  },
  {
    id: '3',
    nombre: 'Pelota de Goma',
    precio: 8000,
    stock: '30 unidades',
    categoria: 'Juguetes',
    imagen: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=300&h=300&fit=crop'
  },
];

export const getProductos = (): Producto[] => {
  const stored = localStorage.getItem(PRODUCTOS_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCTOS_KEY, JSON.stringify(PRODUCTOS_INICIALES));
    return PRODUCTOS_INICIALES;
  }
  return JSON.parse(stored);
};

export const saveProductos = (productos: Producto[]): void => {
  localStorage.setItem(PRODUCTOS_KEY, JSON.stringify(productos));
};

export const addProducto = (producto: Producto): void => {
  const productos = getProductos();
  productos.push(producto);
  saveProductos(productos);
};

export const updateProducto = (id: string, producto: Producto): void => {
  const productos = getProductos();
  const index = productos.findIndex(p => p.id === id);
  if (index !== -1) {
    productos[index] = producto;
    saveProductos(productos);
  }
};

export const deleteProducto = (id: string): void => {
  const productos = getProductos();
  const filtered = productos.filter(p => p.id !== id);
  saveProductos(filtered);
};

export const getVentas = (): Venta[] => {
  const stored = localStorage.getItem(VENTAS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addVenta = (venta: Venta): void => {
  const ventas = getVentas();
  ventas.push(venta);
  localStorage.setItem(VENTAS_KEY, JSON.stringify(ventas));
};
