import { formatearNumero } from '@/lib/utils';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Loader2, Upload, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productsAPI, categoriesAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  cost: string;
  stock: number;
  barcode?: string;
  category_id: number;
  image_base64?: string | null;
  is_active: boolean;
  unidad_medida?: string;
  category?: Category;
}

const Inventario = () => {
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    stock: '',
    unit: 'unidad',
    category_id: '',
    barcode: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);

      const productosSeguros = productsData.map((product: any) => ({
        ...product,
        category:
          product.category || {
            id: 0,
            name: 'Sin categoría',
            description: '',
          },
      }));

      setProductos(productosSeguros);
      setCategorias(categoriesData);
    } catch (error) {
      toast.error('Error al cargar datos: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      stock: '',
      unit: 'unidad',
      category_id: '',
      barcode: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingProduct(null);
  };

  const handleOpenModal = (producto?: Product) => {
    if (producto) {
      setEditingProduct(producto);
      // Sanitizar valores: quitar decimales para edición
      const precioEntero = Math.floor(Number(producto.price || 0));
      const costoEntero = Math.floor(Number(producto.cost || 0));
      const stockEntero = Math.floor(Number(producto.stock || 0));
      setFormData({
        name: producto.name,
        description: producto.description || '',
        price: String(precioEntero),
        cost: String(costoEntero),
        stock: String(stockEntero),
        unit: producto.unidad_medida || 'unidad',
        category_id: producto.category_id.toString(),
        barcode: producto.barcode || '',
      });
      if (producto.image_base64)
        setImagePreview(`data:image/jpeg;base64,${producto.image_base64}`);
      else setImagePreview(null);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', formData.price);
      data.append('cost', formData.cost || '0');
      data.append('stock', formData.stock || '0');
      data.append('unidad_medida', formData.unit);
      data.append('category_id', formData.category_id);
      if (formData.description) data.append('description', formData.description);
      if (formData.barcode) data.append('barcode', formData.barcode);
      if (imageFile) data.append('image', imageFile);

      if (editingProduct) {
        await productsAPI.updateWithImage(editingProduct.id, data);
        toast.success('Producto actualizado');
      } else {
        await productsAPI.createWithImage(data);
        toast.success('Producto agregado');
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      toast.error('Error: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productsAPI.delete(id);
        toast.success('Producto eliminado');
        await loadData();
      } catch (error) {
        toast.error('Error al eliminar: ' + (error as Error).message);
      }
    }
  };

  const getCategoryName = (producto: Product) => {
    const categoria = categorias.find(
      (cat) => cat.id === producto.category_id
    );
    return categoria ? categoria.name : 'Sin categoría';
  };

  const getProductImage = (producto: Product) =>
    producto.image_base64
      ? `data:image/jpeg;base64,${producto.image_base64}`
      : '/placeholder-image.png';

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
      <div className="space-y-6">
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Inventario</h2>
            <p className="text-muted-foreground">
              Gestiona los productos de tu petshop
            </p>
          </div>

          {/* FILTROS + BOTÓN */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            {/* BUSCADOR */}
            <div className="relative w-[180px]">
              <Input
                placeholder="Buscar Producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* FILTRO CATEGORÍAS */}
            <div className="relative w-[180px]">
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v)}
              >
                <SelectTrigger
                  className={`w-full pr-8 ${
                    categoryFilter === 'all'
                      ? 'text-muted-foreground'
                      : 'text-foreground'
                  }`}
                >
                  <SelectValue placeholder="Categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </div>
        </div>

        {/* TABLA */}
        {productos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No hay productos. Agrega tu primer producto.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="py-2 px-3">Imagen</th>
                    <th className="py-2 px-2">Nombre</th>
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3">Precio</th>
                    <th className="py-2 px-3">Stock</th>
                    <th className="py-2 px-3">Categoría</th>
                    <th className="py-2 px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productos
                    .filter((p) => {
                      const q = searchQuery.trim().toLowerCase();
                      const matchesSearch =
                        !q ||
                        p.name.toLowerCase().includes(q) ||
                        (p.barcode || '').toLowerCase().includes(q);
                      const matchesCategory =
                        categoryFilter === 'all' ||
                        p.category_id.toString() === categoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .map((producto) => (
                      <tr key={producto.id}>
                        <td className="py-3 px-3 w-28">
                          <img
                            src={getProductImage(producto)}
                            alt={producto.name}
                            className="w-20 h-20 object-cover rounded-md bg-gray-100"
                          />
                        </td>
                        <td className="py-2 px-2 max-w-[200px]">
                          <div className="font-medium text-base truncate">
                            {producto.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-muted-foreground">
                          {producto.description || '-'}
                        </td>
                        <td className="py-3 px-3">
                          ${formatearNumero(producto.price)}
                        </td>
                        <td className="py-3 px-3">
                          {producto.unidad_medida === 'kg' 
                            ? formatearNumero(producto.stock, 1) 
                            : formatearNumero(producto.stock)} {producto.unidad_medida || 'unidad'}
                        </td>
                        <td className="py-3 px-3">
                          {getCategoryName(producto)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
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
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
            </DialogTitle>
          </DialogHeader>

          {/* FORMULARIO (idéntico al tuyo) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Imagen del Producto</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-gray-50 rounded-md transition">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click para subir imagen
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Alimento Premium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio *</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, price: value });
                }}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Costo</Label>
              <Input
                id="cost"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.cost}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, cost: value });
                }}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <div className="flex gap-2">
                <Input
                  id="stock"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.stock}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, stock: value });
                  }}
                  placeholder="0"
                  className="flex-1"
                />

                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingProduct ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Inventario;
