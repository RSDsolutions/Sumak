import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileCheck,
  Users,
  DollarSign,
  ShoppingCart,
  ArrowRight,
  BookOpen,
  Award,
  Wallet,
  GraduationCap,
  Building2,
  AlertCircle,
  CheckCircle2,
  Package,
  Network,
  Trophy,
  UserCog,
  Layers,
  Leaf,
  Video,
  UserCheck,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { logger } from '../../lib/logger';
import type { Afiliacion } from '../../lib/types';

interface AdminKpisRpc {
  afiliaciones_pendientes: number;
  distribuidores_activos: number;
  comisiones_pendientes_monto: string | number;
  pedidos_mes_count: number;
}

interface RecentEnrollmentItem {
  id: string;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  course?: { title?: string | null } | null;
  profile?: { nombre_completo?: string | null; email?: string | null } | null;
}

interface DashboardStats {
  // Plataforma Comercial
  solicitudesPendientes: number;
  distribuidoresActivos: number;
  comisionesPendientes: number;
  pedidosMes: number;
  pedidosPorProcesar: number;
  // Academia SUMAK
  cursosPublicados: number;
  totalCursos: number;
  programasPublicados: number;
  inscripcionesActivas: number;
  inscripcionesCompletadas: number;
  cobrosAcademiaPendientes: number;
  credencialesEmitidas: number;
}

type FocusMode = 'all' | 'plataforma' | 'academia';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function initialsFrom(name?: string | null): string {
  if (!name) return 'SU';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function KpiCard({
  to,
  label,
  value,
  sub,
  icon,
  iconBg,
  urgent = false,
  accentBorder,
  delay = 0,
}: {
  to: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  urgent?: boolean;
  accentBorder?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link
        to={to}
        className={`group block h-full bg-white rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(11,41,19,0.09)] ${
          urgent
            ? 'border-amber-300 ring-1 ring-amber-200/70'
            : accentBorder ?? 'border-[#DCE7DF] hover:border-[#1A4E26]/40'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          {urgent ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              <AlertCircle size={10} /> Atender
            </span>
          ) : (
            <span className="text-[#1A4E26] opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg bg-[#EBF4ED]">
              <ArrowRight size={13} />
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="font-heading font-extrabold text-2xl sm:text-[26px] text-[#0F1F14] mt-1 tracking-tight">
          {value}
        </p>
        <p className="text-[11px] text-slate-400 mt-1.5 truncate">{sub}</p>
      </Link>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recientes, setRecientes] = useState<Afiliacion[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<FocusMode>('all');
  const [launcherTab, setLauncherTab] = useState<'plataforma' | 'academia'>('plataforma');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [
          kpisRes,
          recentAffRes,
          pedidosProcRes,
          cursosRes,
          programasRes,
          enrollActiveRes,
          enrollCompRes,
          enrollPayRes,
          recipePayRes,
          credRes,
          latestEnrollRes,
        ] = await Promise.all([
          supabase.rpc('admin_kpis'),
          supabase.from('afiliaciones').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'procesando'),
          supabase.from('academy_courses').select('id, status'),
          supabase.from('academy_programs').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('academy_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('academy_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase
            .from('academy_enrollments')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'payment_pending']),
          supabase
            .from('academy_recipe_purchases')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'processing']),
          supabase
            .from('academy_diploma_issuances')
            .select('id', { count: 'exact', head: true })
            .not('status', 'in', '(revoked,superseded,invalidated)'),
          supabase
            .from('academy_enrollments')
            .select('id, user_id, status, progress_percentage, enrolled_at, course:course_id(title)')
            .order('enrolled_at', { ascending: false })
            .limit(5),
        ]);

        if (!mounted) return;

        if (kpisRes.error) {
          logger.error('admin_kpis error', kpisRes.error);
        }

        const kpis = (kpisRes.data ?? {}) as AdminKpisRpc;
        const allCourses = (cursosRes.data ?? []) as { id: string; status: string }[];
        const cursosPublicados = allCourses.filter((c) => c.status === 'published').length;

        // Fetch student profiles for latest enrollments
        const rawEnrollments = (latestEnrollRes.data ?? []) as any[];
        const userIds = Array.from(new Set(rawEnrollments.map((e) => e.user_id).filter(Boolean)));
        const profileMap = new Map<string, { nombre_completo?: string | null; email?: string | null }>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, nombre_completo, email')
            .in('id', userIds);
          (profs ?? []).forEach((p: any) => profileMap.set(p.id, p));
        }

        if (!mounted) return;

        setStats({
          solicitudesPendientes: Number(kpis.afiliaciones_pendientes ?? 0),
          distribuidoresActivos: Number(kpis.distribuidores_activos ?? 0),
          comisionesPendientes: Number(kpis.comisiones_pendientes_monto ?? 0),
          pedidosMes: Number(kpis.pedidos_mes_count ?? 0),
          pedidosPorProcesar: pedidosProcRes.count ?? 0,
          cursosPublicados,
          totalCursos: allCourses.length,
          programasPublicados: programasRes.count ?? 0,
          inscripcionesActivas: enrollActiveRes.count ?? 0,
          inscripcionesCompletadas: enrollCompRes.count ?? 0,
          cobrosAcademiaPendientes: (enrollPayRes.count ?? 0) + (recipePayRes.count ?? 0),
          credencialesEmitidas: credRes.count ?? 0,
        });

        setRecientes((recentAffRes.data ?? []) as Afiliacion[]);
        setRecentEnrollments(
          rawEnrollments.map((e) => ({
            id: e.id,
            status: e.status,
            progress_percentage: Number(e.progress_percentage ?? 0),
            enrolled_at: e.enrolled_at,
            course: e.course,
            profile: profileMap.get(e.user_id) ?? null,
          }))
        );
      } catch (err) {
        logger.error('AdminDashboard load error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('es-EC', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const estadoAfiliacionBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-50 text-amber-700 border border-amber-200',
      aprobada: 'bg-emerald-50 text-[#1A4E26] border border-emerald-200',
      rechazada: 'bg-red-50 text-red-700 border border-red-200',
    };
    return map[estado] ?? 'bg-slate-100 text-slate-600';
  };

  const estadoMatriculaBadge = (status: string) => {
    if (status === 'completed') return { label: 'Completado', cls: 'bg-emerald-50 text-[#1A4E26] border border-emerald-200' };
    if (status === 'active') return { label: 'En curso', cls: 'bg-sky-50 text-sky-700 border border-sky-200' };
    if (status === 'payment_pending' || status === 'pending') {
      return { label: 'Pago pendiente', cls: 'bg-amber-50 text-amber-800 border border-amber-200' };
    }
    return { label: status, cls: 'bg-slate-100 text-slate-600' };
  };

  const firstName = profile?.nombre_completo?.split(' ')[0] || 'Administrador';
  const totalUrgent =
    (stats?.solicitudesPendientes ?? 0) +
    (stats?.pedidosPorProcesar ?? 0) +
    (stats?.cobrosAcademiaPendientes ?? 0);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-44 rounded-3xl bg-[#0B2915]/10 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-white border border-[#DCE7DF] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-8">
      {/* ── 1. HERO EXECUTIVE BANNER ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071D0F] via-[#0F321A] to-[#1A4E26] text-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(7,29,15,0.22)]"
      >
        {/* Decorative Gold & Emerald Glows */}
        <div className="pointer-events-none absolute -top-24 right-10 w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#E8C94A] text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={11} /> Centro de Comando SUMAK
              </span>
              <span className="text-xs text-emerald-100/70 capitalize">{todayFormatted}</span>
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Supervisa en tiempo real la operación comercial de la red multinivel y el crecimiento de tu campus virtual desde un solo lugar.
            </p>
          </div>

          {/* Quick Hero Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/admin/academia/cursos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E8C94A] to-[#D4AF37] text-[#071D0F] font-extrabold text-xs hover:brightness-105 transition shadow-lg"
            >
              <Plus size={15} /> Crear Curso
            </Link>
            <Link
              to="/admin/pedidos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition"
            >
              <ShoppingCart size={14} /> Pedidos
            </Link>
            <Link
              to="/admin/academia/diplomas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition"
            >
              <Award size={14} className="text-[#E8C94A]" /> Diplomas
            </Link>
          </div>
        </div>

        {/* Live Action Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/12 flex flex-wrap items-center gap-2.5">
          {totalUrgent === 0 ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-400/15 border border-emerald-300/25 text-emerald-100 text-xs font-semibold">
              <CheckCircle2 size={14} className="text-emerald-300" />
              Operación al día — no hay solicitudes, pedidos ni cobros pendientes por revisar.
            </div>
          ) : (
            <>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/70 mr-1">
                Pendientes hoy:
              </span>
              {(stats?.solicitudesPendientes ?? 0) > 0 && (
                <Link
                  to="/admin/solicitudes"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/35 text-amber-100 text-xs font-bold transition"
                >
                  <FileCheck size={13} className="text-amber-300" />
                  {stats?.solicitudesPendientes} solicitud{stats?.solicitudesPendientes !== 1 ? 'es' : ''} de afiliación
                  <ArrowRight size={12} />
                </Link>
              )}
              {(stats?.pedidosPorProcesar ?? 0) > 0 && (
                <Link
                  to="/admin/pedidos"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-400/20 hover:bg-sky-400/30 border border-sky-300/35 text-sky-100 text-xs font-bold transition"
                >
                  <Package size={13} className="text-sky-300" />
                  {stats?.pedidosPorProcesar} pedido{stats?.pedidosPorProcesar !== 1 ? 's' : ''} por despachar
                  <ArrowRight size={12} />
                </Link>
              )}
              {(stats?.cobrosAcademiaPendientes ?? 0) > 0 && (
                <Link
                  to="/admin/academia/cobros"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#D4AF37]/25 hover:bg-[#D4AF37]/35 border border-[#E8C94A]/40 text-[#FDF6DC] text-xs font-bold transition"
                >
                  <Wallet size={13} className="text-[#E8C94A]" />
                  {stats?.cobrosAcademiaPendientes} cobro{stats?.cobrosAcademiaPendientes !== 1 ? 's' : ''} de Academia
                  <ArrowRight size={12} />
                </Link>
              )}
            </>
          )}
        </div>
      </motion.section>

      {/* ── 2. FOCUS FILTER TABS ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-lg text-[#111111]">Indicadores en Tiempo Real</h2>
          <p className="text-xs text-slate-500">Filtra por ecosistema o visualiza la operación completa.</p>
        </div>
        <div className="inline-flex bg-white p-1 rounded-2xl border border-[#DCE7DF] shadow-2xs w-fit">
          {(
            [
              { id: 'all', label: 'Todo el Ecosistema' },
              { id: 'plataforma', label: 'Plataforma Comercial', icon: <Building2 size={13} /> },
              { id: 'academia', label: 'Academia SUMAK', icon: <GraduationCap size={13} /> },
            ] as { id: FocusMode; label: string; icon?: React.ReactNode }[]
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFocus(f.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                focus === f.id
                  ? 'bg-[#1A4E26] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#111111]'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. PLATAFORMA COMERCIAL KPIs ─────────────────────────────────── */}
      {(focus === 'all' || focus === 'plataforma') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center">
                <Building2 size={15} />
              </span>
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-[#1A4E26]">
                Plataforma Comercial y Red MLM
              </h3>
            </div>
            <Link
              to="/admin/distribuidores"
              className="text-xs font-bold text-[#1A4E26] hover:underline inline-flex items-center gap-1"
            >
              Ver red comercial <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              to="/admin/solicitudes"
              label="Solicitudes Pendientes"
              value={(stats?.solicitudesPendientes ?? 0).toLocaleString('es-EC')}
              sub="Nuevos distribuidores por aprobar"
              icon={<FileCheck size={20} className="text-amber-600" />}
              iconBg="bg-amber-50 border border-amber-200/70"
              urgent={(stats?.solicitudesPendientes ?? 0) > 0}
              delay={0.03}
            />
            <KpiCard
              to="/admin/distribuidores"
              label="Distribuidores Activos"
              value={(stats?.distribuidoresActivos ?? 0).toLocaleString('es-EC')}
              sub="Socios habilitados en red binaria"
              icon={<Users size={20} className="text-[#1A4E26]" />}
              iconBg="bg-[#EBF4ED] border border-[#C8D8CB]"
              delay={0.06}
            />
            <KpiCard
              to="/admin/comisiones"
              label="Comisiones por Pagar"
              value={`$${(stats?.comisionesPendientes ?? 0).toFixed(2)}`}
              sub="Pendientes de liquidación y voucher"
              icon={<DollarSign size={20} className="text-[#92680A]" />}
              iconBg="bg-[#FEF6E9] border border-[#E8C97A]/70"
              delay={0.09}
            />
            <KpiCard
              to="/admin/pedidos"
              label="Pedidos Este Mes"
              value={(stats?.pedidosMes ?? 0).toLocaleString('es-EC')}
              sub={
                (stats?.pedidosPorProcesar ?? 0) > 0
                  ? `${stats?.pedidosPorProcesar} esperando despacho`
                  : 'Todos los despachos al día'
              }
              icon={<ShoppingCart size={20} className="text-sky-600" />}
              iconBg="bg-sky-50 border border-sky-200/70"
              urgent={(stats?.pedidosPorProcesar ?? 0) > 0}
              delay={0.12}
            />
          </div>
        </div>
      )}

      {/* ── 4. ACADEMIA SUMAK KPIs ───────────────────────────────────────── */}
      {(focus === 'all' || focus === 'academia') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-[#FEF6E9] text-[#92680A] flex items-center justify-center border border-[#E8C97A]/60">
                <GraduationCap size={15} />
              </span>
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-[#8A5A00]">
                Academia SUMAK · Campus Virtual
              </h3>
            </div>
            <Link
              to="/admin/academia/cursos"
              className="text-xs font-bold text-[#8A5A00] hover:underline inline-flex items-center gap-1"
            >
              Gestionar academia <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              to="/admin/academia/cursos"
              label="Cursos Publicados"
              value={`${stats?.cursosPublicados ?? 0} / ${stats?.totalCursos ?? 0}`}
              sub={`${stats?.programasPublicados ?? 0} programa${stats?.programasPublicados !== 1 ? 's' : ''} de especialización activos`}
              icon={<BookOpen size={20} className="text-[#1A4E26]" />}
              iconBg="bg-[#EBF4ED] border border-[#C8D8CB]"
              delay={0.14}
            />
            <KpiCard
              to="/admin/academia/inscripciones"
              label="Estudiantes Activos"
              value={(stats?.inscripcionesActivas ?? 0).toLocaleString('es-EC')}
              sub={`${stats?.inscripcionesCompletadas ?? 0} cursos completados al 100%`}
              icon={<UserCheck size={20} className="text-emerald-700" />}
              iconBg="bg-emerald-50 border border-emerald-200/70"
              delay={0.17}
            />
            <KpiCard
              to="/admin/academia/cobros"
              label="Cobros por Validar"
              value={(stats?.cobrosAcademiaPendientes ?? 0).toLocaleString('es-EC')}
              sub="Transferencias de cursos y recetas"
              icon={<Wallet size={20} className="text-amber-700" />}
              iconBg="bg-amber-50 border border-amber-200/70"
              urgent={(stats?.cobrosAcademiaPendientes ?? 0) > 0}
              delay={0.2}
            />
            <KpiCard
              to="/admin/academia/diplomas"
              label="Certificados y Diplomas"
              value={(stats?.credencialesEmitidas ?? 0).toLocaleString('es-EC')}
              sub="Credenciales válidas con QR público"
              icon={<Award size={20} className="text-[#92680A]" />}
              iconBg="bg-[#FEF6E9] border border-[#E8C97A]/70"
              delay={0.23}
            />
          </div>
        </div>
      )}

      {/* ── 5. TWO-COLUMN ACTIVITY & QUICK LAUNCHER CENTER ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Affiliations + Recent Academy Activity */}
        <div className="lg:col-span-7 space-y-6">
          {/* Solicitudes Recientes */}
          <div className="bg-white border border-[#DCE7DF] rounded-3xl shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBF0EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileCheck size={16} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-sm text-[#111111]">
                    Solicitudes de Afiliación Recientes
                  </h2>
                  <p className="text-[11px] text-slate-400">Últimos prospectos registrados en Plataforma</p>
                </div>
              </div>
              <Link
                to="/admin/solicitudes"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] hover:underline"
              >
                Ver todas <ArrowRight size={13} />
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                No hay solicitudes de afiliación registradas aún.
              </div>
            ) : (
              <div className="divide-y divide-[#F0F4F1]">
                {recientes.map((a) => (
                  <Link
                    key={a.id}
                    to={`/admin/solicitudes/${a.id}`}
                    className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#F7FAF8] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#EBF4ED] text-[#1A4E26] font-extrabold text-xs flex items-center justify-center shrink-0">
                      {initialsFrom(a.nombre_completo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#111111] truncate group-hover:text-[#1A4E26] transition-colors">
                        {a.nombre_completo}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {a.email} · <span className="capitalize font-semibold text-slate-700">{a.paquete_seleccionado}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${estadoAfiliacionBadge(a.estado)}`}>
                        {a.estado}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {new Date(a.created_at).toLocaleDateString('es-EC')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Actividad Reciente Academia */}
          <div className="bg-white border border-[#DCE7DF] rounded-3xl shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBF0EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF6E9] text-[#92680A] flex items-center justify-center">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-sm text-[#111111]">
                    Actividad Reciente en Academia
                  </h2>
                  <p className="text-[11px] text-slate-400">Últimas matrículas y avances de estudiantes</p>
                </div>
              </div>
              <Link
                to="/admin/academia/inscripciones"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] hover:underline"
              >
                Ver inscripciones <ArrowRight size={13} />
              </Link>
            </div>

            {recentEnrollments.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">
                Aún no hay matrículas recientes en la academia.
              </div>
            ) : (
              <div className="divide-y divide-[#F0F4F1]">
                {recentEnrollments.map((enr) => {
                  const badge = estadoMatriculaBadge(enr.status);
                  const studentName = enr.profile?.nombre_completo || enr.profile?.email || 'Estudiante SUMAK';
                  return (
                    <Link
                      key={enr.id}
                      to={
                        enr.status === 'payment_pending' || enr.status === 'pending'
                          ? '/admin/academia/cobros'
                          : '/admin/academia/inscripciones'
                      }
                      className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#F7FAF8] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FEF6E9] text-[#92680A] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#E8C97A]/50">
                        {initialsFrom(studentName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#111111] truncate group-hover:text-[#1A4E26]">
                          {studentName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {enr.course?.title || 'Curso SUMAK Academy'} · Avance{' '}
                          <strong className="text-[#1A4E26]">{Math.round(enr.progress_percentage)}%</strong>
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(enr.enrolled_at).toLocaleDateString('es-EC')}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Command Launcher (Plataforma / Academia) + Public Portals */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#DCE7DF] rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-heading font-bold text-sm text-[#111111]">Accesos Directos</h2>
                <p className="text-[11px] text-slate-400">Atajos a tus módulos más usados</p>
              </div>
              <div className="inline-flex bg-[#F3F6F4] p-1 rounded-xl border border-[#DCE7DF]">
                <button
                  type="button"
                  onClick={() => setLauncherTab('plataforma')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    launcherTab === 'plataforma'
                      ? 'bg-[#1A4E26] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plataforma
                </button>
                <button
                  type="button"
                  onClick={() => setLauncherTab('academia')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    launcherTab === 'academia'
                      ? 'bg-[#1A4E26] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Academia
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(launcherTab === 'plataforma'
                ? [
                    {
                      to: '/admin/solicitudes',
                      title: 'Aprobar Solicitudes',
                      desc: 'Revisar vouchers de afiliación',
                      icon: <FileCheck size={17} className="text-amber-600" />,
                      bg: 'bg-amber-50',
                    },
                    {
                      to: '/admin/pedidos',
                      title: 'Pedidos y Envíos',
                      desc: 'Despachos y seguimiento',
                      icon: <ShoppingCart size={17} className="text-sky-600" />,
                      bg: 'bg-sky-50',
                    },
                    {
                      to: '/admin/red',
                      title: 'Red Binaria',
                      desc: 'Explorar árbol de socios',
                      icon: <Network size={17} className="text-[#1A4E26]" />,
                      bg: 'bg-[#EBF4ED]',
                    },
                    {
                      to: '/admin/productos',
                      title: 'Productos SUMAK',
                      desc: 'Stock, precios y fichas',
                      icon: <Package size={17} className="text-emerald-700" />,
                      bg: 'bg-emerald-50',
                    },
                    {
                      to: '/admin/escalera',
                      title: 'Escalera del Éxito',
                      desc: 'Rangos y metas alcanzadas',
                      icon: <Trophy size={17} className="text-[#92680A]" />,
                      bg: 'bg-[#FEF6E9]',
                    },
                    {
                      to: '/admin/personal',
                      title: 'Equipo y Staff',
                      desc: 'Permisos de operaciones',
                      icon: <UserCog size={17} className="text-purple-600" />,
                      bg: 'bg-purple-50',
                    },
                  ]
                : [
                    {
                      to: '/admin/academia/cursos',
                      title: 'Cursos y Builder',
                      desc: 'Crear módulos y lecciones',
                      icon: <BookOpen size={17} className="text-[#1A4E26]" />,
                      bg: 'bg-[#EBF4ED]',
                    },
                    {
                      to: '/admin/academia/diplomas',
                      title: 'Estudio de Diplomas',
                      desc: 'Plantillas visuales y QR',
                      icon: <Award size={17} className="text-[#92680A]" />,
                      bg: 'bg-[#FEF6E9]',
                    },
                    {
                      to: '/admin/academia/cobros',
                      title: 'Cobros Academia',
                      desc: 'Transferencias, PayPhone, PayPal',
                      icon: <Wallet size={17} className="text-amber-700" />,
                      bg: 'bg-amber-50',
                    },
                    {
                      to: '/admin/academia/programas',
                      title: 'Programas y Rutas',
                      desc: 'Especializaciones multipaso',
                      icon: <Layers size={17} className="text-sky-700" />,
                      bg: 'bg-sky-50',
                    },
                    {
                      to: '/admin/academia/recetas',
                      title: 'Recetas Magistrales',
                      desc: 'Catálogo de fitoterapia',
                      icon: <Leaf size={17} className="text-emerald-700" />,
                      bg: 'bg-emerald-50',
                    },
                    {
                      to: '/admin/academia/lives',
                      title: 'Biblioteca de Lives',
                      desc: 'Sesiones y grabaciones',
                      icon: <Video size={17} className="text-rose-600" />,
                      bg: 'bg-rose-50',
                    },
                  ]
              ).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group p-3.5 rounded-2xl border border-[#E5ECE6] hover:border-[#1A4E26]/40 hover:bg-[#F8FBF9] transition-all flex items-start gap-3"
                >
                  <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[#111111] group-hover:text-[#1A4E26] truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Public Portals Card */}
          <div className="bg-gradient-to-br from-[#F8FBF9] to-[#EBF4ED] border border-[#C8D8CB] rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-[#1A4E26]">
                Portales Públicos SUMAK
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#1A4E26] border border-[#C8D8CB]">
                En Línea
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verifica cómo ven los distribuidores y estudiantes la tienda oficial, el campus virtual y el validador público de diplomas.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <Link
                to="/"
                target="_blank"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#1A4E26] text-[#1A4E26] hover:text-white border border-[#C8D8CB] text-xs font-bold transition"
              >
                <ExternalLink size={12} /> Web Oficial
              </Link>
              <Link
                to="/academia"
                target="_blank"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#1A4E26] text-[#1A4E26] hover:text-white border border-[#C8D8CB] text-xs font-bold transition"
              >
                <GraduationCap size={12} /> Campus
              </Link>
              <Link
                to="/academia/verificar"
                target="_blank"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#1A4E26] text-[#1A4E26] hover:text-white border border-[#C8D8CB] text-xs font-bold transition"
              >
                <Award size={12} /> Verificar QR
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
