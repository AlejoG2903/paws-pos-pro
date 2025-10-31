import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productsAPI, categoriesAPI } from '@/lib/api';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
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
  cost: number;
  stock: number;
  barcode?: string;
  category_id: number;
  image_url?: string | null;
  image_base64?: string | null;
  is_active: boolean;
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    stock: '',
    category_id: '',
    barcode: '',
  });

  // 🔄 Cargar productos y categorías
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

  // 🔁 Reiniciar formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      stock: '',
      category_id: '',
      barcode: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingProduct(null);
  };

  // 🪟 Abrir modal (crear o editar)
  const handleOpenModal = (producto?: Product) => {
    if (producto) {
      setEditingProduct(producto);
      setFormData({
        name: producto.name,
        description: producto.description || '',
        price: producto.price.toString(),
        cost: producto.cost.toString(),
        stock: producto.stock.toString(),
        category_id: producto.category_id.toString(),
        barcode: producto.barcode || '',
      });

      // Mostrar imagen ya existente
      if (producto.image_url) {
        setImagePreview(producto.image_url);
      } else if (producto.image_base64) {
        setImagePreview(`data:image/jpeg;base64,${producto.image_base64}`);
      } else {
        setImagePreview(null);
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // 🖼️ Subir nueva imagen
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
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // 💾 Crear o editar producto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('cost', formData.cost || '0');
      formDataToSend.append('stock', formData.stock || '0');
      formDataToSend.append('category_id', formData.category_id);

      if (formData.description)
        formDataToSend.append('description', formData.description);
      if (formData.barcode)
        formDataToSend.append('barcode', formData.barcode);
      if (imageFile) formDataToSend.append('image', imageFile);

      if (editingProduct) {
        await productsAPI.updateWithImage(editingProduct.id, formDataToSend);
        toast.success('Producto actualizado');
      } else {
        await productsAPI.createWithImage(formDataToSend);
        toast.success('Producto agregado');
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      toast.error('Error: ' + (error as Error).message);
    }
  };

  // 🗑️ Eliminar producto
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

  // 📦 Obtener nombre de categoría
  const getCategoryName = (producto: Product) => {
    const categoria = categorias.find(
      (cat) => cat.id === producto.category_id
    );
    return categoria ? categoria.name : 'Sin categoría';
  };

  // 🖼️ Obtener imagen del producto
  const getProductImage = (producto: Product) => {
    if (producto.image_url) return producto.image_url;
    if (producto.image_base64)
      return `data:image/jpeg;base64,${producto.image_base64}`;
    return '/placeholder-image.png'; // Imagen por defecto
  };

  // 🌀 Loader mientras carga
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  // 🧩 Render principal
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Inventario</h2>
            <p className="text-muted-foreground">
              Gestiona los productos de tu petshop
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        </div>

        {/* 🧱 Lista de productos */}
        {productos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                No hay productos. Agrega tu primer producto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productos.map((producto) => (
              <Card key={producto.id}>
                <CardContent className="p-4">
                  <img
                    src={getProductImage(producto)}
                    alt={producto.name}
                    className="w-full h-48 object-cover rounded-md mb-4 bg-gray-100"
                  />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">
                      {producto.name}
                    </h3>
                    {producto.description && (
                      <p className="text-sm text-muted-foreground">
                        {producto.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Precio:
                      </span>
                      <span className="font-medium">
                        ${producto.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Stock:
                      </span>
                      <span className="font-medium">
                        {producto.stock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Categoría:
                      </span>
                      <span className="font-medium">
                        {getCategoryName(producto)}
                      </span>
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
        )}

        {/* 🧾 Modal de Crear/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct
                  ? 'Editar Producto'
                  : 'Agregar Producto'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Imagen */}
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
                      <span className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, WEBP (máx. 5MB)
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

              {/* Campos */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
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
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value,
                      })
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: e.target.value,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category_id: value,
                    })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id.toString()}
                      >
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
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Inventario;