import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getVentas } from '@/lib/storage';
import { DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Dashboard = () => {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));

  const ventas = getVentas();

  const ventasFiltradas = useMemo(() => {
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));

    return ventas.filter(venta => {
      const fechaVenta = new Date(venta.fecha);
      return isWithinInterval(fechaVenta, { start: inicio, end: fin });
    });
  }, [ventas, fechaInicio, fechaFin]);

  const ventasHoy = useMemo(() => {
    const hoy = new Date();
    return ventas.filter(venta => {
      const fechaVenta = new Date(venta.fecha);
      return fechaVenta.toDateString() === hoy.toDateString();
    });
  }, [ventas]);

  const totalHoy = ventasHoy.reduce((sum, venta) => sum + venta.total, 0);
  const totalGeneral = ventas.reduce((sum, venta) => sum + venta.total, 0);

  const pagosPorMetodo = useMemo(() => {
    const metodos = { efectivo: 0, nequi: 0, daviplata: 0 };
    ventasFiltradas.forEach(venta => {
      metodos[venta.metodoPago] += venta.total;
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalHoy.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{ventasHoy.length} ventas realizadas</p>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Métodos de Pago</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Efectivo:</span>
                  <span className="font-medium">${pagosPorMetodo.efectivo.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nequi:</span>
                  <span className="font-medium">${pagosPorMetodo.nequi.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daviplata:</span>
                  <span className="font-medium">${pagosPorMetodo.daviplata.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    {ventasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No hay ventas en este rango de fechas
                        </td>
                      </tr>
                    ) : (
                      ventasFiltradas.map((venta) => (
                        <tr key={venta.id} className="border-b">
                          <td className="px-4 py-3 text-sm">
                            {format(new Date(venta.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                          </td>
                          <td className="px-4 py-3 text-sm">{venta.vendedor}</td>
                          <td className="px-4 py-3 text-sm capitalize">{venta.metodoPago}</td>
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
