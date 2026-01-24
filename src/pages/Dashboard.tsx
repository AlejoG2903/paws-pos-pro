// ============================================================================
// DASHBOARD COMPLETO - Archivo único con todos los componentes
// ============================================================================
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, CreditCard, Calendar, PiggyBank, Trash2 } from 'lucide-react';
import { formatearNumero } from '@/lib/utils';
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
  parseISO,
  isToday,
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
const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Limpiar formato de moneda si existe
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const parseSale = (sale: any): Sale => {
  return {
    id: sale.id,
    created_at: sale.created_at,
    user: sale.user,
    payment_method: sale.payment_method || 'efectivo',
    total: parseNumber(sale.total),
    subtotal: parseNumber(sale.subtotal),
    tax: parseNumber(sale.tax),
    discount: parseNumber(sale.discount),
    items: Array.isArray(sale.items) ? sale.items.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name || 'Producto sin nombre',
      quantity: parseNumber(item.quantity),
      price: parseNumber(item.price),
      subtotal: parseNumber(item.subtotal),
      id: item.id,
    })) : [],
  };
};

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  id: number;
}

interface Sale {
  id: number;
  created_at: string;
  user?: { 
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  items: SaleItem[];
}

interface PaymentData {
  name: string;
  value: number;
  color: string;
  count: number;
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
  description?: string;
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
  totalVendido: number;
}

const COLORS: Record<string, string> = {
  efectivo: '#10b981',
  nequi: '#4c00ffff',
  daviplata: '#ff0000ff',
  card: '#f59e0b',
  transfer: '#8b5cf6',
  otro: '#6b7280',
};

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
  isAdmin: boolean;
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
  isAdmin,
}: StatsCardsProps) => {
  return (
    <div className={`grid gap-4 ${isAdmin ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
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
              <div className="text-2xl font-bold">${formatearNumero(totalHoy)}</div>
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
          <div className="text-2xl font-bold">${formatearNumero(totalGeneral)}</div>
          <p className="text-xs text-muted-foreground">
            {cantidadVentas} ventas totales • ${formatearNumero(promedioVenta)} promedio
          </p>
        </CardContent>
      </Card>

      {/* Ganancia Total */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatearNumero(gananciaTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Suma total de ganancias del período</p>
          </CardContent>
        </Card>
      )}

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
                ${formatearNumero(metodoPrincipal.value)} • {metodoPrincipal.count} ventas
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
                  max={fechaFin}
                />
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => onFechaFinChange(e.target.value)}
                  className="w-full sm:w-auto"
                  min={fechaInicio}
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
// COMPONENTE: PaymentMethodsChart
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col p-4 border rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      style={{ background: item.color }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium capitalize">{item.name}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="font-bold">${formatearNumero(item.value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ventas:</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Porcentaje:</span>
                      <span className="font-medium">
                        {totalGeneral > 0 ? `${((item.value / totalGeneral) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Resumen total */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total general del período:</span>
                <span className="text-2xl font-bold">${formatearNumero(totalGeneral)}</span>
              </div>
            </div>
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
  const chartData = data.map(item => ({
    ...item,
    total: Math.round(item.total), // Asegurar números enteros para el gráfico
  }));

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
            <RechartsLine data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="fecha" 
                tick={{ fontSize: 12 }} 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tickFormatter={(value) => value.split('/').slice(0, 2).join('/')}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => [`$${formatearNumero(value)}`, 'Total']}
                labelFormatter={(label) => `Fecha: ${label}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                name="Ventas del Día" 
                dot={{ r: 4, strokeWidth: 2 }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
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
  const maxCantidad = Math.max(...data.map(d => d.cantidad), 1);
  
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
            <div className="space-y-3">
              <h4 className="font-semibold">Ranking de Productos</h4>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                {data.map((item, index) => {
                  const porcentaje = (item.cantidad / maxCantidad) * 100;
                  return (
                    <div key={item.nombre} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate" title={item.nombre}>
                              {item.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.cantidad} unidades</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">${formatearNumero(item.total)}</div>
                          <div className="text-xs text-muted-foreground">
                            ${formatearNumero(item.total / item.cantidad)} c/u
                          </div>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary/30 rounded-full" 
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Distribución por Cantidad</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => formatearNumero(v)}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="nombre" 
                    tick={{ fontSize: 11 }} 
                    width={150}
                    tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                  />
                  <Tooltip 
                      formatter={(value: number, name: string) => 
                        name === 'cantidad' 
                          ? [formatearNumero(value), 'Unidades'] 
                          : [`$${formatearNumero(value)}`, 'Total']
                    }
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="cantidad" 
                    fill="#8b5cf6" 
                    name="Cantidad Vendida" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
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
  const totalGanancia = data.reduce((sum, row) => sum + (row.ganancia || 0), 0);
  const totalVendido = data.reduce((sum, row) => sum + row.totalVendido, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ganancias por Producto</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(fechaInicio), "dd 'de' MMMM", { locale: es })} - {format(parseISO(fechaFin), "dd 'de' MMMM yyyy", { locale: es })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Producto</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Costo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Precio</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total Vendido</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Cargando datos...
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay datos de ganancias en este rango
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row) => {
                      return (
                        <tr key={row.nombre} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-medium">{row.nombre}</td>
                          <td className="px-4 py-3 text-sm">{formatearNumero(row.cantidad)}</td>
                          <td className="px-4 py-3 text-sm">
                            {row.costo != null ? `$${formatearNumero(row.costo)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {row.precio != null ? `$${formatearNumero(row.precio)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            ${formatearNumero(row.totalVendido)}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${
                            (row.ganancia || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {row.ganancia != null ? `$${formatearNumero(row.ganancia)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Fila de totales */}
                    <tr className="border-t bg-muted/20 font-semibold">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3">
                        {formatearNumero(data.reduce((sum, row) => sum + row.cantidad, 0))}
                      </td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 text-right">${formatearNumero(totalVendido)}</td>
                      <td className={`px-4 py-3 text-right ${totalGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${formatearNumero(totalGanancia)}
                      </td>
                    </tr>
                  </>
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
// COMPONENTE: SalesTable
// ============================================================================
const SalesTable = ({
  ventas,
  loading,
  fechaInicio,
  fechaFin,
  onSaleDeleted,
}: {
  ventas: Sale[];
  loading: boolean;
  fechaInicio: string;
  fechaFin: string;
  onSaleDeleted?: () => void;
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const handleDeleteSale = async (saleId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingId(saleId);
      await salesAPI.delete(saleId);
      toast.success('Venta eliminada correctamente');
      
      if (onSaleDeleted) {
        onSaleDeleted();
      }
    } catch (error) {
      console.error('Error eliminando venta:', error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(msg || 'Error al eliminar la venta');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle de Ventas</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(fechaInicio), "dd 'de' MMMM", { locale: es })} -{" "}
          {format(parseISO(fechaFin), "dd 'de' MMMM yyyy", { locale: es })}
          {isAdmin && (
            <span className="block text-xs text-amber-600 mt-1">
              ⚠️ Modo Administrador: Puedes eliminar ventas
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Fecha y Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Vendedor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Método</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Productos</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center text-sm font-medium">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Cargando ventas...
                      </div>
                    </td>
                  </tr>
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                      No hay ventas en este rango de fechas
                    </td>
                  </tr>
                ) : (
                  ventas.map((venta) => (
                    <tr key={venta.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        {format(parseISO(venta.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-sm">{venta.user?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="capitalize px-2 py-1 rounded-full text-xs font-medium bg-muted">
                          {venta.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {venta.items.length > 0 ? (
                          <div className="space-y-1">
                            {venta.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <span className="truncate max-w-[150px]" title={item.product_name}>
                                  {item.product_name}
                                </span>
                                <span className="text-muted-foreground text-xs whitespace-nowrap">
                                  x{formatearNumero(item.quantity)} = ${formatearNumero(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        ${formatearNumero(venta.total)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteSale(venta.id)}
                            disabled={deletingId === venta.id}
                            className="inline-flex items-center justify-center px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Eliminar venta"
                          >
                            {deletingId === venta.id ? (
                              <span className="flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Eliminando...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Eliminar
                              </span>
                            )}
                          </button>
                        </td>
                      )}
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
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
  const fetchVentasData = async () => {
    try {
      setLoading(true);
      const data = await salesAPI.getAll({
        start_date: `${fechaInicio}T00:00:00`,
        end_date: `${fechaFin}T23:59:59`,
      });
      
      // Parsear las ventas
      const parsedVentas = Array.isArray(data) 
        ? data.map(parseSale)
        : [];
      setVentas(parsedVentas);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(msg || 'Error cargando las ventas');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentasData();
  }, [fechaInicio, fechaFin]);

  // Cargar ventas de hoy
  const fetchVentasHoy = async () => {
    try {
      setLoadingHoy(true);
      const hoy = new Date();
      const data = await salesAPI.getAll({
        start_date: format(hoy, 'yyyy-MM-dd') + 'T00:00:00',
        end_date: format(hoy, 'yyyy-MM-dd') + 'T23:59:59',
      });
      
      const parsedVentas = Array.isArray(data) 
        ? data.map(parseSale)
        : [];
      setVentasHoy(parsedVentas);
    } catch (error) {
      console.error('Error cargando ventas de hoy:', error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(msg || 'Error cargando las ventas de hoy');
      setVentasHoy([]);
    } finally {
      setLoadingHoy(false);
    }
  };

  useEffect(() => {
    fetchVentasHoy();
  }, []);

  // Cargar productos del inventario (solo para admins)
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const data = await productsAPI.getAll({ limit: 1000 });
        setProductosInv(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error cargando productos:', error);
        const msg = error instanceof Error ? error.message : String(error);
        toast.error(msg || 'Error cargando los productos');
        setProductosInv([]);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [isAdmin]);

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
        const inicioSemana = startOfDay(addDays(hoy, -6)); // Últimos 7 días incluido hoy
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

  // Filtrar ventas por rango (ya viene filtrado del backend, pero hacemos filtro adicional)
  const ventasFiltradas = useMemo(() => {
    return ventas.filter(venta => {
      const fechaVenta = parseISO(venta.created_at);
      const inicio = startOfDay(parseISO(fechaInicio));
      const fin = endOfDay(parseISO(fechaFin));
      return isWithinInterval(fechaVenta, { start: inicio, end: fin });
    });
  }, [ventas, fechaInicio, fechaFin]);

  // Estadísticas generales
  const totalGeneral = useMemo(() => 
    ventasFiltradas.reduce((sum, venta) => sum + venta.total, 0), 
    [ventasFiltradas]
  );
  
  const totalHoy = useMemo(() => 
    ventasHoy.reduce((sum, venta) => sum + venta.total, 0), 
    [ventasHoy]
  );
  
  const cantidadVentas = ventasFiltradas.length;
  const promedioVenta = cantidadVentas > 0 ? totalGeneral / cantidadVentas : 0;

  // Mapa del inventario
  const inventarioMap = useMemo(() => {
    const map = new Map<string, { price?: number | null; cost?: number | null }>();
    productosInv.forEach((p) => {
      const name = (p.name || p.nombre || '').toString().toLowerCase().trim();
      if (name) {
        map.set(name, {
          price: parseNumber(p.price ?? p.precio),
          cost: parseNumber(p.cost ?? p.costo),
        });
      }
    });
    return map;
  }, [productosInv]);

  // Datos para la tabla de ganancias (solo para admins)
  const gananciasData: GananciaRow[] = useMemo(() => {
    if (!isAdmin) return [];
    
    const agg = new Map<string, { 
      nombreOriginal: string; 
      cantidad: number; 
      totalVendido: number;
      esKg: boolean;
    }>();

    ventasFiltradas.forEach((venta) => {
      venta.items.forEach((item) => {
        const nombre = item.product_name || 'Producto sin nombre';
        const key = nombre.toLowerCase().trim();
        const existing = agg.get(key) || { 
          nombreOriginal: nombre, 
          cantidad: 0, 
          totalVendido: 0,
          esKg: false 
        };

        existing.cantidad += item.quantity;
        existing.totalVendido += item.subtotal;
        
        // Detectar si es venta por KG
        if (!Number.isInteger(item.quantity) && item.quantity % 1 !== 0) {
          existing.esKg = true;
        }
        
        agg.set(key, existing);
      });
    });

    const rows: GananciaRow[] = Array.from(agg.entries()).map(([_, v]) => {
      const inv = inventarioMap.get(v.nombreOriginal.toLowerCase().trim());
      let precio: number | null = inv?.price ?? null;
      let costo: number | null = inv?.cost ?? null;
      let gananciaTotal: number | null = null;
      let totalVendidoCalculado = v.totalVendido;

      // Si no tenemos precio del inventario, calcularlo del promedio de venta
      if (!precio && v.cantidad > 0) {
        precio = v.totalVendido / v.cantidad;
      }

      // Calcular ganancia: siempre total vendido menos costo total
      if (costo !== null) {
        gananciaTotal = v.totalVendido - (costo * v.cantidad);
      }

      return {
        nombre: v.nombreOriginal,
        costo,
        precio,
        cantidad: v.cantidad,
        ganancia: gananciaTotal,
        totalVendido: v.totalVendido,
      };
    });

    // Incluir todos los productos, incluso sin costo
    rows.sort((a, b) => (b.ganancia ?? -Infinity) - (a.ganancia ?? -Infinity));
    
    return rows;
  }, [ventasFiltradas, inventarioMap, isAdmin]);

  // Ganancia total (solo para admins)
  const gananciaTotal = useMemo(() => {
    if (!isAdmin) return 0;
    return gananciasData.reduce((sum, r) => sum + (r.ganancia || 0), 0);
  }, [gananciasData, isAdmin]);

  // Métodos de pago
  const pagosPorMetodo = useMemo(() => {
    const metodos: Record<string, { total: number; count: number }> = {};
    
    ventasFiltradas.forEach((venta) => {
      const metodo = (venta.payment_method || 'otro').toLowerCase();
      if (!metodos[metodo]) {
        metodos[metodo] = { total: 0, count: 0 };
      }
      metodos[metodo].total += venta.total;
      metodos[metodo].count += 1;
    });
    
    return metodos;
  }, [ventasFiltradas]);

  const dataPie: PaymentData[] = useMemo(() => {
    return Object.entries(pagosPorMetodo)
      .map(([met, data]) => ({
        name: met,
        value: data.total,
        color: COLORS[met] ?? '#6b7280',
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [pagosPorMetodo]);

  const metodoPrincipal = dataPie[0] || null;

  // Datos para gráficas de líneas (ventas por día)
  const dataLineas: DailyData[] = useMemo(() => {
    if (ventasFiltradas.length === 0) return [];

    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);
    
    // Si es solo hoy, mostrar por horas en lugar de días
    if (rangoSeleccionado === 'hoy') {
      const horas = Array.from({ length: 24 }, (_, i) => i);
      const ventasPorHora = horas.map(hora => {
        const ventasHora = ventasFiltradas.filter(venta => {
          const fechaVenta = parseISO(venta.created_at);
          return fechaVenta.getHours() === hora;
        });
        
        const totalHora = ventasHora.reduce((sum, v) => sum + v.total, 0);
        return {
          fecha: `${hora.toString().padStart(2, '0')}:00`,
          fechaCompleta: `${hora.toString().padStart(2, '0')}:00`,
          total: totalHora,
          cantidad: ventasHora.length,
          diaSemana: format(inicio, 'EEEE', { locale: es }),
        };
      });
      
      return ventasPorHora;
    }

    // Para rangos mayores a un día
    const todosLosDias = eachDayOfInterval({ start: inicio, end: fin });

    const ventasPorDia = todosLosDias.map((dia) => {
      const fechaStr = format(dia, 'dd/MM', { locale: es });
      const ventasDia = ventasFiltradas.filter(venta => {
        const fechaVenta = parseISO(venta.created_at);
        return format(fechaVenta, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd');
      });
      
      const totalDia = ventasDia.reduce((sum, v) => sum + v.total, 0);
      return {
        fecha: fechaStr,
        fechaCompleta: format(dia, 'yyyy-MM-dd'),
        total: totalDia,
        cantidad: ventasDia.length,
        diaSemana: format(dia, 'EEEE', { locale: es }),
      };
    });

    return ventasPorDia;
  }, [ventasFiltradas, fechaInicio, fechaFin, rangoSeleccionado]);

  // Top productos
  const topProductos: ProductData[] = useMemo(() => {
    const map = new Map<string, { cantidad: number; total: number }>();
    
    ventasFiltradas.forEach((venta) => {
      venta.items.forEach((item) => {
        const name = item.product_name || 'Producto sin nombre';
        const curr = map.get(name) || { cantidad: 0, total: 0 };
        map.set(name, { 
          cantidad: curr.cantidad + item.quantity, 
          total: curr.total + item.subtotal 
        });
      });
    });

    return Array.from(map.entries())
      .map(([nombre, d]) => ({ 
        nombre, 
        cantidad: d.cantidad, 
        total: d.total 
      }))
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
          metodoPrincipal={metodoPrincipal}
          gananciaTotal={gananciaTotal}
          isAdmin={isAdmin}
        />

        {/* Tabs con gráficos y tablas */}
        <Tabs defaultValue="tabla" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="tabla">🧾 Detalle de Ventas</TabsTrigger>
            <TabsTrigger value="metodos">💳 Métodos de Pago</TabsTrigger>
            <TabsTrigger value="tendencia">📈 Tendencia Diaria</TabsTrigger>
            <TabsTrigger value="productos">🔝 Top Productos</TabsTrigger>
            {isAdmin && <TabsTrigger value="ganancias">💰 Ganancias</TabsTrigger>}
          </TabsList>

          <TabsContent value="tabla" className="space-y-4">
            <SalesTable 
              ventas={ventasFiltradas} 
              loading={loading} 
              fechaInicio={fechaInicio} 
              fechaFin={fechaFin}
              onSaleDeleted={fetchVentasData}
            />
          </TabsContent>

          <TabsContent value="metodos" className="space-y-4">
            <PaymentMethodsChart data={dataPie} totalGeneral={totalGeneral} />
          </TabsContent>

          <TabsContent value="tendencia" className="space-y-4">
            <DailyTrendChart data={dataLineas} />
          </TabsContent>

          <TabsContent value="productos" className="space-y-4">
            <TopProductsChart data={topProductos} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="ganancias" className="space-y-4">
              <GananciasTable 
                fechaInicio={fechaInicio} 
                fechaFin={fechaFin} 
                data={gananciasData} 
                loading={loading || loadingProductos} 
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;