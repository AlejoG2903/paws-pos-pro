import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
  addDays,
  subMonths,
  eachDayOfInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { salesAPI, productsAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

// ============================================================================
// CONSTANTES Y TIPOS
// ============================================================================

const COLORS = {
  efectivo: '#10b981',
  nequi: '#8b5cf6',
  daviplata: '#f59e0b',
  card: '#60a5fa',
  transfer: '#f97316'
};

interface Sale {
  id: number;
  created_at: string;
  user?: { full_name: string };
  payment_method: string;
  total: number;
  items?: Array<{ product_name: string; quantity: number; subtotal: number }>;
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

interface GananciaRow {
  nombre: string;
  costo?: number | null;
  precio?: number | null;
  cantidad: number;
  ganancia?: number | null;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatMoney = (v?: number | null) => {
  if (v == null || Number.isNaN(Number(v))) return '0';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(Number(v)));
};

// ============================================================================
// STATS CARDS
// ============================================================================

interface StatsCardsProps {
  totalHoy: number;
  ventasHoyLength: number;
  loadingHoy: boolean;
  totalGeneral: number;
  cantidadVentas: number;
  totalGanancias: number;
  metodoPrincipal: PaymentData | null;
}

const StatsCards = ({
  totalHoy,
  ventasHoyLength,
  loadingHoy,
  totalGeneral,
  cantidadVentas,
  totalGanancias,
  metodoPrincipal
}: StatsCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <div className="text-2xl font-bold">${formatMoney(totalHoy)}</div>
              <p className="text-xs text-muted-foreground">{ventasHoyLength} ventas realizadas</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total del Período</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${formatMoney(totalGeneral)}</div>
          <p className="text-xs text-muted-foreground">{cantidadVentas} ventas totales</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ganancias</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${formatMoney(totalGanancias)}</div>
          <p className="text-xs text-muted-foreground">Suma de ganancias por producto</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Método Principal</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {metodoPrincipal ? (
            <>
              <div className="text-2xl font-bold capitalize">{metodoPrincipal.name}</div>
              <p className="text-xs text-muted-foreground">${formatMoney(metodoPrincipal.value)} total</p>
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
// DateRangeSelector
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
  onFechaFinChange
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
                <Input type="date" value={fechaInicio} onChange={(e) => onFechaInicioChange(e.target.value)} className="w-full sm:w-auto" />
                <Input type="date" value={fechaFin} onChange={(e) => onFechaFinChange(e.target.value)} className="w-full sm:w-auto" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Charts & Tables
// ============================================================================

const PaymentMethodsChart = ({ data, totalGeneral }: { data: PaymentData[]; totalGeneral: number }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Método de Pago</CardTitle>
        <p className="text-sm text-muted-foreground">Porcentaje de ventas según método de pago utilizado en el período seleccionado</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">No hay datos disponibles</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={400}>
              <RechartsPie>
                <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={120} dataKey="value">
                  {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${formatMoney(value)}`, 'Total']} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>

            <div className="space-y-4">
              <h4 className="font-semibold">Detalles por Método</h4>
              {data.map((item) => (
                <div key={item.name} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div style={{ backgroundColor: item.color }} className="w-4 h-4 rounded" />
                    <span className="font-medium capitalize">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${formatMoney(item.value)}</div>
                    <div className="text-sm text-muted-foreground">{totalGeneral > 0 ? ((item.value / totalGeneral) * 100).toFixed(1) : '0.0'}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${formatMoney(v)}`} />
              <Tooltip formatter={(value: number) => [`$${formatMoney(value)}`, 'Total']} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </RechartsLine>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

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
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(value: number, name: string) => (name === 'cantidad' ? [value, 'Unidades'] : [`$${formatMoney(value)}`, 'Total'])} />
                <Legend />
                <Bar dataKey="cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Cantidad Vendida" />
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
                      <div className="font-bold text-sm">${formatMoney(item.total)}</div>
                      <div className="text-xs text-muted-foreground">${formatMoney(item.total / Math.max(1, item.cantidad))} c/u</div>
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
                      <td className="px-4 py-3 text-sm">{row.costo != null ? `$${formatMoney(row.costo)}` : '—'}</td>
                      <td className="px-4 py-3 text-sm">{row.precio != null ? `$${formatMoney(row.precio)}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.cantidad}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{row.ganancia != null ? `$${formatMoney(row.ganancia)}` : '—'}</td>
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

const SalesTable = ({ ventas, loading, fechaInicio, fechaFin }: { ventas: Sale[]; loading: boolean; fechaInicio: string; fechaFin: string }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle de Ventas</CardTitle>
        <p className="text-sm text-muted-foreground">{format(new Date(fechaInicio), "dd 'de' MMMM", { locale: es })} - {format(new Date(fechaFin), "dd 'de' MMMM yyyy", { locale: es })}</p>
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
                  <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Cargando ventas...</td>
                  </tr>
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay ventas en este rango de fechas</td>
                  </tr>
                ) : (
                  ventas.map((venta) => (
                    <tr key={venta.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{format(new Date(venta.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                      <td className="px-4 py-3 text-sm">{venta.user?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-sm capitalize">{venta.payment_method}</td>
                      <td className="px-4 py-3 text-sm">{venta.items && venta.items.length > 0 ? venta.items.map(i => `${i.product_name} x${i.quantity}`).join(', ') : '—'}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">${formatMoney(venta.total)}</td>
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
// DASHBOARD
// ============================================================================

const Dashboard = () => {
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [rangoSeleccionado, setRangoSeleccionado] = useState('mes');
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [ventasHoy, setVentasHoy] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHoy, setLoadingHoy] = useState(false);
  const [productosInv, setProductosInv] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        setLoading(true);
        const data = await salesAPI.getAll({ start_date: `${fechaInicio}T00:00:00`, end_date: `${fechaFin}T23:59:59` });
        setVentas(data || []);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error cargando las ventas');
      } finally {
        setLoading(false);
      }
    };
    fetchVentas();
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    const fetchVentasHoy = async () => {
      try {
        setLoadingHoy(true);
        const data = await salesAPI.getAll({ today: true });
        setVentasHoy(data || []);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error cargando las ventas de hoy');
      } finally {
        setLoadingHoy(false);
      }
    };
    fetchVentasHoy();
  }, []);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const data = await productsAPI.getAll({ limit: 1000 });
        setProductosInv(data || []);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error cargando los productos');
      } finally {
        setLoadingProductos(false);
      }
    };
    fetchProductos();
  }, []);

  const handleRangoChange = (rango: string) => {
    setRangoSeleccionado(rango);
    const hoy = new Date();
    switch (rango) {
      case 'hoy':
        setFechaInicio(format(hoy, 'yyyy-MM-dd'));
        setFechaFin(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'semana':
        setFechaInicio(format(startOfDay(addDays(hoy, -7)), 'yyyy-MM-dd'));
        setFechaFin(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'mes':
        setFechaInicio(format(startOfMonth(hoy), 'yyyy-MM-dd'));
        setFechaFin(format(endOfMonth(hoy), 'yyyy-MM-dd'));
        break;
      case 'mes_anterior':
        const ma = subMonths(hoy, 1);
        setFechaInicio(format(startOfMonth(ma), 'yyyy-MM-dd'));
        setFechaFin(format(endOfMonth(ma), 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  const ventasFiltradas = useMemo(() => {
    if (ventas.length === 0) return [];
    if (rangoSeleccionado === 'hoy') return ventas;
    const inicio = startOfDay(new Date(fechaInicio + 'T00:00:00'));
    const fin = endOfDay(new Date(fechaFin + 'T23:59:59'));
    return ventas.filter(v => {
      const d = new Date(v.created_at);
      return isWithinInterval(d, { start: inicio, end: fin });
    });
  }, [ventas, fechaInicio, fechaFin, rangoSeleccionado]);

  const totalGeneral = ventasFiltradas.reduce((s, v) => s + (v.total || 0), 0);
  const totalHoy = ventasHoy.reduce((s, v) => s + (v.total || 0), 0);
  const cantidadVentas = ventasFiltradas.length;

  const pagosPorMetodo = useMemo(() => {
    const m: Record<string, number> = { efectivo: 0, nequi: 0, daviplata: 0, card: 0, transfer: 0 };
    ventasFiltradas.forEach(v => {
      const metodo = (v.payment_method || '').toLowerCase();
      if (m[metodo] !== undefined) m[metodo] += v.total || 0;
      else m[metodo] = (m[metodo] || 0) + (v.total || 0);
    });
    return m;
  }, [ventasFiltradas]);

  const dataPie: PaymentData[] = useMemo(() => {
    return Object.entries(pagosPorMetodo)
      .filter(([, val]) => val > 0)
      .map(([k, val]) => ({ name: k, value: val, color: (COLORS as any)[k] || '#9ca3af' }));
  }, [pagosPorMetodo]);

  const dataLineas = useMemo(() => {
    if (ventasFiltradas.length === 0) return [];
    const inicio = rangoSeleccionado === 'hoy' ? startOfDay(new Date()) : new Date(fechaInicio + 'T00:00:00');
    const fin = rangoSeleccionado === 'hoy' ? endOfDay(new Date()) : new Date(fechaFin + 'T23:59:59');
    const dias = eachDayOfInterval({ start: inicio, end: fin });
    const diasData = dias.map(d => ({ fecha: format(d, 'dd/MM', { locale: es }), fechaCompleta: format(d, 'yyyy-MM-dd'), total: 0, cantidad: 0, diaSemana: format(d, 'EEEE', { locale: es }) }));
    ventasFiltradas.forEach(v => {
      const fecha = format(new Date(v.created_at), 'yyyy-MM-dd');
      const found = diasData.find(d => d.fechaCompleta === fecha);
      if (found) { found.total += v.total || 0; found.cantidad += 1; }
    });
    return diasData;
  }, [ventasFiltradas, fechaInicio, fechaFin, rangoSeleccionado]);

  const topProductos = useMemo(() => {
    const map = new Map<string, { cantidad: number; total: number }>();
    ventasFiltradas.forEach(v => {
      (v.items || []).forEach(item => {
        const name = item.product_name || 'Producto sin nombre';
        const ex = map.get(name) || { cantidad: 0, total: 0 };
        ex.cantidad += item.quantity;
        ex.total += item.subtotal;
        map.set(name, ex);
      });
    });
    return Array.from(map.entries()).map(([nombre, d]) => ({ nombre, cantidad: d.cantidad, total: d.total })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  }, [ventasFiltradas]);

  const inventarioMap = useMemo(() => {
    const m = new Map<string, { price?: number | null; cost?: number | null }>();
    productosInv.forEach(p => {
      const key = (p.name || p.nombre || '').toString().toLowerCase();
      m.set(key, { price: p.price ?? p.precio ?? null, cost: p.cost ?? p.costo ?? null });
    });
    return m;
  }, [productosInv]);

  const gananciasData = useMemo(() => {
    const agg = new Map<string, { nombreOriginal?: string; cantidad: number; totalSales: number; unitPrice?: number | null }>();
    ventasFiltradas.forEach(v => {
      (v.items || []).forEach(item => {
        const nombre = item.product_name || 'Producto sin nombre';
        const key = nombre.toLowerCase();
        const ex = agg.get(key) || { nombreOriginal: nombre, cantidad: 0, totalSales: 0, unitPrice: null };
        ex.cantidad += item.quantity;
        ex.totalSales += item.subtotal;
        if (ex.unitPrice == null && item.quantity) ex.unitPrice = item.subtotal / item.quantity;
        agg.set(key, ex);
      });
    });

    const rows: GananciaRow[] = Array.from(agg.entries()).map(([key, v]) => {
      const inv = inventarioMap.get(key);
      const precio = inv?.price ?? v.unitPrice ?? null;
      const costo = inv?.cost ?? null;
      const gananciaUnit = precio != null && costo != null ? precio - costo : null;
      const gananciaTotal = gananciaUnit != null ? Number((gananciaUnit * v.cantidad).toFixed(2)) : null;
      return { nombre: v.nombreOriginal || key, costo, precio, cantidad: v.cantidad, ganancia: gananciaTotal };
    });

    rows.sort((a, b) => (b.ganancia ?? -Infinity) - (a.ganancia ?? -Infinity));
    return rows;
  }, [ventasFiltradas, inventarioMap]);

  const totalGanancias = useMemo(() => gananciasData.reduce((s, r) => s + (r.ganancia ?? 0), 0), [gananciasData]);

  const metodoPrincipal = useMemo(() => {
    if (dataPie.length === 0) return null;
    const sorted = [...dataPie].sort((a, b) => b.value - a.value);
    return { name: sorted[0].name, value: sorted[0].value, color: sorted[0].color };
  }, [dataPie]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de ventas y estadísticas</p>
        </div>

        <DateRangeSelector rangoSeleccionado={rangoSeleccionado} fechaInicio={fechaInicio} fechaFin={fechaFin} onRangoChange={handleRangoChange} onFechaInicioChange={setFechaInicio} onFechaFinChange={setFechaFin} />

        <StatsCards totalHoy={totalHoy} ventasHoyLength={ventasHoy.length} loadingHoy={loadingHoy} totalGeneral={totalGeneral} cantidadVentas={cantidadVentas} totalGanancias={totalGanancias} metodoPrincipal={metodoPrincipal} />

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