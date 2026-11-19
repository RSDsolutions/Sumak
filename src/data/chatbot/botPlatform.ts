import { bankAccounts, contactInfo, levelCommissions, planConfig, tramo1Ranks, tramo2Ranks } from '../../data';
import type { ChatbotProfileConfig } from './types';

export const botPlatformProfile: ChatbotProfileConfig = {
  id: 'platform',
  name: 'Nexo · Asistente de Red',
  shortName: 'Plataforma MLM',
  roleTitle: 'Guía de Oficina Virtual, Pedidos, Red y Comisiones',
  accentGradient: 'from-[#071D0F] via-[#133A1E] to-[#1A4E26]',
  badgeColor: 'bg-sky-100 text-sky-900',
  welcomeSubtitle: 'Todo sobre cómo operar tu Oficina Virtual, compras al 50%, red binaria y cobro de comisiones.',
  rootNodeId: 'plat_root',
  quickTopics: [
    { label: 'Activación $100', nodeId: 'plat_activation' },
    { label: 'Cómo hacer Pedidos', nodeId: 'plat_orders' },
    { label: '14 Niveles y Bonos', nodeId: 'plat_commissions' },
    { label: 'Mi Credencial QR', nodeId: 'plat_credential' },
  ],
  nodes: {
    plat_root: {
      id: 'plat_root',
      title: 'Oficina Virtual · Menú Principal',
      category: 'Inicio',
      keywords: ['inicio', 'oficina', 'panel', 'ayuda', 'plataforma', 'menu'],
      message: '¡Hola! Soy Nexo, tu asistente de la Plataforma Multinivel SUMAK. Te guío paso a paso en todo el funcionamiento de tu Oficina Virtual:',
      rich: {
        summary: 'Selecciona qué área de tu negocio deseas consultar:',
      },
      options: [
        { label: 'Activación Mensual y Mi Panel', targetNodeId: 'plat_activation', badge: `$${planConfig.minActivacionMensual} mín.` },
        { label: 'Tienda Interna, Pedidos y Vouchers', targetNodeId: 'plat_orders', badge: '50% OFF' },
        { label: 'Mi Red Binaria y Cómo Afiliar Socios', targetNodeId: 'plat_network', badge: 'Genealogía' },
        { label: 'Comisiones (14 Niveles) y Bono 40%', targetNodeId: 'plat_commissions', badge: 'Cobros' },
        { label: 'Escalera del Éxito (Tramo 1 y Tramo 2)', targetNodeId: 'plat_staircase', badge: 'Premios' },
        { label: 'Credencial Digital QR y Datos Bancarios', targetNodeId: 'plat_credential' },
      ],
    },

    // ── 1. ACTIVACIÓN Y PANEL ─────────────────────────────────────────────────
    plat_activation: {
      id: 'plat_activation',
      title: 'Activación Mensual y Funcionamiento del Panel',
      category: 'Activación',
      parentNodeId: 'plat_root',
      keywords: ['activacion', 'activo', 'calificado', '100', 'mensual', 'puntos', 'panel', 'overview'],
      message: `Para mantener tu código calificado y recibir comisiones multinivel de tus 14 niveles cada mes, debes realizar al menos UN pedido individual de $${planConfig.minActivacionMensual}.00 USD (en precio distribuidor).`,
      rich: {
        facts: [
          { label: 'Mínimo para Activar Mes', value: `$${planConfig.minActivacionMensual}.00 en 1 solo pedido`, highlight: true },
          { label: 'Equivalencia en Puntos', value: '$1.00 = 1 Punto de Volumen' },
          { label: 'Descuento Distribuidor', value: '50% sobre el PVP del catálogo' },
          { label: 'Excepción Formula 1000', value: 'Precio especial $20.00 (PVP $60.00)' },
        ],
        tip: 'En la parte superior de "Mi Panel" verás una barra de estado indicando si tu mes ya está calificado o cuánto falta en un pedido para activarlo.',
        actions: [
          { label: 'Ir a Mi Panel', to: '/dashboard', variant: 'primary' },
          { label: 'Ir a la Tienda Interna', to: '/dashboard/tienda', variant: 'secondary' },
        ],
      },
      options: [
        { label: '¿Cómo hago un pedido y subo el voucher?', targetNodeId: 'plat_orders' },
        { label: '¿Qué pasa si no me activo un mes?', targetNodeId: 'plat_activation_rules' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    plat_activation_rules: {
      id: 'plat_activation_rules',
      title: 'Reglas de Calificación y Pedidos',
      category: 'Activación',
      parentNodeId: 'plat_activation',
      keywords: ['reglas', 'no me activo', 'acumulado', 'solo pedido'],
      message: 'Reglas clave para no perder tus comisiones mensuales:',
      rich: {
        bullets: [
          `El mínimo de $${planConfig.minActivacionMensual}.00 debe alcanzarse en un único pedido aprobado (estados: Procesando, Enviado o Entregado).`,
          'Compras pequeñas menores a $100 suman tu descuento comercial del 50%, pero no habilitan el cobro residual de los 14 niveles.',
          'El Bono de Inicio Rápido (40%) por afiliar nuevos socios directos siempre se acredita al aprobarse el pack del nuevo distribuidor.',
        ],
      },
      options: [
        { label: 'Hacer un Pedido de Activación', targetNodeId: 'plat_orders' },
        { label: 'Volver a Activación', targetNodeId: 'plat_activation' },
      ],
    },

    // ── 2. TIENDA Y PEDIDOS ───────────────────────────────────────────────────
    plat_orders: {
      id: 'plat_orders',
      title: 'Cómo Comprar en Tienda Interna y Subir Voucher',
      category: 'Pedidos y Compras',
      parentNodeId: 'plat_root',
      keywords: ['pedido', 'comprar', 'tienda', 'carrito', 'voucher', 'comprobante', '15 minutos'],
      message: 'Sigue estos pasos dentro de tu Oficina Virtual para comprar tus productos al precio de distribuidor:',
      rich: {
        steps: [
          'Entra a "Tienda" (/dashboard/tienda) y agrega tus productos o packs al carrito.',
          'Ve a "Mi Carrito" (/dashboard/pedido/nuevo), verifica el subtotal distribuidor y confirma el pedido.',
          `Tendrás ${planConfig.payWindowMinutes} minutos para transferir a una cuenta oficial SUMAK y subir el comprobante + número de voucher.`,
          'El equipo de Operaciones valida tu pago y cambia el pedido a "Procesando" → "Enviado" (con número de guía).',
          'Cuando recibas la caja en tus manos, entra a "Mis Pedidos" y pulsa "Confirmar Entrega".',
        ],
        actions: [
          { label: 'Ir a Tienda Interna', to: '/dashboard/tienda', variant: 'primary' },
          { label: 'Ver Mis Pedidos', to: '/dashboard/pedidos', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Ver Cuentas Bancarias Autorizadas', targetNodeId: 'plat_banks' },
        { label: 'Estados del Pedido e Incidencias', targetNodeId: 'plat_order_states' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    plat_banks: {
      id: 'plat_banks',
      title: 'Cuentas Bancarias para Pedidos SUMAK',
      category: 'Pedidos y Compras',
      parentNodeId: 'plat_orders',
      keywords: ['bancos', 'transferencia', 'pichincha', 'produbanco', 'bolivariano', 'deposito'],
      message: 'Realiza tu depósito o transferencia únicamente a estas cuentas oficiales de SUMAK antes de subir tu voucher:',
      rich: {
        facts: bankAccounts.map((b) => ({
          label: `${b.banco} (${b.tipo})`,
          value: `N° ${b.numero} · ${b.titular} (${b.documento || 'C.I.'} ${b.identificacion})`,
          highlight: true,
        })),
        tip: 'Si expira el contador de 15 minutos sin subir voucher, el carrito guarda los detalles pero debes generar un nuevo pedido o contactar a Operaciones.',
      },
      options: [
        { label: 'Volver a Pedidos y Tienda', targetNodeId: 'plat_orders' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    plat_order_states: {
      id: 'plat_order_states',
      title: 'Flujo de Estados del Pedido e Incidencias',
      category: 'Pedidos y Compras',
      parentNodeId: 'plat_orders',
      keywords: ['estado', 'enviado', 'entregado', 'procesando', 'guia', 'tracking', 'incidencia', 'reclamo'],
      message: 'Cada pedido en "Mis Pedidos" pasa por las siguientes etapas transparentes:',
      rich: {
        bullets: [
          'Pendiente: Pedido creado, esperando que subas tu voucher bancario.',
          'Procesando: Voucher recibido; Operaciones está preparando y empacando tu orden.',
          'Enviado: Tu pedido fue despachado y ya cuenta con empresa de envío / guía.',
          'Entregado: Tú confirmas que recibiste todo conforme (acción inmutable).',
          '¿Faltó algo o llegó dañado? Puedes reportar una Incidencia directamente en tu pedido antes de cerrarlo o contactar soporte.',
        ],
        actions: [
          { label: 'Revisar Mis Pedidos', to: '/dashboard/pedidos', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Volver a Pedidos y Tienda', targetNodeId: 'plat_orders' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    // ── 3. RED BINARIA Y REFERIDOS ────────────────────────────────────────────
    plat_network: {
      id: 'plat_network',
      title: 'Mi Red Binaria, Árbol y Referidos',
      category: 'Red Multinivel',
      parentNodeId: 'plat_root',
      keywords: ['red', 'binaria', 'arbol', 'genealogia', 'referido', 'patrocinador', 'derrame', 'afiliar'],
      message: 'En "Mi Red" (/dashboard/red) puedes explorar gráficamente tu organización descendiente por niveles, ver quiénes están activos y quiénes fueron afiliados directamente por ti.',
      rich: {
        bullets: [
          'Cómo afiliar a un nuevo socio: Comparte tu Código de Distribuidor (o tu link directo con ?sponsor=) para que se registre en /registro.',
          'Una vez que tu referido pague su pack inicial (Básico $125, Emprendedor $225 o Líder $525) y Admin lo apruebe, aparecerá automáticamente en tu árbol y cobrarás tu Bono de Inicio Rápido del 40%.',
          'Según el Manual SUMAK, no se permiten transferencias de patrocinador una vez registrada la red.',
        ],
        actions: [
          { label: 'Abrir Mi Red Binaria', to: '/dashboard/red', variant: 'primary' },
          { label: 'Ver Manual de Políticas', to: '/manual', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Ver Bono de Afiliación (40%)', targetNodeId: 'plat_bonus' },
        { label: 'Ver Comisiones en 14 Niveles', targetNodeId: 'plat_commissions' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    // ── 4. COMISIONES Y BONOS ─────────────────────────────────────────────────
    plat_commissions: {
      id: 'plat_commissions',
      title: 'Comisiones Residuales (14 Niveles) y Cobros',
      category: 'Finanzas MLM',
      parentNodeId: 'plat_root',
      keywords: ['comisiones', '14 niveles', 'cobrar', 'pagado', 'pendiente', 'residual', 'porcentajes'],
      message: 'Las comisiones residuales se calculan automáticamente sobre las recompras calificadas de tu red hasta 14 niveles de profundidad cuando estás activo en el mes:',
      rich: {
        facts: levelCommissions.slice(0, 7).map((l) => ({
          label: `Nivel ${l.nivel}`,
          value: `${l.porcentaje}%`,
          highlight: l.nivel === 2,
        })).concat([
          { label: 'Niveles 8 al 14', value: '0.5% en cada nivel', highlight: false },
        ]),
        tip: 'Cuando Administración u Operaciones marca tu comisión como "Pagada", adjunta el comprobante/voucher bancario para que lo descargues en "Comisiones".',
        actions: [
          { label: 'Ver Mis Comisiones', to: '/dashboard/comisiones', variant: 'primary' },
          { label: 'Ver Bono Afiliación', to: '/dashboard/bono-afiliacion', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Detalle del Bono de Afiliación (40%)', targetNodeId: 'plat_bonus' },
        { label: 'Configurar mi Cuenta Bancaria para Cobrar', targetNodeId: 'plat_credential' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    plat_bonus: {
      id: 'plat_bonus',
      title: 'Bono de Afiliación / Inicio Rápido (40%)',
      category: 'Finanzas MLM',
      parentNodeId: 'plat_commissions',
      keywords: ['bono afiliacion', '40%', 'inicio rapido', 'referido directo'],
      message: 'Por cada persona que patrocinas directamente en SUMAK, ganas el 40% del valor de su paquete inicial al momento en que Admin aprueba su afiliación:',
      rich: {
        facts: [
          { label: 'Por Pack Básico ($125)', value: '$50.00 de bono directo', highlight: true },
          { label: 'Por Pack Emprendedor ($225)', value: '$90.00 de bono directo', highlight: true },
          { label: 'Por Pack Líder ($525)', value: '$210.00 de bono directo', highlight: true },
        ],
        actions: [
          { label: 'Ir a Bono de Afiliación', to: '/dashboard/bono-afiliacion', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Ver Comisiones de Red (14 Niveles)', targetNodeId: 'plat_commissions' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    // ── 5. ESCALERA DEL ÉXITO ────────────────────────────────────────────────
    plat_staircase: {
      id: 'plat_staircase',
      title: 'Mi Escalera del Éxito (Tramo 1 y Tramo 2)',
      category: 'Rangos y Premios',
      parentNodeId: 'plat_root',
      keywords: ['escalera', 'rango', 'premio', 'tramo 1', 'tramo 2', 'diamante', 'gerente', 'carro', 'casa'],
      message: 'En "Mi Escalera" (/dashboard/escalera) ves tu rango actual, cuántos socios te faltan para el siguiente escalón y los bonos/premios desbloqueados:',
      rich: {
        facts: [
          ...tramo1Ranks.filter((_, idx) => [0, 3, 4, 8, 9].includes(idx)).map((r) => ({
            label: `Tramo 1 · ${r.rango} (${r.personasDirectas} dir.)`,
            value: r.bono,
            highlight: r.personasDirectas >= 30,
          })),
          ...tramo2Ranks.filter((_, idx) => [0, 4, 6, 9].includes(idx)).map((r) => ({
            label: `Tramo 2 · ${r.rango} (${r.personasEnRed} red)`,
            value: `${r.recompensa} + ${r.extras}`,
            highlight: r.personasEnRed >= 3000,
          })),
        ],
        actions: [
          { label: 'Ver Mi Escalera del Éxito', to: '/dashboard/escalera', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Ver Mi Red Binaria', targetNodeId: 'plat_network' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    // ── 6. CREDENCIAL DIGITAL Y PERFIL ────────────────────────────────────────
    plat_credential: {
      id: 'plat_credential',
      title: 'Credencial Digital QR y Datos Bancarios',
      category: 'Mi Cuenta',
      parentNodeId: 'plat_root',
      keywords: ['credencial', 'tarjeta', 'carnet', 'qr', 'perfil', 'banco', 'cuenta bancaria', 'foto'],
      message: 'Como distribuidor autorizado tienes acceso a tu Credencial Digital Oficial con código QR y a tu configuración bancaria para recibir pagos de comisiones:',
      rich: {
        bullets: [
          'En /tarjetadigital visualizas tu Credencial Digital de Distribuidor SUMAK (con tu código de distribuidor, rango y QR de presentación).',
          'En "Mi Perfil" (/dashboard/perfil) puedes actualizar tu foto de avatar, teléfono, ciudad y registrar tu banco y número de cuenta donde deseas que te depositen tus comisiones.',
          'Recuerda que la Credencial de Distribuidor es independiente de la Credencial Estudiantil de Academia SUMAK.',
        ],
        actions: [
          { label: 'Ver Mi Credencial Digital', to: '/tarjetadigital', variant: 'primary' },
          { label: 'Editar Mi Perfil y Banco', to: '/dashboard/perfil', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Contactar a Soporte SUMAK', targetNodeId: 'plat_support' },
        { label: 'Menú Principal', targetNodeId: 'plat_root' },
      ],
    },

    plat_support: {
      id: 'plat_support',
      title: 'Soporte Operativo SUMAK',
      category: 'Soporte',
      parentNodeId: 'plat_root',
      keywords: ['soporte', 'ayuda', 'whatsapp', 'operaciones', 'problema'],
      message: '¿Tienes alguna consulta con un pedido, voucher o liquidación de comisión?',
      rich: {
        facts: [
          { label: 'WhatsApp Soporte', value: `+${contactInfo.whatsapp}`, highlight: true },
          { label: 'Correo', value: contactInfo.emailPrincipal },
        ],
        actions: [
          {
            label: 'Escribir a Soporte por WhatsApp',
            to: `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent('Hola equipo SUMAK, soy distribuidor y necesito ayuda en mi Oficina Virtual.')}`,
            variant: 'whatsapp',
            external: true,
          },
        ],
      },
      options: [
        { label: 'Volver al Menú Principal', targetNodeId: 'plat_root' },
      ],
    },
  },
};
