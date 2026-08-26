import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Download, FileText, Leaf } from 'lucide-react';
import { useToast } from '../../../lib/toast';

interface PurchasedRecipe {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  pdf_url: string;
}

export default function MisRecetas() {
  const { profile } = useAuth();
  const toast = useToast();
  const [recipes, setRecipes] = useState<PurchasedRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyRecipes() {
      if (!profile) return;
      try {
        // Obtenemos compras aprobadas
        const { data: purchases, error: purchaseError } = await supabase
          .from('academy_recipe_purchases')
          .select(`
            status,
            items:academy_recipe_purchase_items(
              recipe:academy_recipes(
                id, title, description, cover_image_url, pdf_url
              )
            )
          `)
          .eq('user_id', profile.id)
          .eq('status', 'approved');

        if (purchaseError) throw purchaseError;

        // Extraer las recetas únicas
        const uniqueRecipes = new Map<string, PurchasedRecipe>();
        purchases?.forEach(p => {
          (p.items as any[])?.forEach(item => {
            if (item.recipe && !uniqueRecipes.has(item.recipe.id)) {
              uniqueRecipes.set(item.recipe.id, item.recipe);
            }
          });
        });

        setRecipes(Array.from(uniqueRecipes.values()));
      } catch (error) {
        console.error('Error fetching recipes:', error);
        toast.error('Error al cargar tus recetas');
      } finally {
        setLoading(false);
      }
    }

    fetchMyRecipes();
  }, [profile]);

  async function handleDownload(pdf_url: string) {
    try {
      toast.info('Generando enlace seguro...');
      const { data, error } = await supabase.storage
        .from('academy-recipes')
        .createSignedUrl(pdf_url, 60 * 5); // 5 minutos

      if (error) throw error;
      toast.success('¡Descarga iniciada!');
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading recipe:', error);
      toast.error('No se pudo descargar la receta.');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-10 h-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Mis Recetas</h1>
        <p className="text-gray-500 mt-1">Recetas de biomedicina ancestral desbloqueadas.</p>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-[#EBF4ED] rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf size={40} className="text-[#1A4E26]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Aún no tienes recetas</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Explora nuestro catálogo para adquirir recetas y aprender sobre medicina funcional.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden border border-[#C8D8CB] shadow-sm flex flex-col">
              <div className="aspect-[4/3] bg-gray-100 relative">
                {recipe.cover_image_url ? (
                  <img src={recipe.cover_image_url} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <FileText size={48} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium">Receta en PDF</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26] bg-[#1A4E26]/10 px-2 py-0.5 rounded">
                    Dr. Luis Paredes
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-2 mt-2 mb-2">{recipe.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 flex-1">{recipe.description}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleDownload(recipe.pdf_url)}
                    className="w-full flex items-center justify-center gap-2 bg-[#1A4E26] text-white py-2.5 rounded-xl font-bold hover:bg-[#163F1E] transition-colors"
                  >
                    <Download size={18} /> Descargar PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
