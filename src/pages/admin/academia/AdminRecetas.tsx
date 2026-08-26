import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Search, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '../../../lib/toast';

interface Recipe {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pdf_url: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminRecetas() {
  const toast = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(5.00);
  const [isActive, setIsActive] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  async function fetchRecipes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('academy_recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast.error('Error al cargar recetas');
    } finally {
      setLoading(false);
    }
  }

  function openNewModal() {
    setEditingRecipe(null);
    setTitle('');
    setDescription('');
    setPrice(5.00);
    setIsActive(true);
    setCoverFile(null);
    setPdfFile(null);
    setIsModalOpen(true);
  }

  function openEditModal(recipe: Recipe) {
    setEditingRecipe(recipe);
    setTitle(recipe.title);
    setDescription(recipe.description || '');
    setPrice(recipe.price);
    setIsActive(recipe.is_active);
    setCoverFile(null);
    setPdfFile(null);
    setIsModalOpen(true);
  }

  async function uploadFile(file: File, bucket: string, path: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function uploadPrivateFile(file: File, bucket: string, recipeId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `receta_${Date.now()}.${fileExt}`;
    const filePath = `${recipeId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return filePath;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!editingRecipe && !pdfFile) {
      toast.error('Debe subir un archivo PDF para la nueva receta');
      return;
    }

    try {
      setIsSaving(true);
      
      let finalCoverUrl = editingRecipe?.cover_image_url;
      let finalPdfUrl = editingRecipe?.pdf_url;

      // Generar un ID temporal si es nueva, para usar en la ruta del bucket
      const recipeId = editingRecipe?.id || crypto.randomUUID();

      if (coverFile) {
        finalCoverUrl = await uploadFile(coverFile, 'academy-content', 'recipes/covers');
      }

      if (pdfFile) {
        finalPdfUrl = await uploadPrivateFile(pdfFile, 'academy-recipes', recipeId);
      }

      const recipeData = {
        id: recipeId, // Force ID to match bucket path
        title,
        description,
        price,
        is_active: isActive,
        ...(finalCoverUrl && { cover_image_url: finalCoverUrl }),
        ...(finalPdfUrl && { pdf_url: finalPdfUrl }),
      };

      if (editingRecipe) {
        const { error } = await supabase
          .from('academy_recipes')
          .update(recipeData)
          .eq('id', editingRecipe.id);
        if (error) throw error;
        toast.success('Receta actualizada con éxito');
      } else {
        const { error } = await supabase
          .from('academy_recipes')
          .insert([recipeData]);
        if (error) throw error;
        toast.success('Receta creada con éxito');
      }

      setIsModalOpen(false);
      fetchRecipes();
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      toast.error(error.message || 'Error al guardar la receta');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(recipe: Recipe) {
    if (!confirm(`¿Estás seguro de eliminar la receta "${recipe.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('academy_recipes')
        .delete()
        .eq('id', recipe.id);

      if (error) throw error;
      toast.success('Receta eliminada');
      fetchRecipes();
    } catch (error: any) {
      console.error('Error deleting recipe:', error);
      toast.error('Error al eliminar la receta');
    }
  }

  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Recetas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Administra las recetas milenarias disponibles en la Academia.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-[#1A4E26] text-white px-4 py-2 rounded-lg hover:bg-[#163F1E] transition-colors"
        >
          <Plus size={20} />
          Nueva Receta
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A4E26] focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Portada</th>
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Cargando recetas...
                  </td>
                </tr>
              ) : filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron recetas.
                  </td>
                </tr>
              ) : (
                filteredRecipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {recipe.cover_image_url ? (
                        <img src={recipe.cover_image_url} alt={recipe.title} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{recipe.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{recipe.description}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ${recipe.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        recipe.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {recipe.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(recipe)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(recipe)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingRecipe ? 'Editar Receta' : 'Nueva Receta'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A4E26]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A4E26]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A4E26]"
                  />
                </div>
                
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5 h-5 text-[#1A4E26] rounded border-gray-300 focus:ring-[#1A4E26]"
                    />
                    <span className="text-sm font-medium text-gray-700">Receta Activa</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagen de Portada
                </label>
                <div className="flex items-center gap-4">
                  {editingRecipe?.cover_image_url && !coverFile && (
                    <img src={editingRecipe.cover_image_url} alt="Portada actual" className="w-16 h-16 rounded object-cover border" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1A4E26]/10 file:text-[#1A4E26] hover:file:bg-[#1A4E26]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archivo PDF de la Receta {editingRecipe ? '' : <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-4">
                  {editingRecipe?.pdf_url && !pdfFile && (
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                      <FileText size={20} />
                      <span className="text-sm font-medium">PDF subido</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    required={!editingRecipe}
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Este PDF será guardado de forma privada y solo accesible tras el pago.</p>
              </div>

            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#1A4E26] text-white font-medium rounded-lg hover:bg-[#163F1E] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? 'Guardando...' : 'Guardar Receta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
