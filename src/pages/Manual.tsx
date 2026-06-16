import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Scale, BookOpen, Heart, ArrowUp, ChevronRight, ShieldCheck, Sparkles,
  Phone, Mail, FileText,
} from 'lucide-react';
import { contactInfo } from '../data';
import { useSEO } from '../lib/seo';

// ── Code of ethics ────────────────────────────────────────────
const codigoEtica = [
  'Llevaré mi negocio de una manera ética y honesta todo el tiempo.',
  'No presentaré beneficios y ahorros asociados con los productos y servicios de Sumak, excepto aquellos que hayan sido previamente autorizados por la empresa en su literatura y videos.',
  'Daré apoyo y estímulo a mis clientes para asegurarme que sus experiencias con los productos de Sumak sean provechosas. Entiendo la importancia de dar seguimiento y apoyo también a mi genealogía.',
  'Trabajaré activamente con los miembros de mi genealogía con el fin de ayudarles a construir su negocio y obtener los beneficios que el plan de compensación de Sumak ofrece.',
  'No exageraré a otros mis ingresos personales ni el potencial de generar ingresos. Pondré en claro a los candidatos de Distribuidor el nivel de esfuerzo requerido para sobresalir en el negocio.',
  'No abusaré de la buena voluntad y de las ventajas que ofrece Sumak para promover los intereses de otros negocios (particularmente aquellos que puedan ser competencia para Sumak), sin el previo consentimiento por escrito.',
  'No haré comentarios denigrantes sobre otros distribuidores de Sumak ni de otras empresas, productos o servicios.',
  'Me sujetaré a todas las políticas y procedimientos de Sumak tal como constan en este manual, o como puedan cambiar en el futuro.',
];

// ── 29 policies ────────────────────────────────────────────────
interface Policy {
  num: number;
  title: string;
  content: string[];
}

const policies: Policy[] = [
  {
    num: 1, title: 'Requisitos del Distribuidor',
    content: [
      'Para ser un Distribuidor, el solicitante debe ser mayor de edad en el país o región en el cual reside. Debe llenar la solicitud de inscripción y contrato de Sumak —documento incluido en el Kit de Inscripción— en el cual debe proporcionar el número de su cédula de identidad. Para ser vigentes, dicha solicitud y contrato deben ser aceptados por la compañía.',
      'Aquellas empresas que se registren como Distribuidor de Sumak deberán incluir en su solicitud y contrato el número de Registro Único de Contribuyentes (RUC).',
      'Sumak se reserva el derecho de aceptar o rechazar a cualquier persona o empresa como Distribuidor. En el caso de esposo y esposa, cada uno puede tener su propio contrato como Distribuidores, siempre que uno sea patrocinador del otro. Cualquier intento de patrocinio de doble línea será eliminado por la compañía.',
    ],
  },
  {
    num: 2, title: 'Requisitos de Sociedad o Empresa',
    content: [
      'Una sociedad o empresa podrá tener un contrato como Distribuidor en cuanto haya completado la solicitud de inscripción y contrato y haya provisto el número de RUC. Un individuo no participará en más de un (1) contrato de cualquier tipo como Distribuidor.',
      'Un Distribuidor puede cambiar de categoría bajo el mismo patrocinador siempre y cuando exista la documentación completa y apropiada (puede cambiar de individuo a sociedad o empresa).',
      'La persona que firme la solicitud por parte de una sociedad o empresa debe tener la autorización correspondiente. Adicionalmente, debe certificar que ninguna persona con un interés de deuda o plusvalía en el negocio se ha interesado por adquirir un contrato de Distribuidor con Sumak dentro de un (1) año a partir de la fecha de firma de la solicitud.',
    ],
  },
  {
    num: 3, title: 'Patrocinio',
    content: [
      'Todos los Distribuidores tienen el derecho de patrocinar a otros Distribuidores en cualquier parte dentro del Ecuador u otros países donde Sumak se vaya expandiendo, manteniendo en mente la necesidad del contacto personal. Los Distribuidores son libres de vender productos en cualquier parte del mundo siempre y cuando la venta no rompa las leyes y regulaciones del país en el cual el producto es vendido.',
      'En caso que dos Distribuidores demanden ser patrocinadores del mismo Distribuidor, Sumak reconocerá la primera aplicación recibida en sus oficinas corporativas. Se respetarán hasta siete (7) días calendario para que el prospecto tome la decisión y firme su inscripción, o de lo contrario otra persona podrá patrocinarlo.',
      'Patrocinar a una persona de otra línea o red es estrictamente prohibido en Sumak. Un Distribuidor no debe interferir con la relación del patrocinador de ningún Distribuidor del cual no haya patrocinado personalmente, ni hablarle de otro programa, ni inducirlo a cambiar sus actividades de negocios fuera de la posición originalmente patrocinada.',
      'Con respecto a cualquier disputa, la compañía se reserva el derecho de tomar la decisión final.',
    ],
  },
  {
    num: 4, title: 'Responsabilidades del Patrocinador',
    content: [
      'Cualquier Distribuidor que patrocine a otros Distribuidores debe cumplir con la obligación de realizar de buena fe su función de supervisor y entrenador a favor de aquellos patrocinados.',
      'Los Distribuidores deberán mantenerse en continuo contacto, comunicación y supervisión de su organización o red. Ejemplos: hojas informativas, correspondencia por escrito, juntas personales, contacto telefónico, sesiones de entrenamiento, acompañamiento de individuos a eventos corporativos, o compartir información genealógica con aquellos patrocinados.',
    ],
  },
  {
    num: 5, title: 'Cooperación en Red',
    content: [
      'Recomendamos que aquellos Distribuidores que pertenecen a distintas organizaciones o redes, cooperen unos con otros para lograr éxito mutuo.',
    ],
  },
  {
    num: 6, title: 'Transferencias de Patrocinación',
    content: [
      'En Sumak está prohibida la transferencia de un patrocinador a otro. La integridad de toda la organización está basada en la fortaleza de su estructura con la red.',
      'La única manera en la cual a un Distribuidor se le permite cambiar de patrocinador es por medio de una renuncia formal por escrito ante la compañía. A partir de ese momento, el Distribuidor podrá volver a integrarse a la red dentro de seis (6) meses bajo un nuevo patrocinador. Sin embargo, su genealogía y posición previa no se transfieren con él.',
    ],
  },
  {
    num: 7, title: 'Muerte del Distribuidor',
    content: [
      'Ante la muerte de un Distribuidor, el derecho a las comisiones y posición —junto con los deberes y responsabilidades del contrato— pasarán al sucesor interesado, bajo notificación por escrito a Sumak. A la firma del contrato puede llenarse el espacio "Beneficiario/Heredero".',
      'El sucesor debe cumplir con los requerimientos del Plan de Pagos, comprar los sesenta (60) puntos en ese código quincenalmente y cumplir cualquier cambio realizado o futuro en el Plan de Pagos, las políticas y procedimientos, o los términos del contrato.',
      'Para proteger a la compañía de fraude, Sumak requiere un acta de defunción y una copia certificada del testamento, fideicomiso u otro mecanismo antes de hacer vigente la transferencia. El distribuidor sucesor deberá llenar una inscripción nueva.',
    ],
  },
  {
    num: 8, title: 'Venta de la Membresía de Distribuidor',
    content: [
      'Como distribuidor independiente, usted es libre de vender o asignar su contrato de distribuidor por el precio cotizado en el mercado. Sin embargo, con el fin de proteger la integridad de Sumak, cualquier contrato de venta o transferencia de interés deberá ser aprobado por su contenido y forma antes.',
      'Habrá un costo por el proceso de revisión y transacción de venta correspondiente a los honorarios de los abogados corporativos de Sumak. Sumak se reserva el derecho de aceptar o denegar el contrato de venta o la transferencia basado en la competencia de los compradores, cualquier representación falsa por el vendedor, u otras cuestiones materiales que envuelvan una venta perjudicial para Sumak.',
    ],
  },
  {
    num: 9, title: 'Representaciones por Distribuidores',
    content: [
      'Los Distribuidores son contratistas independientes completamente responsables por sus propias prácticas empresariales, y no deberán ser considerados como empleados de Sumak. El contrato entre Sumak y sus Distribuidores no crea una relación de empleador/empleado, agencia o sociedad.',
      'Los Distribuidores no deberán representarse a sí mismos —oralmente ni por escrito— como agentes o empleados de la compañía. No tienen ninguna autoridad para comprometer a Sumak bajo ninguna circunstancia.',
      'Cada Distribuidor deberá mantener a Sumak libre de demandas, daños o responsabilidades que surjan de sus prácticas empresariales. Son responsables de sus propios gastos: publicidad, impuestos, honorarios, costos legales, gastos de teléfono.',
      'El Distribuidor no deberá usar el nombre de la compañía en ningún documento o forma escrita (papel membretado, cuentas bancarias, letreros de negocios) sin antes mencionar las palabras "Distribuidor Independiente" y con previa autorización de la compañía.',
    ],
  },
  {
    num: 10, title: 'Materiales de Trabajo del Distribuidor',
    content: [
      'Es requerido que los Distribuidores compren el Kit de Inscripción junto con su contrato. La compra de los materiales de trabajo es al precio que Sumak asigne. Esta suma no es un servicio ni una cuota de franquicia, sino la cantidad usada para cubrir los costos incurridos por Sumak en la producción y distribución de los materiales requeridos.',
      'La compra de productos adicionales nunca es requerida para ser un Distribuidor de Sumak. No serán pagadas comisiones por la compra de los materiales de trabajo del Distribuidor ni por los materiales auxiliares de venta.',
    ],
  },
  {
    num: 11, title: 'Ventas al Por Menor',
    content: [
      'Toda la estructura de comisión está basada en el volumen de compras originadas por los Distribuidores Individuales a Sumak. Los productos o servicios de Sumak deberán ser vendidos por Distribuidores registrados.',
      'Los Distribuidores pueden vender a los consumidores para su uso personal, pero no para reventa a otros consumidores. Los artículos de reventa serán vendidos a los Distribuidores de la compañía.',
      'Los Distribuidores no venderán los productos de Sumak a ningún precio por debajo del precio vendido por Sumak al Distribuidor. Esta restricción es necesaria para evitar "desperdicio" de producto y la compra de productos con propósitos exclusivos de calificación.',
    ],
  },
  {
    num: 12, title: 'Ventas en Tiendas u Otros Establecimientos',
    content: [
      'Para garantizar que cada Distribuidor tenga una oportunidad justa y equitativa, y con el propósito de fomentar el continuo apoyo personal, está estrictamente prohibido que los productos de Sumak sean vendidos en cualquier tienda o establecimiento sin previo consentimiento por escrito.',
      'Sin embargo, podrá ser presentada literatura refiriendo al consumidor a un Distribuidor Independiente. Los Distribuidores no deben vender productos de Sumak a través de sitios de subasta en Internet.',
    ],
  },
  {
    num: 13, title: 'Ética de los Distribuidores Independientes',
    content: [
      'Sumak no permitirá ninguna actividad que sea obviamente anti-ética o anti-profesional. Aunque la línea entre los esfuerzos de publicidad profesional agresiva, conducta anti-ética y hostigamiento puede ser imprecisa, Sumak intervendrá cuando tal conducta sea evidente y se reserva el derecho de usar su propio juicio en decidir si ciertas actividades son inapropiadas y, de serlo, tomar medidas.',
    ],
  },
  {
    num: 14, title: 'Política de Reembolso',
    content: [
      'Sumak reemplazará sin costo alguno artículos defectuosos o que hayan sido dañados durante su envío. Para un reemplazo de mercancía, una notificación de envíos dañados deberá ser comunicada a Sumak dentro de un plazo de tres (3) días, a partir de la fecha cuando se recibió la mercancía. Cualquier otro reembolso será realizado únicamente bajo la discreción de la compañía.',
    ],
  },
  {
    num: 15, title: 'No se Permite Abastecimiento',
    content: [
      'Sumak permitirá a un Distribuidor comprar una cantidad razonable de producto para goce y uso personal, para venta, así como para ser usados como muestras de los productos en venta. Es política de Sumak prohibir estrictamente la compra de productos por cantidades irrazonables únicamente con el propósito de calificar para comisiones o avanzar dentro del plan de compensación.',
    ],
  },
  {
    num: 16, title: 'Impuestos de Venta',
    content: [
      'Todos los productos de Sumak están sujetos a los impuestos de venta en el país o ciudad que recauda esos impuestos y en el cual una venta ha sido realizada. Este impuesto es calculado basado en el valor del precio de compra del artículo en venta.',
    ],
  },
  {
    num: 17, title: 'Impuestos Individuales',
    content: [
      'Cada Distribuidor deberá cumplir con todos los impuestos locales y con las regulaciones que rigen la venta de los productos de Sumak. Adicionalmente, es requerido de cada Distribuidor el proveer en su Aplicación de Distribuidor ya sea su número de cédula de identidad o registro único de contribuyentes RUC.',
      'Sumak retiene según las leyes vigentes el impuesto personal de los cheques de comisión.',
    ],
  },
  {
    num: 18, title: 'Enmiendas',
    content: [
      'Sumak expresamente se reserva el derecho de alterar o enmendar precios de venta al por mayor, disponibilidad de producto y/o formulación, políticas y procedimientos, y plan de compensación. Tales enmiendas son automáticamente incorporadas como parte del contrato entre Sumak y los Distribuidores cuando son publicadas en literatura oficial de la compañía.',
    ],
  },
  {
    num: 19, title: 'Productos y Reclamos de Ingresos',
    content: [
      'Los Distribuidores de Sumak acuerdan no hacer representaciones falsas o fraudulentas acerca de la compañía, sus productos, servicios, plan de compensación, o potencial de ingresos. No deberán hacer ningún comentario acerca de los productos de Sumak que no esté respaldado por información contenida en literatura oficial de la compañía.',
      'Sumak se compromete y garantiza pagar hasta el 100% del valor comisionable de cada compra en la organización; esto es igual a $100 mensuales.',
    ],
  },
  {
    num: 20, title: 'Cuota Anual de Reanudación',
    content: [
      'Es requerido que los Distribuidores independientes reanuden sus contratos en la fecha de aniversario del mismo. No cancelar la cuota de reanudación del contrato para la fecha de aniversario será considerado como una renuncia y todos los contratos entre la compañía y el Distribuidor serán considerados nulos y caducados.',
    ],
  },
  {
    num: 21, title: 'Cambio de Domicilio del Distribuidor',
    content: [
      'Los Distribuidores Independientes deberán reportar cualquier cambio de domicilio enviando una notificación por escrito a la oficina de Sumak.',
    ],
  },
  {
    num: 22, title: 'Renuncia de un Distribuidor',
    content: [
      'Un Distribuidor tiene el derecho de terminar su contrato en cualquier momento y por cualquier razón —o sin razón, sin penalidad— dando notificación por escrito a la compañía en sus oficinas centrales con treinta (30) días de anticipación.',
      'Al final del periodo de notificación de los treinta (30) días, todos los derechos, comisiones, posición y compra al mayoreo cesan; el Distribuidor no tiene más derecho de publicitar, vender o promover productos de Sumak. Su genealogía será transferida a su patrocinador.',
      'Una vez finalizada la renuncia, el distribuidor renunciante no es elegible para ser patrocinado nuevamente dentro de Sumak por un periodo de seis (6) meses, contados desde la fecha de terminación del contrato.',
    ],
  },
  {
    num: 23, title: 'Terminación por Inactividad',
    content: [
      'Después de seis (6) meses de inactividad consecutiva, un Distribuidor será eliminado (borrado) de la estructura de comisión. Sin embargo, el Distribuidor borrado será elegible para una inmediata repatrocinación.',
    ],
  },
  {
    num: 24, title: 'Terminación del Contrato del Distribuidor',
    content: [
      'La compañía se reserva el derecho de terminar el contrato de cualquier Distribuidor en cualquier momento, o suspenderlo por un periodo probatorio, cuando se determine que el Distribuidor ha violado las provisiones del Contrato de Distribuidor, incluyendo este manual o las leyes aplicables.',
      'Ante tal terminación, la compañía notificará al Distribuidor al último domicilio registrado. El Distribuidor dado de baja acuerda cesar inmediatamente de presentarse como tal, y no será autorizado a regresar a la posición de Distribuidor con Sumak.',
      'Si el Distribuidor desea apelar la terminación, Sumak deberá recibir la apelación por escrito dentro de cinco (5) días desde la fecha de envío de la carta de terminación. Si la apelación no es recibida en ese plazo, la terminación será automáticamente final.',
      'Si la apelación es enviada a tiempo, Sumak la evaluará y reconsiderará, considerando cualquier otra acción apropiada, y notificará al Distribuidor de su decisión. La decisión de la compañía será final y no estará sujeta a ninguna otra evaluación.',
      'En cuanto a la terminación del contrato, todos los derechos, comisiones, posición y derechos de compras al por mayor cesan. La organización del Distribuidor cesado será transferida a su patrocinador. El Distribuidor cesado no será elegible para futuros patrocinios.',
    ],
  },
  {
    num: 25, title: 'Publicidad del Distribuidor',
    content: [
      'Como contratistas independientes, los Distribuidores pueden promover su negocio en cualquier manera ética y legal y publicar sin aprobación de la compañía siempre que no utilicen el nombre corporativo, logotipo, marca registrada o materiales con derechos reservados de Sumak. Cualquier publicidad que utilice estos elementos deberá ser aprobada por la compañía antes de publicarse, y deberá señalar que el individuo es un "Distribuidor Independiente".',
      'Se prohíbe a los Distribuidores contestar el teléfono de manera que pudiera dar la impresión de que han llamado a las oficinas corporativas de Sumak.',
      'La compañía prohíbe estrictamente a los Distribuidores el utilizar sitios en Internet para publicar o promover productos u oportunidades. La publicidad de Sumak fuera del sitio oficial de la empresa no está permitida bajo ningún concepto.',
      'Si el Distribuidor tiene su propio sitio personal de Internet, podrá publicar sus propios eventos, giras, charlas o seminarios, sus logros e invitar a personas a conocer la oportunidad que representa Sumak —junto con su dirección y teléfonos— pero deberá remitir a la página oficial de Sumak para dar a conocer información de productos, plan de pagos, videos, pilares de la empresa, eventos oficiales, seminarios, testimonios, reconocimientos e imagen oficial.',
      'La imagen gráfica empresarial y del sitio de Internet son propiedad exclusiva de Sumak; no pueden usarse sin consentimiento por escrito.',
    ],
  },
  {
    num: 26, title: 'Métodos de Pago y Entrega',
    content: [
      'La entrega de mercancía se realizará dentro de diez (10) días a partir de la fecha escrita en la orden de pedido, a no ser que un evento imprevisible cause un retraso en el envío.',
    ],
  },
  {
    num: 27, title: 'Invalidez de Cualquier Párrafo',
    content: [
      'En caso de que cualquier porción de estas políticas y procedimientos, de la solicitud y contrato de Distribuidores, o cualquier otro instrumento referido aquí, sea declarada inválida por una corte de jurisdicción competente, las reglas restantes, aplicaciones e instrumentos deberán permanecer en completa vigencia y efecto.',
    ],
  },
  {
    num: 28, title: 'Sanciones y Acciones de Cumplimiento',
    content: [
      'Las sanciones no serán ligeramente aplicadas, ni tampoco la compañía actuará arbitraria o injustamente en su aplicación. Sin embargo, un Distribuidor que viola estas políticas y procedimientos pone en peligro la integridad y buen nombre de todos los Distribuidores.',
      'La compañía se reserva el derecho de revocar la categoría de Distribuidor o de poner a los transgresores en un período probatorio, el cual podría retrasar su elegibilidad para avanzar en el plan de compensación.',
      'Para el beneficio de todos, es necesario que cada Distribuidor se sujete a la letra y espíritu de estas políticas y procedimientos.',
    ],
  },
  {
    num: 29, title: 'Reembolsos en la Reventa de Productos por los Distribuidores',
    content: [
      'Cualquier Distribuidor que revende productos al consumidor es responsable de pagar cualquier reembolso basado en las devoluciones. Es previsto que el Distribuidor conduzca su negocio de manera consistente con las políticas y procedimientos de la compañía.',
      'Cualquier violación de esta política resultará en motivos suficientes para suspensión o terminación de los derechos de Distribución.',
    ],
  },
];

// ── Grouping for the visual TOC ────────────────────────────────
const tocGroups = [
  { title: 'Inscripción y patrocinio', range: [1, 6] },
  { title: 'Transferencias y herencias', range: [7, 8] },
  { title: 'Responsabilidad legal y operativa', range: [9, 14] },
  { title: 'Compras y reventa', range: [15, 19] },
  { title: 'Vigencia y mantenimiento', range: [20, 24] },
  { title: 'Publicidad y cierre', range: [25, 29] },
];

export default function Manual() {
  useSEO({
    title: 'Manual del Distribuidor — Sumak Vida Ecuador',
    description:
      'Manual oficial del distribuidor SUMAK: 29 puntos sobre afiliación, compras, reventa, vigencia mensual, publicidad y reglas del sistema.',
    url: '/manual',
  });

  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowTopButton(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  return (
    <div className="bg-white">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20" style={{ background: 'linear-gradient(135deg, #0B2913 0%, #133A1E 50%, #0F2E18 100%)' }}>
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#D4AF37] opacity-[0.07] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#2B6E3A] opacity-[0.20] blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-7"
          >
            <ShieldCheck size={14} className="text-[#D4AF37]" />
            <span className="text-white text-xs font-semibold tracking-[0.2em] uppercase">Documento Oficial · Sumak Vida Ecuador S.A.</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading font-bold text-white leading-[1.05] mb-6"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
          >
            Manual de{' '}
            <span className="italic font-light text-gold-shimmer">políticas</span>,
            <br />
            procedimientos y ética
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-white/75 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Las reglas que rigen la relación entre Sumak Vida Ecuador S.A. y sus
            Distribuidores Independientes. La integridad, el respeto y la cooperación
            son la base de nuestra red.
          </motion.p>
        </div>
      </section>

      {/* ── INTRO ────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <Scale size={16} className="text-[#1A4E26]" />
              <span className="text-[#1A4E26] text-xs font-bold uppercase tracking-[0.25em]">
                Lo más importante: la ética
              </span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-5 leading-tight">
              Una imagen, un compromiso, una promesa.
            </h2>
            <p className="text-[#6B7280] text-base sm:text-lg leading-relaxed mb-4">
              Sumak se ha comprometido a proveer productos de la más alta calidad y un
              servicio excelente. A cambio de ese compromiso, la compañía espera que
              los Distribuidores Independientes de Sumak proyecten esa imagen en sus
              relaciones con los consumidores y con otros distribuidores.
            </p>
            <p className="text-[#6B7280] text-base sm:text-lg leading-relaxed">
              Como Distribuidor Independiente, usted es libre de administrar su negocio
              como considere apropiado. Sin embargo, es de mutuo beneficio —y ventajoso
              a largo plazo— si se somete a los estándares más altos de integridad y
              práctica justa en su papel como Distribuidor en Sumak.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── CÓDIGO DE ÉTICA ─────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-[#F4F7F5]" id="codigo-etica">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 mb-3">
              <Heart size={16} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em]">
                Código de ética
              </span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-4 leading-tight">
              Como Distribuidor Independiente de Sumak...
            </h2>
            <div className="w-16 h-1 bg-[#D4AF37] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            className="space-y-3"
          >
            {codigoEtica.map((item, idx) => (
              <motion.div
                key={idx}
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } } }}
                className="bg-white border border-[#C8D8CB] rounded-2xl p-5 flex items-start gap-4 hover:border-[#1A4E26]/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-[#1A4E26]/10 text-[#1A4E26] font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <p className="text-[#111111] text-sm sm:text-base leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ÍNDICE ───────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-white border-y border-[#C8D8CB]" id="indice">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-[#1A4E26]" />
              <span className="text-[#1A4E26] text-xs font-bold uppercase tracking-[0.3em]">
                Índice del manual
              </span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] mb-2">
              29 políticas y procedimientos
            </h2>
            <p className="text-[#6B7280] text-sm">Salta directamente a la sección que necesitas consultar.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tocGroups.map((group) => {
              const items = policies.filter((p) => p.num >= group.range[0] && p.num <= group.range[1]);
              return (
                <div key={group.title} className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-5">
                  <p className="text-[#1A4E26] text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
                    {group.title}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((p) => (
                      <li key={p.num}>
                        <button
                          onClick={() => scrollTo(`policy-${p.num}`)}
                          className="w-full text-left flex items-center gap-2 text-[#111111] text-sm hover:text-[#1A4E26] transition-colors group"
                        >
                          <span className="font-mono text-[10px] text-[#9CA3AF] group-hover:text-[#1A4E26] w-6 shrink-0">
                            {String(p.num).padStart(2, '0')}
                          </span>
                          <span className="flex-1">{p.title}</span>
                          <ChevronRight size={13} className="text-[#9CA3AF] group-hover:text-[#1A4E26] shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── POLÍTICAS Y PROCEDIMIENTOS ──────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-[#FAFBFA]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-3">
              <FileText size={16} className="text-[#1A4E26]" />
              <span className="text-[#1A4E26] text-xs font-bold uppercase tracking-[0.3em]">
                Políticas y procedimientos
              </span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3 leading-tight">
              Las reglas de la casa.
            </h2>
            <p className="text-[#6B7280] text-base max-w-2xl mx-auto leading-relaxed">
              Estos lineamientos forman parte del contrato entre Sumak y cada
              Distribuidor Independiente. Leerlos —y respetarlos— protege la
              integridad de toda la red.
            </p>
          </motion.div>

          <div className="space-y-4">
            {policies.map((policy, idx) => (
              <motion.article
                id={`policy-${policy.num}`}
                key={policy.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: Math.min(idx * 0.015, 0.2) }}
                className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden hover:border-[#1A4E26]/30 transition-colors scroll-mt-24"
              >
                <div className="flex items-stretch">
                  {/* Number column */}
                  <div className="bg-gradient-to-b from-[#1A4E26] to-[#0F2E18] text-white px-4 sm:px-5 py-6 sm:py-7 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[#D4AF37] text-[9px] font-bold uppercase tracking-widest mb-1">Sección</span>
                    <span className="font-heading font-bold text-2xl sm:text-3xl text-white leading-none">
                      {String(policy.num).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 sm:p-6">
                    <h3 className="font-heading font-bold text-[#111111] text-lg sm:text-xl mb-3 leading-tight">
                      {policy.title}
                    </h3>
                    <div className="space-y-3">
                      {policy.content.map((p, pi) => (
                        <p key={pi} className="text-[#4B5563] text-sm sm:text-base leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPROMISO (CLOSING) ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B2913 0%, #1A4E26 50%, #2B6E3A 100%)' }}>
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
          }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37] opacity-[0.08] blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-center mb-10"
          >
            <Sparkles size={28} className="text-[#D4AF37] mx-auto mb-5" />
            <h2 className="font-heading font-bold text-white leading-tight mb-2" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', letterSpacing: '0.25em' }}>
              COMPROMISO
            </h2>
            <div className="w-16 h-1 bg-[#D4AF37] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="space-y-5 text-white/85 text-base sm:text-lg leading-relaxed"
          >
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              Compromiso es lo que transforma una promesa en realidad. Es la energía,
              la corriente eléctrica que se necesita para generar la acción.
            </motion.p>
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              Es el poder para cambiar la cara de las cosas. El compromiso no es
              fácil: implica sacrificio, significa hacerse el tiempo cuando no lo
              tienes, encontrar nuevos recursos cuando pareciera no haber una
              solución, y superar obstáculos que parecerían imposibles —con la
              determinación única de lograr lo que decidiste.
            </motion.p>
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              Es el triunfo diario de tu integridad sobre tu escepticismo. Es salir
              adelante día tras día y año tras año.
            </motion.p>
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              Compromiso es más que solamente querer hacer algo cuando tengas el
              tiempo, cuando las circunstancias sean adecuadas o cuando alguien más
              comience. Se trata de elegir ser efectivo y hacerlo: encontrar el
              camino para hacer que ocurra con el riesgo de estar expuesto,
              vulnerable o a veces incluso quedar en ridículo.
            </motion.p>
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              Cada compromiso tiene su recompensa. Significa sentirte bien de saber
              que estás siendo honesto contigo mismo, con tu objetivo y con el mundo.
              Significa cumplimiento.
            </motion.p>
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              El compromiso nos ayuda a superar los miedos más grandes que tenemos
              como seres humanos: el miedo de brillar cuando alrededor vemos
              oscuridad, el miedo de ser inadecuados, el miedo a decidir sobre
              nuestras vidas y el miedo a liderar.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="font-heading italic text-2xl text-gold-shimmer mb-1">
              Confía y apóyate,
            </p>
            <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.4em]">
              Sumak
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── WELCOME + CONTACT ───────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[#1A4E26] text-xs font-bold uppercase tracking-[0.3em] mb-3">
              Bienvenido a Sumak
            </p>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] mb-4 leading-tight">
              Tu mundo en expansión.
            </h2>
            <p className="text-[#6B7280] text-base max-w-2xl mx-auto mb-10 leading-relaxed">
              Sumak procura entablar un largo y exitoso futuro con cada uno de
              ustedes. Si tienes preguntas sobre este manual o necesitas asesoría,
              contáctanos directamente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
              <a
                href={`tel:${contactInfo.telefono1}`}
                className="flex items-center gap-3 bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-4 hover:border-[#1A4E26]/40 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1A4E26]/10 text-[#1A4E26] flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-0.5">Teléfono</p>
                  <p className="text-[#111111] text-sm font-semibold">{contactInfo.telefono1}</p>
                </div>
              </a>
              <a
                href={`mailto:${contactInfo.emailPrincipal}`}
                className="flex items-center gap-3 bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-4 hover:border-[#1A4E26]/40 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1A4E26]/10 text-[#1A4E26] flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-0.5">Email</p>
                  <p className="text-[#111111] text-sm font-semibold truncate">{contactInfo.emailPrincipal}</p>
                  <p className="text-[#6B7280] text-xs truncate">{contactInfo.emailSecundario}</p>
                </div>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contacto"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all shadow-[0_8px_24px_rgba(26,78,38,0.25)]"
              >
                Ir a Contacto
              </Link>
              <Link
                to="/registro"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#1A4E26]/30 text-[#1A4E26] font-bold text-sm hover:border-[#1A4E26] hover:bg-[#1A4E26]/5 transition-all"
              >
                Únete a Sumak
              </Link>
            </div>

            <p className="mt-10 text-[#9CA3AF] text-xs">
              Sumak Vida Ecuador S.A. · RUC {contactInfo.ruc}
              <span className="mx-2">·</span>
              {contactInfo.direccion}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Back to top */}
      {showTopButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-[#1A4E26] text-white shadow-2xl hover:bg-[#163F1E] flex items-center justify-center transition-all"
          aria-label="Volver arriba"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </div>
  );
}
