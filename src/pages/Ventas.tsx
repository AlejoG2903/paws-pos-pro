import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProductos, addVenta } from '@/lib/storage';
import { Producto, VentaItem, MetodoPago } from '@/types';
import { ShoppingCart, Plus, Minus, Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Ventas = () => {
  const { user } = useAuth();
  const productos = getProductos();
  const [carrito, setCarrito] = useState<VentaItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');

  const total = carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  const cambio = montoRecibido ? parseFloat(montoRecibido) - total : 0;

  const agregarAlCarrito = (producto: Producto) => {
    const existente = carrito.find(item => item.producto.id === producto.id);
    
    if (existente) {
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { producto, cantidad: 1 }]);
    }
    toast.success(`${producto.nombre} agregado al carrito`);
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(item => item.producto.id !== productoId));
    } else {
      setCarrito(carrito.map(item =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      ));
    }
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(item => item.producto.id !== productoId));
    toast.success('Producto eliminado del carrito');
  };

  const finalizarVenta = () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (metodoPago === 'efectivo' && (!montoRecibido || cambio < 0)) {
      toast.error('El monto recibido es insuficiente');
      return;
    }

    addVenta({
      id: Date.now().toString(),
      items: carrito,
      total,
      metodoPago,
      fecha: new Date().toISOString(),
      vendedor: user?.nombre || 'Desconocido',
    });

    toast.success('¡Venta registrada exitosamente!');
    setCarrito([]);
    setMontoRecibido('');
    setMetodoPago('efectivo');
  };

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Productos</h2>
            <p className="text-muted-foreground">Selecciona productos para agregar al carrito</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {productos.map((producto) => (
              <Card
                key={producto.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => agregarAlCarrito(producto)}
              >
                <CardContent className="p-4">
                  {producto.imagen && (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  <h3 className="font-semibold mb-2">{producto.nombre}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ${producto.precio.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">{producto.stock}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrito de Compras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {carrito.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Carrito vacío</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {carrito.map((item) => (
                      <div key={item.producto.id} className="flex items-center gap-2 p-2 border rounded-md">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            ${item.producto.precio.toLocaleString()} × {item.cantidad}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.cantidad}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => eliminarDelCarrito(item.producto.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">${total.toLocaleString()}</span>
                    </div>

                    <div className="space-y-2">
                      <Label>Método de Pago</Label>
                      <Select value={metodoPago} onValueChange={(value) => setMetodoPago(value as MetodoPago)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="nequi">Nequi</SelectItem>
                          <SelectItem value="daviplata">Daviplata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {metodoPago === 'efectivo' && (
                      <div className="space-y-2">
                        <Label htmlFor="monto" className="flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Monto Recibido
                        </Label>
                        <Input
                          id="monto"
                          type="number"
                          value={montoRecibido}
                          onChange={(e) => setMontoRecibido(e.target.value)}
                          placeholder="0"
                        />
                        {montoRecibido && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cambio:</span>
                            <span className={`font-medium ${cambio >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              ${cambio.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button onClick={finalizarVenta} className="w-full" size="lg">
                      Registrar Venta
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Ventas;
