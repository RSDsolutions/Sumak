import { products, affiliatePackages, contactInfo, bankAccounts, planConfig, getPrecioDistribuidor } from '../../data';
import type { ChatbotNode, ChatbotProfileConfig } from './types';

// Generar nodos individuales para cada producto del catálogo oficial SUMAK
const productDetailNodes: Record<string, ChatbotNode> = {};
for (const prod of products) {
  const distPrice = getPrecioDistribuidor(prod);
  productDetailNodes[`web_prod_${prod.slug}`] = {
    id: `web_prod_${prod.slug}`,
    title: prod.nombre,
    category: prod.categoria,
    parentNodeId:
      prod.categoriaKey === 'bebidas'
        ? 'web_prods_bebidas'
        : prod.categoriaKey === 'capsulas'
        ? 'web_prods_capsulas'
        : prod.categoriaKey === 'suplementos'
        ? 'web_prods_suplementos'
        : 'web_prods_otros',
    keywords: [prod.nombre, prod.codigo, prod.categoria, prod.tagline || '', ...(prod.beneficios || [])],
    message: `${prod.nombre} (${prod.categoria}) — ${prod.descripcion}`,
    rich: {
      facts: [
        { label: 'Código Oficial', value: prod.codigo },
        { label: 'Presentación', value: prod.presentacion || 'Estándar SUMAK' },
        { label: 'Precio Público (PVP)', value: `$${prod.pvp.toFixed(2)}`, highlight: true },
        { label: 'Precio Distribuidor', value: `$${distPrice.toFixed(2)}` },
      ],
      bullets: (prod.beneficios || []).slice(0, 5),
      tip: prod.modoUso ? `Modo de uso: ${prod.modoUso}` : undefined,
      actions: [
        { label: `Ver ficha completa de ${prod.nombre}`, to: `/productos/${prod.slug}`, variant: 'primary' },
        { label: 'Consultar por WhatsApp', to: `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(`Hola SUMAK, quiero información sobre ${prod.nombre}`)}`, variant: 'whatsapp', external: true },
      ],
    },
    options: [
      { label: 'Ver más productos de esta línea', targetNodeId: prod.categoriaKey === 'bebidas' ? 'web_prods_bebidas' : prod.categoriaKey === 'capsulas' ? 'web_prods_capsulas' : prod.categoriaKey === 'suplementos' ? 'web_prods_suplementos' : 'web_prods_otros' },
      { label: '¿Cómo obtengo el 50% de descuento?', targetNodeId: 'web_mlm_ganancias', badge: '50% OFF' },
      { label: 'Menú Principal', targetNodeId: 'web_root' },
    ],
  };
}

export const botWebProfile: ChatbotProfileConfig = {
  id: 'web',
  name: 'Asistente SUMAK',
  shortName: 'SUMAK Web',
  roleTitle: 'Guía Oficial · Productos, Multinivel y Academia',
  accentGradient: 'from-[#071D0F] via-[#0F321A] to-[#1A4E26]',
  badgeColor: 'bg-emerald-100 text-[#1A4E26]',
  welcomeSubtitle: 'Todo sobre nuestros productos naturales, plan de compensación y academia virtual.',
  rootNodeId: 'web_root',
  quickTopics: [
    { label: 'Productos y Precios', nodeId: 'web_products' },
    { label: 'Packs de Afiliación', nodeId: 'web_mlm_packs' },
    { label: 'Plan de Comisiones', nodeId: 'web_mlm_levels' },
    { label: 'Academia SUMAK', nodeId: 'web_academy' },
  ],
  nodes: {
    web_root: {
      id: 'web_root',
      title: 'Menú Principal',
      category: 'Inicio',
      keywords: ['inicio', 'hola', 'menu', 'ayuda', 'sumak'],
      message: '¡Bienvenido a SUMAK Vida Ecuador! Soy tu guía oficial. Elige un tema del menú o escribe cualquier consulta sobre nuestros productos, oportunidad multinivel o Academia Virtual:',
      rich: {
        summary: 'Naturaleza que Nutre, Bienestar que Transforma — Ecuador.',
      },
      options: [
        { label: 'Catálogo de Productos Naturales', targetNodeId: 'web_products', badge: `${products.length} ítems` },
        { label: 'Negocio Multinivel y Ganancias', targetNodeId: 'web_mlm', badge: '14 niveles' },
        { label: 'Academia SUMAK y Certificados', targetNodeId: 'web_academy', badge: 'Campus QR' },
        { label: 'Sobre la Empresa y Sede', targetNodeId: 'web_company' },
        { label: 'Cómo Registrarme y Medios de Pago', targetNodeId: 'web_join' },
      ],
    },

    // ── 1. EMPRESA ────────────────────────────────────────────────────────────
    web_company: {
      id: 'web_company',
      title: 'Sobre SUMAK Vida Ecuador',
      category: 'Empresa',
      parentNodeId: 'web_root',
      keywords: ['empresa', 'sumak', 'nosotros', 'quienes somos', 'ruc', 'ubicacion', 'babahoyo', 'luis paredes', 'oficina'],
      message: 'Sumak Vida Ecuador S.A. es una empresa ecuatoriana dedicada al bienestar integral mediante fórmulas con plantas medicinales andinas y un plan de emprendimiento justo.',
      rich: {
        facts: [
          { label: 'Razón Social', value: contactInfo.empresa },
          { label: 'RUC Oficial', value: contactInfo.ruc },
          { label: 'Gerencia General', value: contactInfo.gerenteGeneral },
          { label: 'Oficina Matriz', value: contactInfo.direccion },
          { label: 'Teléfono / WhatsApp', value: contactInfo.telefono1, highlight: true },
          { label: 'Correo Principal', value: contactInfo.emailPrincipal },
        ],
        actions: [
          { label: 'Conocer nuestra historia', to: '/nosotros', variant: 'secondary' },
          { label: 'Ir a Contacto', to: '/contacto', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Ver Cuentas Bancarias Oficiales', targetNodeId: 'web_banks' },
        { label: 'Explorar Productos SUMAK', targetNodeId: 'web_products' },
        { label: 'Hablar con Asesor por WhatsApp', targetNodeId: 'web_whatsapp' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    // ── 2. PRODUCTOS ──────────────────────────────────────────────────────────
    web_products: {
      id: 'web_products',
      title: 'Líneas de Productos Naturales',
      category: 'Productos',
      parentNodeId: 'web_root',
      keywords: ['productos', 'catalogo', 'precios', 'suplementos', 'bebidas', 'capsulas', 'tienda'],
      message: 'Nuestras fórmulas combinan biodiversidad andina, probióticos, vitaminas y minerales sin colorantes ni conservantes. Selecciona una categoría para ver precios y beneficios:',
      rich: {
        tip: 'Al afiliarte como distribuidor obtienes el 50% de descuento sobre el PVP (y Formula 1000 a $20.00 en lugar de $60.00).',
        actions: [
          { label: 'Abrir Catálogo Completo', to: '/productos', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Bebidas Funcionales y Extractos', targetNodeId: 'web_prods_bebidas', badge: '5 prod.' },
        { label: 'Suplementos en Polvo y Orgánicos', targetNodeId: 'web_prods_suplementos', badge: '5 prod.' },
        { label: 'Cápsulas Botánicas', targetNodeId: 'web_prods_capsulas', badge: '2 prod.' },
        { label: 'Cuidado Personal y Accesorios', targetNodeId: 'web_prods_otros', badge: '4 prod.' },
        { label: '¿Cómo comprar con 50% de descuento?', targetNodeId: 'web_mlm_ganancias' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_prods_bebidas: {
      id: 'web_prods_bebidas',
      title: 'Bebidas Funcionales y Extractos',
      category: 'Productos',
      parentNodeId: 'web_products',
      keywords: ['bebidas', 'te extractos', 'regen 24', 'colon renova', 'bebida andina', 'vive oxi'],
      message: 'Elige una bebida funcional para ver su ficha completa, precio público (PVP), precio distribuidor y modo de uso:',
      options: [
        ...products
          .filter((p) => p.categoriaKey === 'bebidas')
          .map((p) => ({
            label: `${p.nombre}`,
            targetNodeId: `web_prod_${p.slug}`,
            badge: `$${p.pvp.toFixed(2)}`,
          })),
        { label: 'Volver a Categorías', targetNodeId: 'web_products' },
      ],
    },

    web_prods_suplementos: {
      id: 'web_prods_suplementos',
      title: 'Suplementos en Polvo y Orgánicos',
      category: 'Productos',
      parentNodeId: 'web_products',
      keywords: ['suplementos', 'fibramak', 'moringa', 'colageno', 'formula 1000', 'chupapanza'],
      message: 'Selecciona un suplemento alimenticio para conocer sus ingredientes clave, beneficios y precios oficiales:',
      options: [
        ...products
          .filter((p) => p.categoriaKey === 'suplementos')
          .map((p) => ({
            label: `${p.nombre}`,
            targetNodeId: `web_prod_${p.slug}`,
            badge: `$${p.pvp.toFixed(2)}`,
          })),
        { label: 'Volver a Categorías', targetNodeId: 'web_products' },
      ],
    },

    web_prods_capsulas: {
      id: 'web_prods_capsulas',
      title: 'Cápsulas Botánicas SUMAK',
      category: 'Productos',
      parentNodeId: 'web_products',
      keywords: ['capsulas', 'madre silvestre', 'original moringa', 'bienestar femenino'],
      message: 'Selecciona nuestras fórmulas encapsuladas 100% naturales:',
      options: [
        ...products
          .filter((p) => p.categoriaKey === 'capsulas')
          .map((p) => ({
            label: `${p.nombre}`,
            targetNodeId: `web_prod_${p.slug}`,
            badge: `$${p.pvp.toFixed(2)}`,
          })),
        { label: 'Volver a Categorías', targetNodeId: 'web_products' },
      ],
    },

    web_prods_otros: {
      id: 'web_prods_otros',
      title: 'Cuidado Personal y Accesorios',
      category: 'Productos',
      parentNodeId: 'web_products',
      keywords: ['shampoo activa', 'tomatodo', 'mochila', 'catalogo'],
      message: 'Conoce nuestra línea capilar con células madres vegetales y herramientas para distribuidores:',
      options: [
        ...products
          .filter((p) => ['cuidado-personal', 'accesorios', 'material'].includes(p.categoriaKey))
          .map((p) => ({
            label: `${p.nombre}`,
            targetNodeId: `web_prod_${p.slug}`,
            badge: `$${p.pvp.toFixed(2)}`,
          })),
        { label: 'Volver a Categorías', targetNodeId: 'web_products' },
      ],
    },

    ...productDetailNodes,

    // ── 3. PLAN MULTINIVEL ────────────────────────────────────────────────────
    web_mlm: {
      id: 'web_mlm',
      title: 'Oportunidad y Plan Multinivel SUMAK',
      category: 'Negocio Multinivel',
      parentNodeId: 'web_root',
      keywords: ['multinivel', 'negocio', 'oportunidad', 'plan', 'ganar', 'comisiones', 'distribuidor'],
      message: 'En SUMAK puedes emprender con baja inversión, eligiendo los productos de tu pack inicial y generando ingresos por venta directa, patrocinio y red en 14 niveles.',
      rich: {
        facts: [
          { label: 'Descuento Distribuidor', value: '50% sobre PVP', highlight: true },
          { label: 'Bono Inicio Rápido', value: '40% de cada pack referido', highlight: true },
          { label: 'Profundidad de Red', value: '14 Niveles de Comisiones' },
          { label: 'Activación Mensual', value: `$${planConfig.minActivacionMensual}.00 (1 pedido)` },
        ],
        actions: [
          { label: 'Ver Plan Completo', to: '/plan-multinivel', variant: 'secondary' },
          { label: 'Quiero Afiliarme Ahora', to: '/registro', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Paquetes de Afiliación ($125 / $225 / $525)', targetNodeId: 'web_mlm_packs' },
        { label: 'Descuento 50% y Bono Patrocinio 40%', targetNodeId: 'web_mlm_ganancias' },
        { label: 'Tabla de Comisiones en 14 Niveles', targetNodeId: 'web_mlm_levels' },
        { label: 'Escalera del Éxito (Bonos y Premios)', targetNodeId: 'web_mlm_ranks' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_mlm_packs: {
      id: 'web_mlm_packs',
      title: 'Paquetes de Afiliación SUMAK',
      category: 'Negocio Multinivel',
      parentNodeId: 'web_mlm',
      keywords: ['packs', 'paquetes', 'basico', 'emprendedor', 'lider', 'inscripcion', '125', '225', '525'],
      message: 'Al afiliarte eliges tú mismo los productos de tu pack y recibes tu Oficina Virtual personal, árbol genealógico, comisiones y acceso a capacitaciones:',
      rich: {
        facts: affiliatePackages.map((pk) => ({
          label: `${pk.nombre} (${pk.productos} productos)`,
          value: `$${pk.precio}.00 · ${pk.puntos} pts`,
          highlight: pk.destacado,
        })),
        bullets: [
          'Pack Básico ($125): 9 productos a tu elección · 125 puntos.',
          'Pack Emprendedor ($225 · Más Popular): 17 productos a tu elección · 225 puntos.',
          'Pack Líder ($525): 41 productos a tu elección · 525 puntos y máximo posicionamiento.',
        ],
        actions: [
          { label: 'Elegir mi Pack y Registrarme', to: '/registro', variant: 'primary' },
        ],
      },
      options: [
        { label: '¿Cómo funcionan las comisiones de 14 niveles?', targetNodeId: 'web_mlm_levels' },
        { label: 'Ver Bono de Inicio Rápido (40%)', targetNodeId: 'web_mlm_ganancias' },
        { label: 'Ver Cuentas Bancarias para Pago', targetNodeId: 'web_banks' },
        { label: 'Volver a Plan Multinivel', targetNodeId: 'web_mlm' },
      ],
    },

    web_mlm_ganancias: {
      id: 'web_mlm_ganancias',
      title: 'Venta Directa (50%) y Bono Patrocinio (40%)',
      category: 'Negocio Multinivel',
      parentNodeId: 'web_mlm',
      keywords: ['descuento', '50%', '40%', 'bono', 'patrocinio', 'ganancia', 'reventa', 'activacion'],
      message: 'Desde el día 1 de tu aprobación como distribuidor cuentas con dos fuentes de ganancia inmediata:',
      rich: {
        facts: [
          { label: 'Margen Venta Directa', value: '50% de descuento sobre PVP', highlight: true },
          { label: 'Formula 1000 Especial', value: 'PVP $60.00 → Distribuidor $20.00' },
          { label: 'Bono de Inicio Rápido', value: '40% del pack de tus referidos', highlight: true },
          { label: 'Mínimo Activación Mensual', value: '$100.00 en un solo pedido' },
        ],
        bullets: [
          'Si afilias un Pack Básico ($125) ganas $50.00 directos.',
          'Si afilias un Pack Emprendedor ($225) ganas $90.00 directos.',
          'Si afilias un Pack Líder ($525) ganas $210.00 directos.',
        ],
      },
      options: [
        { label: 'Ver Comisiones Residuales (14 Niveles)', targetNodeId: 'web_mlm_levels' },
        { label: 'Ver Paquetes de Inicio', targetNodeId: 'web_mlm_packs' },
        { label: 'Volver a Plan Multinivel', targetNodeId: 'web_mlm' },
      ],
    },

    web_mlm_levels: {
      id: 'web_mlm_levels',
      title: 'Comisiones Residuales en 14 Niveles',
      category: 'Negocio Multinivel',
      parentNodeId: 'web_mlm',
      keywords: ['niveles', '14 niveles', 'residual', 'porcentajes', 'comision', 'red'],
      message: 'Cuando estás activo en el mes (pedido mínimo de $100), cobras porcentajes sobre las recompras de toda tu organización hasta el nivel 14:',
      rich: {
        facts: [
          { label: 'Nivel 1', value: '5%' },
          { label: 'Nivel 2', value: '20% (¡El mayor porcentaje!)', highlight: true },
          { label: 'Nivel 3', value: '5%' },
          { label: 'Nivel 4 · 5 · 6 · 7', value: '4% · 3% · 2% · 1%' },
          { label: 'Niveles 8 al 14', value: '0.5% cada nivel' },
        ],
        tip: 'Cada $1.00 invertido como distribuidor en compras equivale a 1 punto de volumen.',
        actions: [
          { label: 'Simular ingresos en Plan Multinivel', to: '/plan-multinivel', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Ver Escalera del Éxito (Tramos y Premios)', targetNodeId: 'web_mlm_ranks' },
        { label: 'Volver a Plan Multinivel', targetNodeId: 'web_mlm' },
      ],
    },

    web_mlm_ranks: {
      id: 'web_mlm_ranks',
      title: 'Escalera del Éxito SUMAK',
      category: 'Negocio Multinivel',
      parentNodeId: 'web_mlm',
      keywords: ['escalera', 'rangos', 'premios', 'bonos', 'diamante', 'carro', 'casa', 'viaje'],
      message: 'SUMAK premia tu liderazgo en dos tramos: por afiliados directos (Tramo 1) y por crecimiento total de tu red (Tramo 2):',
      rich: {
        bullets: [
          'Tramo 1 (Directos): Desde Socio ($100) hasta Gerente Nivel 2 (40 directos = $4,000 + Viaje Nacional).',
          'Tramo 2 (Red): Premios progresivos desde Viaje Internacional, Cocina, Nevera, Proyector, Laptop y Moto...',
          'Rangos Superiores: 3 niveles con Carro (Diamante Plata, Oro y Fundador Nacional) hasta Fundador Internacional ($1,000,000 + Casa).',
        ],
        actions: [
          { label: 'Explorar Escaleras del Éxito', to: '/escaleras', variant: 'primary' },
        ],
      },
      options: [
        { label: '¿Cómo empiezo mi afiliación?', targetNodeId: 'web_join' },
        { label: 'Volver a Plan Multinivel', targetNodeId: 'web_mlm' },
      ],
    },

    // ── 4. ACADEMIA SUMAK ─────────────────────────────────────────────────────
    web_academy: {
      id: 'web_academy',
      title: 'Academia SUMAK · Campus Virtual',
      category: 'Academia',
      parentNodeId: 'web_root',
      keywords: ['academia', 'cursos', 'recetas', 'diplomas', 'certificados', 'clases', 'estudiar'],
      message: 'Academia SUMAK es nuestro Campus Virtual de formación en Biomedicina Ancestral, Fitoterapia y Liderazgo. Pueden estudiar tanto distribuidores como estudiantes independientes.',
      rich: {
        bullets: [
          'Cursos estructurados en módulos con lecciones clínicas, fichas botánicas y evaluaciones.',
          'Recetas Magistrales del Dr. Luis Paredes adquiribles individualmente o en paquete.',
          'Emisión automática de Certificados de Curso y Diplomas de Programa con código QR verificable.',
          'Credencial Estudiantil Digital única e independiente.',
        ],
        actions: [
          { label: 'Explorar Campus Virtual', to: '/academia', variant: 'primary' },
          { label: 'Ver Catálogo de Cursos', to: '/academia/cursos', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Ver Programas de Especialización', targetNodeId: 'web_academy_programs' },
        { label: 'Recetas Ancestrales del Dr. Paredes', targetNodeId: 'web_academy_recipes' },
        { label: 'Verificar Autenticidad de un Diploma QR', targetNodeId: 'web_academy_verify' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_academy_programs: {
      id: 'web_academy_programs',
      title: 'Programas, Certificados y Diplomas',
      category: 'Academia',
      parentNodeId: 'web_academy',
      keywords: ['programas', 'diploma', 'certificado', 'qr', 'especializacion'],
      message: 'Cada curso aprobado emite automáticamente su Certificado Oficial. Al completar todos los cursos de un Programa formativo se genera automáticamente tu Diploma Oficial con código QR.',
      rich: {
        actions: [
          { label: 'Ver Programas Disponibles', to: '/academia/programas', variant: 'primary' },
          { label: 'Registrarme como Estudiante', to: '/academia/registro', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Volver a Academia SUMAK', targetNodeId: 'web_academy' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_academy_recipes: {
      id: 'web_academy_recipes',
      title: 'Recetas Magistrales y Fitoterapia',
      category: 'Academia',
      parentNodeId: 'web_academy',
      keywords: ['recetas', 'preparaciones', 'plantas', 'infusion', 'salud'],
      message: 'En la sección de Recetas de Academia SUMAK puedes adquirir formulaciones tradicionales paso a paso creadas por el Dr. Luis Paredes pagando por transferencia, PayPhone o PayPal.',
      rich: {
        actions: [
          { label: 'Ver Recetario Oficial', to: '/academia/recetas', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Volver a Academia SUMAK', targetNodeId: 'web_academy' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_academy_verify: {
      id: 'web_academy_verify',
      title: 'Verificación Pública de Diplomas QR',
      category: 'Academia',
      parentNodeId: 'web_academy',
      keywords: ['verificar', 'validador', 'qr', 'codigo', 'autenticidad'],
      message: 'Todos los certificados, diplomas y credenciales estudiantiles de Academia SUMAK incluyen un código único y QR verificable públicamente en línea.',
      rich: {
        actions: [
          { label: 'Abrir Verificador Oficial', to: '/academia/verificar', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Volver a Academia SUMAK', targetNodeId: 'web_academy' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    // ── 5. REGISTRO Y PAGOS ───────────────────────────────────────────────────
    web_join: {
      id: 'web_join',
      title: 'Cómo Afiliarte o Comprar en SUMAK',
      category: 'Registro y Pagos',
      parentNodeId: 'web_root',
      keywords: ['registro', 'afiliarme', 'inscribirme', 'pagos', 'transferencia', 'como empezar'],
      message: 'Puedes comenzar en SUMAK en solo 4 pasos sencillos:',
      rich: {
        steps: [
          'Elige tu Pack Inicial (Básico $125, Emprendedor $225 o Líder $525) o tu cuenta de estudiante en Academia.',
          'Selecciona tú mismo los productos que vendrán en tu kit de bienvenida.',
          'Realiza la transferencia bancaria a nuestras cuentas oficiales y sube el comprobante en el formulario.',
          'Nuestro equipo aprueba tu solicitud y recibes acceso inmediato a tu Oficina Virtual.',
        ],
        actions: [
          { label: 'Ir al Registro de Distribuidor', to: '/registro', variant: 'primary' },
          { label: 'Registrarme solo en Academia', to: '/academia/registro', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Ver Cuentas Bancarias Oficiales', targetNodeId: 'web_banks' },
        { label: 'Hablar con un Asesor por WhatsApp', targetNodeId: 'web_whatsapp' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_banks: {
      id: 'web_banks',
      title: 'Cuentas Bancarias Oficiales SUMAK',
      category: 'Pagos',
      parentNodeId: 'web_join',
      keywords: ['bancos', 'pichincha', 'produbanco', 'bolivariano', 'cuenta', 'transferencia', 'deposito'],
      message: 'Estas son las únicas cuentas bancarias autorizadas para transferencias y depósitos de SUMAK Vida Ecuador:',
      rich: {
        facts: bankAccounts.map((b) => ({
          label: `${b.banco} (${b.tipo})`,
          value: `N° ${b.numero} · ${b.titular} (${b.documento || 'C.I.'} ${b.identificacion})`,
          highlight: true,
        })),
        tip: 'Conserva siempre la foto o captura de tu comprobante con el número de referencia para validarlo en la plataforma.',
      },
      options: [
        { label: 'Ir al Registro de Distribuidor', targetNodeId: 'web_join' },
        { label: 'Menú Principal', targetNodeId: 'web_root' },
      ],
    },

    web_whatsapp: {
      id: 'web_whatsapp',
      title: 'Atención Directa por WhatsApp',
      category: 'Soporte',
      parentNodeId: 'web_root',
      keywords: ['whatsapp', 'asesor', 'humano', 'ayuda', 'soporte', 'telefono'],
      message: '¿Prefieres conversar directamente con nuestro equipo de atención al cliente en Babahoyo - Ecuador?',
      rich: {
        facts: [
          { label: 'WhatsApp Oficial', value: `+${contactInfo.whatsapp}`, highlight: true },
          { label: 'Correo Soporte', value: contactInfo.emailPrincipal },
          { label: 'Dirección', value: contactInfo.direccion },
        ],
        actions: [
          {
            label: 'Abrir Chat en WhatsApp',
            to: `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent('Hola SUMAK Vida Ecuador, deseo asesoría personalizada.')}`,
            variant: 'whatsapp',
            external: true,
          },
          { label: 'Ir a Contacto', to: '/contacto', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Volver al Menú Principal', targetNodeId: 'web_root' },
      ],
    },
  },
};
