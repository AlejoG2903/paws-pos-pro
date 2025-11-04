// ============================================================================
// DASHBOARD COMPLETO - Archivo único con todos los componentes
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, CreditCard, Calendar, PiggyBank } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
  addDays,
  subMonths,
  eachDayOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { salesAPI, productsAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

const COLORS: Record<string, string> = {
  efectivo: '#10b981',
  nequi: '#8b5cf6',
  daviplata: '#f59e0b',
};

interface Sale {
  id: number;
  created_at: string;
  user?: { full_name: string };
  payment_method: string;
  total: number;
  items?: { product_name: string; quantity: number; subtotal: number }[];
}

interface PaymentData {
  name: string;
  value: number;
  color: string;
}

interface DailyData {
  fecha: string;
  fechaCompleta: string;
  total: number;
  cantidad: number;
  diaSemana: string;
}

interface ProductData {
  nombre: string;
  cantidad: number;
  total: number;
}

interface Product {
  id?: number;
  name?: string;
  nombre?: string;
  price?: number;
  precio?: number;
  cost?: number;
  costo?: number;
  [key: string]: unknown;
}

interface GananciaRow {
  nombre: string;
  costo?: number | null;
  precio?: number | null;
  cantidad: number;
  ganancia?: number | null;
}

// ============================================================================
// COMPONENTE: StatsCards
// ============================================================================

interface StatsCardsProps {
  totalHoy: number;
  ventasHoyLength: number;
  loadingHoy: boolean;
  totalGeneral: number;
  cantidadVentas: number;
  promedioVenta: number;
  metodoPrincipal: PaymentData | null;
  gananciaTotal: number;
}

const StatsCards = ({
  totalHoy,
  ventasHoyLength,
  loadingHoy,
  totalGeneral,
  cantidadVentas,
  promedioVenta,
  metodoPrincipal,
  gananciaTotal,
}: StatsCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Ventas del día */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loadingHoy ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <div className="text-2xl font-bold">${totalHoy.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{ventasHoyLength} ventas realizadas</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Total del período */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total del Período</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalGeneral.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{cantidadVentas} ventas totales</p>
        </CardContent>
      </Card>

      {/* Ganancia Total (reemplaza 'Promedio por Venta') */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${gananciaTotal.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Suma total de ganancias del período</p>
        </CardContent>
      </Card>

      {/* Métodos de pago más usado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Método Principal</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {metodoPrincipal ? (
            <>
              <div className="text-2xl font-bold capitalize">{metodoPrincipal.name}</div>
              <p className="text-xs text-muted-foreground">
                ${metodoPrincipal.value.toLocaleString()} total
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Sin datos</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// COMPONENTE: DateRangeSelector
// ============================================================================

interface DateRangeSelectorProps {
  rangoSeleccionado: string;
  fechaInicio: string;
  fechaFin: string;
  onRangoChange: (rango: string) => void;
  onFechaInicioChange: (fecha: string) => void;
  onFechaFinChange: (fecha: string) => void;
}

const DateRangeSelector = ({
  rangoSeleccionado,
  fechaInicio,
  fechaFin,
  onRangoChange,
  onFechaInicioChange,
  onFechaFinChange,
}: DateRangeSelectorProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Rango de fechas:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={rangoSeleccionado} onValueChange={onRangoChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Seleccionar rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="mes_anterior">Mes anterior</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {rangoSeleccionado === 'personalizado' && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => onFechaInicioChange(e.target.value)}
                  className="w-full sm:w-auto"
                />
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => onFechaFinChange(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: PaymentMethodsChart (lista simple)
// ============================================================================

const PaymentMethodsChart = ({ data, totalGeneral }: { data: PaymentData[]; totalGeneral: number }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Método de Pago</CardTitle>
        <p className="text-sm text-muted-foreground">
          Porcentaje de ventas según método de pago utilizado en el período seleccionado
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos disponibles para el rango seleccionado
          </div>
        ) : (
          <div className="grid gap-4">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex justify-between items-center p-4 border rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    style={{ background: item.color }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  >
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium capitalize">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">${item.value.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    {totalGeneral > 0 ? `${((item.value / totalGeneral) * 100).toFixed(1)}%` : '0%'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: DailyTrendChart
// ============================================================================

const DailyTrendChart = ({ data }: { data: DailyData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Ventas Diarias</CardTitle>
        <p className="text-sm text-muted-foreground">Evolución diaria de las ventas en el período seleccionado</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">No hay datos disponibles</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLine data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Ventas del Día" dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </RechartsLine>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: TopProductsChart
// ============================================================================

const TopProductsChart = ({ data }: { data: ProductData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Productos Más Vendidos</CardTitle>
        <p className="text-sm text-muted-foreground">Productos con mayor cantidad vendida en el período seleccionado</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">No hay datos disponibles</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={180} />
                <Tooltip formatter={(value: number, name: string) => (name === 'cantidad' ? [value, 'Unidades'] : [`$${value.toLocaleString()}`, 'Total'])} />
                <Legend />
                <Bar dataKey="cantidad" fill="#8b5cf6" name="Cantidad Vendida" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              <h4 className="font-semibold">Detalle de Productos</h4>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {data.map((item, index) => (
                  <div key={item.nombre} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">{index + 1}</div>
                      <div>
                        <p className="font-medium text-sm">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground">{item.cantidad} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">${item.total.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">${(item.total / item.cantidad).toLocaleString(undefined, { maximumFractionDigits: 0 })} c/u</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE: GananciasTable
// ============================================================================

const GananciasTable = ({ fechaInicio, fechaFin, data, loading }: { fechaInicio: string; fechaFin: string; data: GananciaRow[]; loading: boolean }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ganancias por Producto</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(fechaInicio), "dd 'de' MMMM", { locale: es })} - {format(new Date(fechaFin), "dd 'de' MMMM yyyy", { locale: es })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Nombre Producto</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Costo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Precio</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total Vendidos</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Cargando datos...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay datos de ganancias en este rango</td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.nombre} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{row.nombre}</td>
                      <td className="px-4 py-3 text-sm">{row.costo != null ? `$${row.costo.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-sm">{row.precio != null ? `$${row.precio.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.cantidad}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{row.ganancia != null ? `$${row.ganancia.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
// ============================================================================
// COMPONENTE: SalesTable (ajustado para mostrar cantidad junto al nombre)
// ============================================================================
const SalesTable = ({
  ventas,
  loading,
  fechaInicio,
  fechaFin,
}: {
  ventas: Sale[];
  loading: boolean;
  fechaInicio: string;
  fechaFin: string;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle de Ventas</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(fechaInicio), "dd 'de' MMMM", { locale: es })} -{" "}
          {format(new Date(fechaFin), "dd 'de' MMMM yyyy", { locale: es })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Vendedor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Método de pago</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Productos vendidos</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Valor</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total Venta</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Cargando ventas...
                    </td>
                  </tr>
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay ventas en este rango de fechas
                    </td>
                  </tr>
                ) : (
                  ventas.map((venta) => (
                    <tr key={venta.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(venta.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-sm">{venta.user?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-sm capitalize">{venta.payment_method}</td>

                      {/* Productos vendidos */}
                      <td className="px-4 py-3 text-sm">
                        {venta.items && venta.items.length > 0 ? (
                          <ul className="space-y-1">
                            {venta.items.map((item, idx) => (
                              <li key={idx} className="flex items-center justify-start gap-1">
                                <span className="truncate">{item.product_name}</span>
                                <span className="text-muted-foreground text-xs">x{item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Valor por producto */}
                      <td className="px-4 py-3 text-right text-sm">
                        {venta.items && venta.items.length > 0 ? (
                          <ul className="space-y-1">
                            {venta.items.map((item, idx) => (
                              <li key={idx}>${item.subtotal.toLocaleString()}</li>
                            ))}
                          </ul>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Total venta */}
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        ${venta.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: Dashboard
// ============================================================================

const Dashboard = () => {
  // Estados
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [rangoSeleccionado, setRangoSeleccionado] = useState('mes');
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [ventasHoy, setVentasHoy] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHoy, setLoadingHoy] = useState(false);
  const [productosInv, setProductosInv] = useState<Product[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Cargar ventas del rango seleccionado
  useEffect(() => {
    const fetchVentas = async () => {
      try {
        setLoading(true);
        const data = await salesAPI.getAll({
          start_date: `${fechaInicio}T00:00:00`,
          end_date: `${fechaFin}T23:59:59`,
        });
        setVentas((data as Sale[]) || []);
      } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : String(error);
        toast.error(msg || 'Error cargando las ventas');
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  }, [fechaInicio, fechaFin]);

  // Cargar ventas de hoy
  useEffect(() => {
    const fetchVentasHoy = async () => {
      try {
        setLoadingHoy(true);
        const data = await salesAPI.getAll({ today: true });
        setVentasHoy((data as Sale[]) || []);
      } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : String(error);
        toast.error(msg || 'Error cargando las ventas de hoy');
      } finally {
        setLoadingHoy(false);
      }
    };

    fetchVentasHoy();
  }, []);

  // Cargar productos del inventario (para calcular costos y precios)
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const data = await productsAPI.getAll({ limit: 1000 });
        setProductosInv((data as Product[]) || []);
      } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : String(error);
        toast.error(msg || 'Error cargando los productos');
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, []);

  // Manejar cambio de rango
  const handleRangoChange = (rango: string) => {
    setRangoSeleccionado(rango);
    const hoy = new Date();

    switch (rango) {
      case 'hoy':
        setFechaInicio(format(hoy, 'yyyy-MM-dd'));
        setFechaFin(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'semana': {
        const inicioSemana = startOfDay(addDays(hoy, -7));
        setFechaInicio(format(inicioSemana, 'yyyy-MM-dd'));
        setFechaFin(format(hoy, 'yyyy-MM-dd'));
        break;
      }
      case 'mes':
        setFechaInicio(format(startOfMonth(hoy), 'yyyy-MM-dd'));
        setFechaFin(format(endOfMonth(hoy), 'yyyy-MM-dd'));
        break;
      case 'mes_anterior': {
        const mesAnterior = subMonths(hoy, 1);
        setFechaInicio(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'));
        setFechaFin(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'));
        break;
      }
      default:
        break;
    }
  };

  // Filtrar ventas por rango
  const ventasFiltradas = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    if (rangoSeleccionado === 'hoy') return ventas;

    const inicio = startOfDay(new Date(fechaInicio + 'T00:00:00'));
    const fin = endOfDay(new Date(fechaFin + 'T23:59:59'));

    return ventas.filter((venta) => {
      const fechaVenta = new Date(venta.created_at);
      return isWithinInterval(fechaVenta, { start: inicio, end: fin });
    });
  }, [ventas, fechaInicio, fechaFin, rangoSeleccionado]);

  // Estadísticas generales
  const totalGeneral = ventasFiltradas.reduce((sum, venta) => sum + (venta.total || 0), 0);
  const totalHoy = ventasHoy.reduce((sum, venta) => sum + (venta.total || 0), 0);
  const cantidadVentas = ventasFiltradas.length;
  const promedioVenta = cantidadVentas > 0 ? totalGeneral / cantidadVentas : 0;

  // Mapa rápido del inventario: name (lowercase) -> { price, cost }
  const inventarioMap = useMemo(() => {
    const map = new Map<string, { price?: number | null; cost?: number | null }>();
    productosInv.forEach((p) => {
      const name = (p.name || p.nombre || '').toString().toLowerCase();
      map.set(name, {
        price: (p.price ?? p.precio) as number | null,
        cost: (p.cost ?? p.costo) as number | null,
      });
    });
    return map;
  }, [productosInv]);

  // Datos para la tabla de ganancias
  const gananciasData: GananciaRow[] = useMemo(() => {
    const agg = new Map<string, { nombreOriginal?: string; cantidad: number; totalSales: number; unitPrice?: number | null }>();

    ventasFiltradas.forEach((venta) => {
      if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach((item) => {
          const nombre = item.product_name || 'Producto sin nombre';
          const key = nombre.toLowerCase();
          const existing = agg.get(key) || { nombreOriginal: nombre, cantidad: 0, totalSales: 0, unitPrice: null };

          existing.cantidad += item.quantity;
          existing.totalSales += item.subtotal;
          if (existing.unitPrice == null && item.quantity) {
            existing.unitPrice = item.subtotal / item.quantity;
          }

          agg.set(key, existing);
        });
      }
    });

    const rows: GananciaRow[] = Array.from(agg.entries()).map(([key, v]) => {
      const inv = inventarioMap.get(key);
      const precio = inv?.price ?? v.unitPrice ?? null;
      const costo = inv?.cost ?? null;
      const gananciaUnit = precio != null && costo != null ? (precio - costo) : null;
      const gananciaTotal = gananciaUnit != null ? gananciaUnit * v.cantidad : null;

      return {
        nombre: v.nombreOriginal || key,
        costo,
        precio,
        cantidad: v.cantidad,
        ganancia: gananciaTotal,
      };
    });

    rows.sort((a, b) => (b.ganancia ?? -Infinity) - (a.ganancia ?? -Infinity));
    return rows;
  }, [ventasFiltradas, inventarioMap]);

  // Ganancia total
  const gananciaTotal = useMemo(() => gananciasData.reduce((sum, r) => sum + (r.ganancia ?? 0), 0), [gananciasData]);

  // Métodos de pago
  const pagosPorMetodo = useMemo(() => {
    const metodos: Record<string, number> = { efectivo: 0, nequi: 0, daviplata: 0, card: 0, transfer: 0 };
    ventasFiltradas.forEach((venta) => {
      const metodo = (venta.payment_method || 'otro').toLowerCase();
      metodos[metodo] = (metodos[metodo] || 0) + (venta.total || 0);
    });
    return metodos;
  }, [ventasFiltradas]);

  const dataPie: PaymentData[] = useMemo(() => {
    return Object.entries(pagosPorMetodo)
      .filter(([_, v]) => v > 0)
      .map(([met, val]) => ({
        name: met,
        value: val,
        color: COLORS[met] ?? '#3b82f6',
      }));
  }, [pagosPorMetodo]);

  // Datos para gráficas de líneas (ventas por día)
  const dataLineas: DailyData[] = useMemo(() => {
    if (ventasFiltradas.length === 0) {
      return [];
    }

    const inicio = rangoSeleccionado === 'hoy' ? startOfDay(new Date()) : new Date(fechaInicio + 'T00:00:00');
    const fin = rangoSeleccionado === 'hoy' ? endOfDay(new Date()) : new Date(fechaFin + 'T23:59:59');

    const todosLosDias = eachDayOfInterval({ start: inicio, end: fin });

    const ventasPorDia = todosLosDias.map((dia) => {
      const fechaStr = format(dia, 'dd/MM', { locale: es });
      return { fecha: fechaStr, fechaCompleta: format(dia, 'yyyy-MM-dd'), total: 0, cantidad: 0, diaSemana: format(dia, 'EEEE', { locale: es }) };
    });

    ventasFiltradas.forEach((venta) => {
      const fechaVenta = new Date(venta.created_at);
      const fechaCompleta = format(fechaVenta, 'yyyy-MM-dd');
      const dia = ventasPorDia.find((d) => d.fechaCompleta === fechaCompleta);
      if (dia) {
        dia.total += venta.total;
        dia.cantidad += 1;
      }
    });

    return ventasPorDia;
  }, [ventasFiltradas, fechaInicio, fechaFin, rangoSeleccionado]);

  // Top productos
  const topProductos: ProductData[] = useMemo(() => {
    const map = new Map<string, { cantidad: number; total: number }>();
    ventasFiltradas.forEach((venta) => {
      venta.items?.forEach((it) => {
        const name = it.product_name || 'Producto sin nombre';
        const curr = map.get(name) || { cantidad: 0, total: 0 };
        map.set(name, { cantidad: curr.cantidad + it.quantity, total: curr.total + it.subtotal });
      });
    });

    return Array.from(map.entries())
      .map(([nombre, d]) => ({ nombre, cantidad: d.cantidad, total: d.total }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [ventasFiltradas]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de ventas y estadísticas</p>
        </div>

        {/* Selector de rango */}
        <DateRangeSelector
          rangoSeleccionado={rangoSeleccionado}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          onRangoChange={handleRangoChange}
          onFechaInicioChange={setFechaInicio}
          onFechaFinChange={setFechaFin}
        />

        {/* Tarjetas de estadísticas */}
        <StatsCards
          totalHoy={totalHoy}
          ventasHoyLength={ventasHoy.length}
          loadingHoy={loadingHoy}
          totalGeneral={totalGeneral}
          cantidadVentas={cantidadVentas}
          promedioVenta={promedioVenta}
          metodoPrincipal={dataPie[0] || null}
          gananciaTotal={gananciaTotal}
        />

        {/* Tabs con gráficos y tablas */}
        <Tabs defaultValue="tabla" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tabla">🧾 Detalle de Ventas</TabsTrigger>
            <TabsTrigger value="metodos">💳 Métodos de Pago</TabsTrigger>
            <TabsTrigger value="tendencia">📈 Tendencia Diaria</TabsTrigger>
            <TabsTrigger value="productos">🔝 Top Productos</TabsTrigger>
            <TabsTrigger value="ganancias">💰 Ganancias</TabsTrigger>
          </TabsList>

          <TabsContent value="metodos">
            <PaymentMethodsChart data={dataPie} totalGeneral={totalGeneral} />
          </TabsContent>

          <TabsContent value="tendencia">
            <DailyTrendChart data={dataLineas} />
          </TabsContent>

          <TabsContent value="productos">
            <TopProductsChart data={topProductos} />
          </TabsContent>

          <TabsContent value="ganancias">
            <GananciasTable fechaInicio={fechaInicio} fechaFin={fechaFin} data={gananciasData} loading={loading || loadingProductos} />
          </TabsContent>

          <TabsContent value="tabla">
            <SalesTable ventas={ventasFiltradas} loading={loading} fechaInicio={fechaInicio} fechaFin={fechaFin} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
