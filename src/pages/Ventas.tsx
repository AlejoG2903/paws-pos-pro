import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, Search } from 'lucide-react';
import { productsAPI, salesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Producto {
  id: number;
  name: string;
  description?: string;
  price: number;
  cost: number;
  stock: number;
  barcode?: string;
  category_id: number;
  image_url?: string;
  is_active: boolean;
}

interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

export default function Ventas() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtro, setFiltro] = useState('');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<string>('cash');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  const total = carrito.reduce((sum, item) => sum + item.producto.price * item.cantidad, 0);

  // 🔹 Cargar productos activos y con stock > 0 desde el backend
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoading(true);
        const data = await productsAPI.getAll({ is_active: true });
        const disponibles = data.filter((p: Producto) => p.stock > 0);
        setProductos(disponibles);
      } catch (error) {
        toast.error('Error al cargar productos: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    cargarProductos();
  }, []);

  const agregarAlCarrito = (producto: Producto) => {
    const existente = carrito.find(item => item.producto.id === producto.id);
    const cantidadEnCarrito = existente ? existente.cantidad : 0;

    if (cantidadEnCarrito + 1 > producto.stock) {
      toast.error(`Stock insuficiente (${producto.stock} disponibles)`);
      return;
    }

    if (existente) {
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { producto, cantidad: 1 }]);
    }

    toast.success(`${producto.name} agregado al carrito`);
  };

  const quitarDelCarrito = (id: number) => {
    setCarrito(carrito.filter(item => item.producto.id !== id));
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setRegistrando(true);

    try {
      const ventaData = {
        items: carrito.map(item => ({
          product_id: item.producto.id,
          quantity: item.cantidad,
          price: item.producto.price,
        })),
        payment_method: metodoPago,
      };

      await salesAPI.create(ventaData);

      toast.success('¡Venta registrada exitosamente!');
      setCarrito([]);
      setMontoRecibido('');
      setMetodoPago('cash');

      // Actualizar productos disponibles
      const data = await productsAPI.getAll({ is_active: true });
      const disponibles = data.filter((p: Producto) => p.stock > 0);
      setProductos(disponibles);
    } catch (error) {
      toast.error('Error al registrar venta: ' + (error as Error).message);
    } finally {
      setRegistrando(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.name.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Productos disponibles */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Productos disponibles</h2>
            <div className="relative w-1/2">
              <Input
                type="text"
                placeholder="Buscar producto..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map(producto => (
                <div
                  key={producto.id}
                  className="border rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-center text-center bg-white h-full"
                >
                  {producto.image_url ? (
                    <img
                      src={producto.image_url}
                      alt={producto.name}
                      className="w-32 h-32 object-cover rounded-md mb-3"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-md mb-3 flex items-center justify-center text-gray-500 text-sm">
                      Sin imagen
                    </div>
                  )}
                  <div className="font-medium text-base">{producto.name}</div>
                  <div className="text-sm text-gray-500 mb-2">
                    ${producto.price.toFixed(2)} — Stock: {producto.stock}
                  </div>
                  <Button
                    className="w-full mt-auto"
                    onClick={() => agregarAlCarrito(producto)}
                    disabled={producto.stock === 0}
                  >
                    Agregar
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-full text-center">No se encontraron productos</p>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Carrito de venta</h2>
          {carrito.length === 0 ? (
            <p className="text-gray-500">No hay productos en el carrito</p>
          ) : (
            <div className="space-y-3">
              {carrito.map(item => (
                <div
                  key={item.producto.id}
                  className="flex justify-between items-center border p-3 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{item.producto.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.cantidad} × ${item.producto.price.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => quitarDelCarrito(item.producto.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="mt-4 space-y-3">
                <Select onValueChange={setMetodoPago} value={metodoPago}>
                  <SelectTrigger>
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="nequi">Nequi</SelectItem>
                    <SelectItem value="daviplata">Daviplata</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Monto recibido (opcional)"
                  value={montoRecibido}
                  onChange={e => setMontoRecibido(e.target.value)}
                />

                <Button
                  className="w-full"
                  onClick={finalizarVenta}
                  disabled={registrando}
                >
                  {registrando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Registrando venta...
                    </>
                  ) : (
                    'Finalizar venta'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
