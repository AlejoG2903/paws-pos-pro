import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, Search, Plus, Minus } from 'lucide-react';
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

  // 🔹 Cargar carrito guardado por usuario
  useEffect(() => {
    if (!user) return;

    const claveCarrito = `carrito_${user.username || user.email || user.role || 'default'}`;
    const carritoGuardado = localStorage.getItem(claveCarrito);

    if (carritoGuardado) {
      try {
        setCarrito(JSON.parse(carritoGuardado));
      } catch (error) {
        console.error('Error al cargar carrito del usuario:', error);
      }
    }
  }, [user]);

  // 🔹 Guardar carrito por usuario
  useEffect(() => {
    if (!user) return;

    const claveCarrito = `carrito_${user.username || user.email || user.role || 'default'}`;
    localStorage.setItem(claveCarrito, JSON.stringify(carrito));
  }, [carrito, user]);

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

  const aumentarCantidad = (id: number) => {
    const item = carrito.find(i => i.producto.id === id);
    if (!item) return;

    if (item.cantidad + 1 > item.producto.stock) {
      toast.error(`Stock máximo: ${item.producto.stock}`);
      return;
    }

    setCarrito(carrito.map(i =>
      i.producto.id === id ? { ...i, cantidad: i.cantidad + 1 } : i
    ));
  };

  const disminuirCantidad = (id: number) => {
    const item = carrito.find(i => i.producto.id === id);
    if (!item) return;

    if (item.cantidad === 1) {
      quitarDelCarrito(id);
      return;
    }

    setCarrito(carrito.map(i =>
      i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i
    ));
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

      // 🔹 Limpiar carrito del usuario
      setCarrito([]);
      const claveCarrito = `carrito_${user.username || user.email || user.role || 'default'}`;
      localStorage.removeItem(claveCarrito);

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
                  className="border rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-center text-center bg-white dark:bg-gray-800 h-full"
                >
                  {producto.image_url ? (
                    <img
                      src={producto.image_url}
                      alt={producto.name}
                      className="w-32 h-32 object-cover rounded-md mb-3"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-md mb-3 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
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
                  className="flex justify-between items-center border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-800"
                >
                  <div>
                    <div className="font-medium">{item.producto.name}</div>
                    <div className="text-sm text-gray-500">
                      ${item.producto.price.toFixed(2)} c/u
                    </div>
                    <div className="text-sm font-semibold mt-1">
                      Subtotal: ${(item.producto.price * item.cantidad).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => disminuirCantidad(item.producto.id)}
                      className="h-8 w-8"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-semibold w-8 text-center">{item.cantidad}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => aumentarCantidad(item.producto.id)}
                      className="h-8 w-8"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => quitarDelCarrito(item.producto.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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

                {metodoPago === 'cash' && (
                  <>
                    <Input
                      type="number"
                      placeholder="Monto recibido"
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                    />

                    {montoRecibido && parseFloat(montoRecibido) >= total && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Cambio a devolver:</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${(parseFloat(montoRecibido) - total).toFixed(2)}
                        </div>
                      </div>
                    )}

                    {montoRecibido && parseFloat(montoRecibido) < total && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <div className="text-sm text-red-600 dark:text-red-400">
                          Falta: ${(total - parseFloat(montoRecibido)).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </>
                )}

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
