import { useEffect, useState } from 'react';
import { Calendar, Clock, ExternalLink, PlayCircle } from 'lucide-react';
import { useSEO } from '../../lib/seo';
import { academyAPI } from '../../lib/academy';

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string | null;
  video_provider: string | null;
  video_external_id: string | null;
  video_url: string | null;
  duration_seconds: number | null;
}

export default function BibliotecaLives() {
  useSEO({ title: 'Biblioteca de Lives — Academia Sumak' });
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    academyAPI.getAvailableLives().then((data) => setSessions(data as LiveSession[])).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  function watchUrl(session: LiveSession) {
    if (session.video_url) return session.video_url;
    if (session.video_provider === 'youtube' && session.video_external_id) return `https://www.youtube.com/watch?v=${session.video_external_id}`;
    return null;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-black text-gray-900">Biblioteca de Lives</h1><p className="text-gray-500 mt-1">Grabaciones de sesiones en vivo y masterclasses.</p></div>
      {loading ? <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center text-gray-500">Cargando biblioteca...</div> : error ? <div className="bg-white rounded-2xl border border-red-200 p-12 text-center text-red-600">No se pudo cargar la biblioteca.</div> : sessions.length === 0 ? <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center shadow-sm"><PlayCircle size={40} className="text-[#1A4E26] mx-auto mb-4" /><h2 className="text-xl font-bold text-gray-900">Aún no hay grabaciones</h2><p className="text-gray-500 mt-2">Las sesiones publicadas aparecerán aquí.</p></div> : <div className="grid md:grid-cols-2 gap-4">{sessions.map((session) => { const url = watchUrl(session); return <article key={session.id} className="bg-white rounded-2xl border border-[#C8D8CB] overflow-hidden shadow-sm"><div className="h-32 bg-[#EBF4ED] flex items-center justify-center"><PlayCircle size={48} className="text-[#1A4E26]" /></div><div className="p-5"><h2 className="font-bold text-lg text-gray-900">{session.title}</h2><p className="text-sm text-gray-500 mt-2 line-clamp-3">{session.description || 'Sesión de formación Academy.'}</p><div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-4">{session.session_date && <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(session.session_date).toLocaleDateString('es-EC')}</span>}{session.duration_seconds && <span className="flex items-center gap-1"><Clock size={14} /> {Math.round(session.duration_seconds / 60)} min</span>}</div>{url && <a href={url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#1A4E26] hover:underline">Ver grabación <ExternalLink size={15} /></a>}</div></article>; })}</div>}
    </div>
  );
}
