import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval,addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { salesAPI } from '@/lib/api';
import { toast } from 'sonner';


const Dashboard = () => {
const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
const [fechaFin, setFechaFin] = useState(
  format(addDays(new Date(), 1), 'yyyy-MM-dd')
);
  const [ventas, setVentas] = useState<any[]>([]);
  const [ventasHoy, setVentasHoy] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [loadingHoy, setLoadingHoy] = useState(false);

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

  const ventasFiltradas = useMemo(() => {
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    return ventas.filter((venta) => {
      const fechaVenta = new Date(venta.created_at);
      return isWithinInterval(fechaVenta, { start: inicio, end: fin });
    });
  }, [ventas, fechaInicio, fechaFin]);

  const totalGeneral = ventas.reduce((sum, venta) => sum + venta.total, 0);
  const totalHoy = ventasHoy.reduce((sum, venta) => sum + venta.total, 0);

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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de ventas y estadísticas</p>
        </div>

        {/* Tarjetas principales */}
        <div className="grid gap-4 md:grid-cols-3">
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

          {/* Total general */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalGeneral.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{ventas.length} ventas totales</p>
            </CardContent>
          </Card>

          {/* Métodos de pago */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Métodos de Pago</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(pagosPorMetodo).map(([metodo, valor]) => (
                  <div key={metodo} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{metodo}:</span>
                    <span className="font-medium">${valor.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de ventas */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Ventas</CardTitle>
            <div className="grid gap-4 md:grid-cols-2 pt-4">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha Fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
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
                        <tr key={venta.id} className="border-b">
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
      </div>
    </Layout>
  );
};

export default Dashboard;
