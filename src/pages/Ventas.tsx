/******************************************************************************************
 * VENTAS – POS PETSHOP
 * Compatible con ventas por monto cuando unidad_medida === "kg"
 ******************************************************************************************/

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, Search, Plus, Minus, X } from 'lucide-react';
import { productsAPI, salesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Producto {
  id: number;
  name: string;
  description?: string;
  price: number;
  cost: number;
  stock: number;
  unidad_medida: string;   // kg, unidad, etc.
  barcode?: string;
  category_id: number;
  image_base64?: string | null;
  is_active: boolean;
}

interface CarritoItem {
  producto: Producto;
  cantidad: number;
  montoCop?: number;        // 🔹 Nuevo campo
  kilosVendidos?: number;   // 🔹 Nuevo campo
}

export default function Ventas() {
  const { user } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtro, setFiltro] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState<string>('todos');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  /**********************************************
   * CALCULAR TOTAL REAL DEL CARRITO
   * - productos normales → precio * cantidad
   * - productos por kg → montoCop
   **********************************************/
  const total = carrito.reduce((sum, item) => {
    if (item.producto.unidad_medida === "kg") {
      return sum + (item.montoCop || 0);
    }
    return sum + item.producto.price * item.cantidad;
  }, 0);

  useEffect(() => setMontoRecibido(''), [carrito]);

  useEffect(() => {
    if (!user) return;
    const clave = `carrito_${user.username}`;
    const data = localStorage.getItem(clave);
    if (data) setCarrito(JSON.parse(data));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const clave = `carrito_${user.username}`;
    localStorage.setItem(clave, JSON.stringify(carrito));
  }, [carrito, user]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const data = await productsAPI.getAll({ is_active: true });
        setProductos(data.filter((p: Producto) => p.stock > 0));
      } catch (e) {
        toast.error("Error cargando productos");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  /**************************************************
   * AGREGAR AL CARRITO
   **************************************************/
  const agregarAlCarrito = (producto: Producto) => {
    const existente = carrito.find(i => i.producto.id === producto.id);

    if (existente) {
      setCarrito(
        carrito.map(i =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      );
    } else {
      setCarrito([...carrito, { producto, cantidad: 1 }]);
    }

    toast.success(`${producto.name} agregado`);
  };

  const quitarDelCarrito = (id: number) => {
    setCarrito(carrito.filter(i => i.producto.id !== id));
  };

  const aumentarCantidad = (id: number) => {
    const item = carrito.find(i => i.producto.id === id);
    if (!item) return;

    if (item.producto.unidad_medida === "kg") {
      toast.error("Para productos por kg ingresa el monto en COP");
      return;
    }

    // 🔹 VALIDAR STOCK DISPONIBLE
    if (item.cantidad >= item.producto.stock) {
      toast.error(`Stock máximo disponible: ${item.producto.stock}`);
      return;
    }

    setCarrito(
      carrito.map(i =>
        i.producto.id === id ? { ...i, cantidad: i.cantidad + 1 } : i
      )
    );
  };

  const disminuirCantidad = (id: number) => {
    const item = carrito.find(i => i.producto.id === id);
    if (!item) return;

    if (item.producto.unidad_medida === "kg") {
      item.montoCop = 0;
      item.kilosVendidos = 0;
      quitarDelCarrito(id);
      return;
    }

    if (item.cantidad === 1) {
      quitarDelCarrito(id);
      return;
    }

    setCarrito(
      carrito.map(i =>
        i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i
      )
    );
  };

  /****************************************************
   * FINALIZAR VENTA
   ****************************************************/
  const finalizarVenta = async () => {
    if (carrito.length === 0) return toast.error("Carrito vacío");
    setRegistrando(true);

    try {
      const venta = {
        payment_method: metodoPago,
        items: carrito.map(item => {
          if (item.producto.unidad_medida === "kg") {
            return {
              product_id: item.producto.id,
              monto: item.montoCop,
              kilos: item.kilosVendidos,
              price: item.producto.price
            };
          }

          return {
            product_id: item.producto.id,
            quantity: item.cantidad,
            price: item.producto.price
          };
        })
      };

      await salesAPI.create(venta);

      toast.success("Venta registrada");

      setCarrito([]);
      const clave = `carrito_${user.username}`;
      localStorage.removeItem(clave);
      setMontoRecibido('');

      const data = await productsAPI.getAll({ is_active: true });
      setProductos(data.filter((p: Producto) => p.stock > 0));
    } catch (e: any) {
      toast.error("Error registrando venta");
    } finally {
      setRegistrando(false);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const coincideNombre = p.name.toLowerCase().includes(filtro.toLowerCase());
    const coincideUnidad = filtroUnidad === 'todos' || p.unidad_medida === filtroUnidad;
    return coincideNombre && coincideUnidad;
  });

  const getProductImage = (producto: Producto) => {
    if (producto.image_url) return producto.image_url;
    if (producto.image_base64) return `data:image/jpeg;base64,${producto.image_base64}`;
    return "/placeholder-image.png";
  };

  // 🔹 FUNCIÓN PARA OBTENER STOCK DISPONIBLE (stock total - cantidad en carrito)
  const getStockDisponible = (productoId: number): number => {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return 0;

    const itemEnCarrito = carrito.find(i => i.producto.id === productoId);
    if (!itemEnCarrito) return producto.stock;

    // Para productos por kg, no restar del stock (se valida por monto)
    if (producto.unidad_medida === "kg") {
      return producto.stock;
    }

    // Para productos por unidad, restar cantidad en carrito
    return producto.stock - itemEnCarrito.cantidad;
  };

  // 🔹 FUNCIÓN PARA FORMATEAR NÚMEROS CON SEPARADOR DE MILES
  const formatearNumero = (valor: number | string): string => {
    const num = typeof valor === 'string' ? valor.replace(/\D/g, '') : String(valor);
    return Number(num).toLocaleString('es-CO');
  };

  // 🔹 FUNCIÓN PARA LIMPIAR NÚMERO (quitar separadores)
  const limpiarNumero = (valor: string): number => {
    return Number(valor.replace(/\D/g, ''));
  };

  // 🔹 FUNCIÓN PARA CONVERTIR KG A LIBRAS (Factor: 1 kg = 2 lb para margen de error)
  const kgToLb = (kg: number): number => kg * 2;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ------------------------------ PRODUCTOS ------------------------------ */}
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Productos</h2>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              {/* BUSCADOR */}
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar..."
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                {filtro && (
                  <button
                    type="button"
                    onClick={() => setFiltro('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* FILTRO UNIDAD DE MEDIDA */}
              <div className="relative w-[140px]">
                <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
                  <SelectTrigger className="w-full pr-8">
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
                {filtroUnidad !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => setFiltroUnidad('todos')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productosFiltrados.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No hay productos que coincidan con los filtros
              </div>
            ) : (
              productosFiltrados.map(producto => {
                const stockDisponible = getStockDisponible(producto.id);
                const precioPorLb = producto.price / 2;
                
                return (
                  <div
                    key={producto.id}
                    className="border rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="font-semibold text-sm mb-3">{producto.name}</div>
                    
                    {/* 🔹 DESCRIPCIÓN DEL PRODUCTO */}
                    {producto.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {producto.description}
                      </p>
                    )}
                    
                    <img
                      src={getProductImage(producto)}
                      className="w-32 h-32 object-cover mx-auto rounded mb-3"
                    />

                    {/* 🔹 CANTIDAD DISPONIBLE Y UNIDAD DE MEDIDA */}
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-3 ${
                      producto.unidad_medida === 'kg' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {stockDisponible} {producto.unidad_medida === 'kg' ? 'Kg' : 'Unidad'}
                    </span>

                    {/* 🔹 PRECIO - MOSTRAR POR LB Y POR KG SI ES KG */}
                    <div className="space-y-1 mb-3">
                      {producto.unidad_medida === 'kg' ? (
                        <>
                          <div className="text-sm text-green-600 font-semibold">
                            ${precioPorLb.toLocaleString('es-CO')} / lb
                          </div>
                          <div className="text-xs text-gray-500">
                            ${producto.price.toLocaleString('es-CO')} / kg
                          </div>
                        </>
                      ) : (
                        <div className="text-lg font-bold text-green-600">
                          ${producto.price.toLocaleString('es-CO')}
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={stockDisponible === 0}
                    >
                      {stockDisponible === 0 ? 'Sin stock' : 'Agregar'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------ CARRITO ------------------------------ */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Carrito</h2>

          {carrito.length === 0 ? (
            <p className="text-gray-500">Vacío</p>
          ) : (
            <div className="space-y-4">
              {carrito.map(item => (
                <div key={item.producto.id} className="border rounded-lg p-3">
                  <div className="font-medium">{item.producto.name}</div>

                  {/* 🔹 SI EL PRODUCTO ES POR KG → MOSTRAR INPUT DE MONTO */}
                  {item.producto.unidad_medida === "kg" ? (
                    <div className="mt-3">
                      <label className="text-sm font-medium">Monto en COP:</label>
                      <Input
                        placeholder="Ej: 10000"
                        type="text"
                        value={item.montoCop ? formatearNumero(item.montoCop) : ""}
                        onChange={e => {
                          const monto = limpiarNumero(e.target.value);
                          const kilos = monto / item.producto.price;

                          // 🔹 VALIDAR QUE NO EXCEDA STOCK DISPONIBLE
                          if (kilos > item.producto.stock) {
                            toast.error(`Stock máximo disponible: ${item.producto.stock} kg (${kgToLb(item.producto.stock).toFixed(2)} lb) ($${(item.producto.stock * item.producto.price).toLocaleString('es-CO')})`);
                            return;
                          }

                          setCarrito(carrito.map(i =>
                            i.producto.id === item.producto.id
                              ? { ...i, montoCop: monto, kilosVendidos: kilos }
                              : i
                          ));
                        }}
                      />

                      {/* Mostrar conversión en LIBRAS */}
                      {item.kilosVendidos ? (
                        <div className="text-xs mt-1 text-gray-600">
                          Equivale a {kgToLb(item.kilosVendidos).toFixed(2)} lb
                        </div>
                      ) : null}

                      {/* 🔹 ALERTA SI QUEDA POCO STOCK CON VALOR EN COP Y LB */}
                      {item.kilosVendidos && item.kilosVendidos > 0 ? (
                        <div className={`text-xs mt-1 ${
                          item.producto.stock - item.kilosVendidos < 1
                            ? 'text-red-600 font-semibold'
                            : 'text-amber-600'
                        }`}>
                          {item.producto.stock - item.kilosVendidos < 0
                            ? `❌ Insuficiente. Stock: ${item.producto.stock} kg (${kgToLb(item.producto.stock).toFixed(2)} lb) ($${(item.producto.stock * item.producto.price).toLocaleString('es-CO')})`
                            : `⚠️ Disponible después: ${(item.producto.stock - item.kilosVendidos).toFixed(2)} kg (${kgToLb(item.producto.stock - item.kilosVendidos).toFixed(2)} lb) ($${((item.producto.stock - item.kilosVendidos) * item.producto.price).toLocaleString('es-CO')})`
                          }
                        </div>
                      ) : null}

                      <div className="mt-2 font-semibold">
                        Subtotal: ${item.montoCop?.toLocaleString('es-CO') || 0}
                      </div>

                      <Button
                        variant="destructive"
                        className="mt-2"
                        onClick={() => quitarDelCarrito(item.producto.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Quitar
                      </Button>
                    </div>
                  ) : (
                    /* PRODUCTOS NORMALES */
                    <div className="flex items-center gap-3 mt-3">
                      <Button 
                        size="icon" 
                        onClick={() => disminuirCantidad(item.producto.id)}
                      >
                        <Minus />
                      </Button>
                      <span className="font-bold">{item.cantidad}</span>
                      <Button 
                        size="icon" 
                        onClick={() => aumentarCantidad(item.producto.id)}
                        disabled={item.cantidad >= item.producto.stock}
                      >
                        <Plus />
                      </Button>

                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => quitarDelCarrito(item.producto.id)}
                      >
                        <Trash2 />
                      </Button>

                      <div className="ml-auto font-semibold">
                        ${(item.producto.price * item.cantidad).toLocaleString('es-CO')}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="text-lg font-semibold flex justify-between">
                <span>Total:</span>
                <span>${total.toLocaleString('es-CO')}</span>
              </div>

              {/* 🔹 MÉTODO DE PAGO */}
              <div>
                <label className="block text-sm font-medium mb-2">Método de Pago</label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="nequi">Nequi</SelectItem>
                    <SelectItem value="daviplata">Daviplata</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 🔹 CALCULADORA DE CAMBIO (solo si es efectivo) */}
              {metodoPago === "efectivo" && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <label className="block text-sm font-medium mb-2">Monto Recibido</label>
                  <Input
                    placeholder="Ingresa monto recibido"
                    type="text"
                    value={montoRecibido ? formatearNumero(montoRecibido) : ""}
                    onChange={e => setMontoRecibido(String(limpiarNumero(e.target.value)))}
                    className="mb-3"
                  />

                  {montoRecibido && Number(montoRecibido) > 0 && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total a pagar:</span>
                        <span className="font-medium">${total.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monto recibido:</span>
                        <span className="font-medium">${Number(montoRecibido).toLocaleString('es-CO')}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-semibold">Cambio:</span>
                        <span className={`font-bold text-lg ${Number(montoRecibido) >= total ? 'text-green-600' : 'text-red-600'}`}>
                          ${(Number(montoRecibido) - total).toLocaleString('es-CO')}
                        </span>
                      </div>
                      {Number(montoRecibido) < total && (
                        <div className="text-red-600 text-xs mt-2">
                          ⚠️ Monto insuficiente. Falta: ${(total - Number(montoRecibido)).toLocaleString('es-CO')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={finalizarVenta} 
                disabled={registrando}
              >
                {registrando ? "Procesando..." : "Finalizar venta"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}