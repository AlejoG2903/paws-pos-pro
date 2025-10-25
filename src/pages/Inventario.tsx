import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProductos, addProducto, updateProducto, deleteProducto } from '@/lib/storage';
import { Producto, Categoria } from '@/types';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CATEGORIAS: Categoria[] = ['Alimento', 'Accesorio', 'Juguetes', 'Medicamentos', 'Higiene'];

const Inventario = () => {
  const [productos, setProductos] = useState<Producto[]>(getProductos());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    stock: '',
    categoria: '' as Categoria | '',
    imagen: '',
  });

  const resetForm = () => {
    setFormData({ nombre: '', precio: '', stock: '', categoria: '', imagen: '' });
    setEditingProduct(null);
  };

  const handleOpenModal = (producto?: Producto) => {
    if (producto) {
      setEditingProduct(producto);
      setFormData({
        nombre: producto.nombre,
        precio: producto.precio.toString(),
        stock: producto.stock,
        categoria: producto.categoria,
        imagen: producto.imagen || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre || !formData.precio || !formData.stock || !formData.categoria) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const producto: Producto = {
      id: editingProduct?.id || Date.now().toString(),
      nombre: formData.nombre,
      precio: parseFloat(formData.precio),
      stock: formData.stock,
      categoria: formData.categoria as Categoria,
      imagen: formData.imagen || undefined,
    };

    if (editingProduct) {
      updateProducto(producto.id, producto);
      toast.success('Producto actualizado');
    } else {
      addProducto(producto);
      toast.success('Producto agregado');
    }

    setProductos(getProductos());
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      deleteProducto(id);
      setProductos(getProductos());
      toast.success('Producto eliminado');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Inventario</h2>
            <p className="text-muted-foreground">Gestiona los productos de tu petshop</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => (
            <Card key={producto.id}>
              <CardContent className="p-4">
                {producto.imagen && (
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                )}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{producto.nombre}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-medium">${producto.precio.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stock:</span>
                    <span className="font-medium">{producto.stock}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Categoría:</span>
                    <span className="font-medium">{producto.categoria}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenModal(producto)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(producto.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Alimento Premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio">Precio</Label>
                <Input
                  id="precio"
                  type="number"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Disponible</Label>
                <Input
                  id="stock"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="Ej: 15 unidades"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value as Categoria })}
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagen">URL de Imagen (opcional)</Label>
                <Input
                  id="imagen"
                  type="url"
                  value={formData.imagen}
                  onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Inventario;
