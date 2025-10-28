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
  eachDayOfInterval,
  isSameMonth 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { salesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

// Colores para los gráficos
const COLORS = {
  efectivo: '#10b981',
  nequi: '#8b5cf6',
  daviplata: '#f59e0b',
  card: '#3b82f6',
  transfer: '#ec4899'
};

const Dashboard = () => {
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [rangoSeleccionado, setRangoSeleccionado] = useState('mes');
  const [ventas, setVentas] = useState<any[]>([]);
  const [ventasHoy, setVentasHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHoy, setLoadingHoy] = useState(false);

  // Obtener fechas del mes actual
  const mesInicio = startOfMonth(new Date());
  const mesFin = endOfMonth(new Date());

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        setLoading(true);
        const data = await salesAPI.getAll({
          start_date: `${fechaInicio}T00:00:00`,
          end_date: `${fechaFin}T23:59:59`,
        });
        setVentas(data);
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Error cargando las ventas');
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
        setVentasHoy(data);
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Error cargando las ventas de hoy');
      } finally {
        setLoadingHoy(false);
      }
    };

    fetchVentasHoy();
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
      case 'semana':
        const inicioSemana = startOfDay(addDays(hoy, -7));
        setFechaInicio(format(inicioSemana, 'yyyy-MM-dd'));
        setFechaFin(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'mes':
        setFechaInicio(format(startOfMonth(hoy), 'yyyy-MM-dd'));
        setFechaFin(format(endOfMonth(hoy), 'yyyy-MM-dd'));
        break;
      case 'mes_anterior':
        const mesAnterior = subMonths(hoy, 1);
        setFechaInicio(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'));
        setFechaFin(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  const ventasFiltradas = useMemo(() => {
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    return ventas.filter((venta) => {
      const fechaVenta = new Date(venta.created_at);
      return isWithinInterval(fechaVenta, { start: inicio, end: fin });
    });
  }, [ventas, fechaInicio, fechaFin]);

  // Estadísticas generales
  const totalGeneral = ventasFiltradas.reduce((sum, venta) => sum + venta.total, 0);
  const totalHoy = ventasHoy.reduce((sum, venta) => sum + venta.total, 0);
  const cantidadVentas = ventasFiltradas.length;
  const promedioVenta = cantidadVentas > 0 ? totalGeneral / cantidadVentas : 0;

  // Métodos de pago para TODO el rango seleccionado
  const pagosPorMetodo = useMemo(() => {
    const metodos = { efectivo: 0, nequi: 0, daviplata: 0, card: 0, transfer: 0 };
    ventasFiltradas.forEach((venta) => {
      const metodo = venta.payment_method?.toLowerCase();
      if (metodos[metodo] !== undefined) {
        metodos[metodo] += venta.total;
      }
    });
    return metodos;
  }, [ventasFiltradas]);

  // Datos para el gráfico de torta (TODO el rango)
  const dataPie = useMemo(() => {
    return Object.entries(pagosPorMetodo)
      .filter(([_, valor]) => valor > 0)
      .map(([metodo, valor]) => ({
        name: metodo.charAt(0).toUpperCase() + metodo.slice(1),
        value: valor,
        color: COLORS[metodo]
      }));
  }, [pagosPorMetodo]);

  // Datos para el gráfico de líneas (TODO el rango por día)
  const dataLineas = useMemo(() => {
    if (ventasFiltradas.length === 0) return [];

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Generar todos los días del rango
    const todosLosDias = eachDayOfInterval({ start: inicio, end: fin });
    
    // Crear estructura inicial con todos los días
    const ventasPorDia = todosLosDias.map(dia => {
      const fechaStr = format(dia, 'dd/MM', { locale: es });
      return {
        fecha: fechaStr,
        fechaCompleta: format(dia, 'yyyy-MM-dd'),
        total: 0,
        cantidad: 0,
        diaSemana: format(dia, 'EEEE', { locale: es })
      };
    });

    // Agrupar ventas por día
    ventasFiltradas.forEach(venta => {
      const fechaVenta = new Date(venta.created_at);
      const fechaStr = format(fechaVenta, 'dd/MM', { locale: es });
      const fechaCompleta = format(fechaVenta, 'yyyy-MM-dd');
      
      const diaEncontrado = ventasPorDia.find(dia => dia.fechaCompleta === fechaCompleta);
      if (diaEncontrado) {
        diaEncontrado.total += venta.total;
        diaEncontrado.cantidad += 1;
      }
    });

    return ventasPorDia;
  }, [ventasFiltradas, fechaInicio, fechaFin]);

  // Datos para gráfico de barras (métodos de pago por día)
  const dataBarras = useMemo(() => {
    if (ventasFiltradas.length === 0) return [];

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const todosLosDias = eachDayOfInterval({ start: inicio, end: fin });

    return todosLosDias.map(dia => {
      const fechaStr = format(dia, 'dd/MM', { locale: es });
      const fechaCompleta = format(dia, 'yyyy-MM-dd');
      
      // Filtrar ventas de este día
      const ventasDelDia = ventasFiltradas.filter(venta => {
        const fechaVenta = format(new Date(venta.created_at), 'yyyy-MM-dd');
        return fechaVenta === fechaCompleta;
      });

      // Calcular total por método de pago para este día
      const metodos = { efectivo: 0, nequi: 0, daviplata: 0, card: 0, transfer: 0 };
      ventasDelDia.forEach(venta => {
        const metodo = venta.payment_method?.toLowerCase();
        if (metodos[metodo] !== undefined) {
          metodos[metodo] += venta.total;
        }
      });

      return {
        fecha: fechaStr,
        ...metodos,
        total: ventasDelDia.reduce((sum, venta) => sum + venta.total, 0)
      };
    });
  }, [ventasFiltradas, fechaInicio, fechaFin]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de ventas y estadísticas</p>
        </div>

        {/* Selector de rango */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Rango de fechas:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={rangoSeleccionado} onValueChange={handleRangoChange}>
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
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full sm:w-auto"
                    />
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full sm:w-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjetas principales */}
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
                  <p className="text-xs text-muted-foreground">{ventasHoy.length} ventas realizadas</p>
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

          {/* Promedio por venta */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${promedioVenta.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Valor promedio por transacción</p>
            </CardContent>
          </Card>

          {/* Métodos de pogo más usado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Método Principal</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dataPie.length > 0 ? (
                <>
                  <div className="text-2xl font-bold capitalize">{dataPie[0]?.name}</div>
                  <p className="text-xs text-muted-foreground">
                    ${dataPie[0]?.value.toLocaleString()} total
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

        {/* Tabs con Tabla y Gráficos */}
        <Tabs defaultValue="metodos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metodos">🥧 Métodos de Pago</TabsTrigger>
            <TabsTrigger value="tendencia">📈 Tendencia Diaria</TabsTrigger>
            <TabsTrigger value="tabla">📊 Detalle de Ventas</TabsTrigger>
          </TabsList>

          {/* Pestaña de Gráfico de Torta */}
          <TabsContent value="metodos">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Método de Pago</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Porcentaje de ventas según método de pago utilizado en el período seleccionado
                </p>
              </CardHeader>
              <CardContent>
                {dataPie.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No hay datos disponibles para el rango seleccionado
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={400}>
                      <RechartsPie>
                        <Pie
                          data={dataPie}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dataPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']} />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                    
                    {/* Detalles de métodos de pago */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Detalles por Método</h4>
                      {dataPie.map((item, index) => (
                        <div key={item.name} className="flex justify-between items-center p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium capitalize">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${item.value.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {((item.value / totalGeneral) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Gráfico de Líneas */}
          <TabsContent value="tendencia">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ventas Diarias</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Evolución diaria de las ventas en el período seleccionado
                </p>
              </CardHeader>
              <CardContent>
                {dataLineas.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No hay datos disponibles para el rango seleccionado
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsLine data={dataLineas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="fecha" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Ventas del Día"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </RechartsLine>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Tabla */}
          <TabsContent value="tabla">
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Ventas</CardTitle>
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
                          <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Vendedor</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Método</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              Cargando ventas...
                            </td>
                          </tr>
                        ) : ventasFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              No hay ventas en este rango de fechas
                            </td>
                          </tr>
                        ) : (
                          ventasFiltradas.map((venta) => (
                            <tr key={venta.id} className="border-b hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm">
                                {format(new Date(venta.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </td>
                              <td className="px-4 py-3 text-sm">{venta.user?.full_name || '—'}</td>
                              <td className="px-4 py-3 text-sm capitalize">{venta.payment_method}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;