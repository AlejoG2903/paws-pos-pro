export type Categoria = 'Alimento' | 'Accesorio' | 'Juguetes' | 'Medicamentos' | 'Higiene';

export type MetodoPago = 'efectivo' | 'nequi' | 'daviplata';

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: string;
  categoria: Categoria;
  imagen?: string;
}

export interface VentaItem {
  producto: Producto;
  cantidad: number;
}

export interface Venta {
  id: string;
  items: VentaItem[];
  total: number;
  metodoPago: MetodoPago;
  fecha: string;
  vendedor: string;
}
