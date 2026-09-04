import { useEffect, useState } from 'react';
import { Search, ShieldAlert, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';

export default function AdminInstructores() {
  const toast = useToast();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await academyAPI.getAdminInstructors();
      setInstructors(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los instructores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await academyAPI.searchUsersForInstructor(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleAssign(userId: string) {
    if (instructors.find((i) => i.id === userId)) {
      toast.error('El usuario ya es instructor');
      return;
    }
    setActionLoading(userId);
    try {
      await academyAPI.assignInstructorRole(userId);
      toast.success('Instructor asignado correctamente');
      setSearchQuery('');
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Error al asignar el instructor');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevoke(userId: string) {
    if (!confirm('¿Estás seguro de revocar este rol? Si dicta un curso, podría perder acceso a gestionarlo.')) return;
    setActionLoading(userId);
    try {
      await academyAPI.revokeInstructorRole(userId);
      toast.success('Rol revocado');
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Error al revocar el rol');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Users className="text-[#D4AF37]" size={32} />
            Gestión de Instructores
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Asigna el rol de instructor a usuarios de la plataforma para que puedan crear y gestionar cursos.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Asignar nuevo instructor</h2>
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar usuario por nombre o email (mínimo 3 letras)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all duration-200"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-gray-50/50">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-medium text-gray-900">{user.nombre_completo}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  {user.rol === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mt-1">
                      <ShieldCheck size={12} /> Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleAssign(user.id)}
                  disabled={actionLoading === user.id}
                  className="flex items-center gap-2 px-4 py-2 bg-[#111111] text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm font-medium"
                >
                  <UserPlus size={18} />
                  Asignar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Instructores Activos</h2>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            {instructors.length}
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : instructors.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg">No hay instructores asignados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#111111] to-[#333333] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {instructor.nombre_completo.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{instructor.nombre_completo}</div>
                    <div className="text-sm text-gray-500">{instructor.email}</div>
                    {instructor.is_admin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mt-1">
                        <ShieldCheck size={12} /> Admin (implícito)
                      </span>
                    )}
                  </div>
                </div>
                
                {!instructor.is_admin ? (
                  <button
                    onClick={() => handleRevoke(instructor.id)}
                    disabled={actionLoading === instructor.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Revocar acceso de instructor"
                  >
                    <Trash2 size={20} />
                  </button>
                ) : (
                  <div className="px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-lg flex items-center gap-2" title="Los administradores siempre tienen acceso de instructor">
                    <ShieldAlert size={16} /> Intocable
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
