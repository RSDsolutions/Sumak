import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { certificate_id } = await req.json();

    if (!certificate_id) {
      return new Response(JSON.stringify({ error: "Falta certificate_id" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Obtener datos de la credencial (certificado o diploma automático)
    const { data: cert, error: certError } = await supabaseClient
      .from('academy_diploma_issuances')
      .select(`
        *,
        diploma_type:academy_diploma_types(*),
        template:academy_diploma_templates(*)
      `)
      .eq('id', certificate_id)
      .single();

    if (certError || !cert) {
      throw new Error("Credencial no encontrada");
    }

    if (cert.status !== 'pending_pdf' && cert.pdf_storage_path) {
      return new Response(
        JSON.stringify({
          success: true,
          path: cert.pdf_storage_path,
          message: "El PDF de esta credencial ya se encuentra generado.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Crear documento PDF vectorial (A4 Horizontal por defecto)
    const pdfDoc = await PDFDocument.create();
    let width = 841.89;
    let height = 595.28;

    if (cert.template?.page_size === 'letter') {
      width = 792;
      height = 612;
    }
    if (cert.template?.orientation === 'portrait') {
      const temp = width;
      width = height;
      height = temp;
    }

    const page = pdfDoc.addPage([width, height]);
    const paper = rgb(0.98, 0.99, 0.97);
    page.drawRectangle({ x: 0, y: 0, width, height, color: paper });

    if (cert.template?.background_image_url) {
      try {
        const imgRes = await fetch(cert.template.background_image_url);
        if (imgRes.ok) {
          const imgBytes = await imgRes.arrayBuffer();
          const bgImage = cert.template.background_image_url.endsWith('.png')
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);
          page.drawImage(bgImage, { x: 0, y: 0, width, height, opacity: 0.2 });
        }
      } catch (e) {
        console.warn("No se pudo cargar imagen de fondo:", e);
      }
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const hexToRgbColor = (hex: string) => {
      hex = hex.replace(/^#/, '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const bigint = parseInt(hex, 16);
      return rgb(
        ((bigint >> 16) & 255) / 255,
        ((bigint >> 8) & 255) / 255,
        (bigint & 255) / 255
      );
    };

    const getFont = (fStr: string) => {
      if (fStr === 'bold') return boldFont;
      if (fStr === 'italic') return italicFont;
      return font;
    };

    const drawDynamicText = (text: string, config: any) => {
      if (!config || config.visible === false || !text) return;
      const f = getFont(config.font || 'normal');
      const size = config.size || 14;
      const color = hexToRgbColor(config.color || '#000000');

      const textWidth = f.widthOfTextAtSize(text, size);
      let renderX = config.x;
      if (config.align === 'center') {
        renderX = config.x - textWidth / 2;
      } else if (config.align === 'right') {
        renderX = config.x - textWidth;
      }
      const renderY = height - config.y;
      page.drawText(text, { x: renderX, y: renderY, size, font: f, color });
    };

    // Bordes ceremoniales SUMAK si no hay fondo personalizado
    if (!cert.template?.background_image_url) {
      const ink = hexToRgbColor('#0B2913');
      const gold = hexToRgbColor('#D4AF37');
      const margin = 28;
      page.drawRectangle({
        x: margin,
        y: margin,
        width: width - margin * 2,
        height: height - margin * 2,
        borderColor: ink,
        borderWidth: 3,
      });
      page.drawRectangle({
        x: margin + 8,
        y: margin + 8,
        width: width - (margin + 8) * 2,
        height: height - (margin + 8) * 2,
        borderColor: gold,
        borderWidth: 1.2,
      });

      const headerTitle =
        cert.credential_type === 'diploma'
          ? 'DIPLOMA DE ESPECIALIZACIÓN'
          : 'CERTIFICADO DE APROBACIÓN';

      drawDynamicText('ACADEMIA SUMAK VIDA ECUADOR', {
        x: width / 2,
        y: 85,
        size: 14,
        font: 'bold',
        align: 'center',
        color: '#D4AF37',
      });
      drawDynamicText(headerTitle, {
        x: width / 2,
        y: 120,
        size: 26,
        font: 'bold',
        align: 'center',
        color: '#0B2913',
      });
      drawDynamicText('Se otorga la presente credencial académica a:', {
        x: width / 2,
        y: 175,
        size: 12,
        font: 'italic',
        align: 'center',
        color: '#4B5563',
      });
      drawDynamicText('Por haber completado y aprobado satisfactoriamente:', {
        x: width / 2,
        y: 265,
        size: 12,
        font: 'normal',
        align: 'center',
        color: '#4B5563',
      });
    }

    const layoutConfig = cert.template?.layout_config || {
      participant_name: {
        x: width / 2,
        y: 225,
        size: 32,
        color: '#0B2913',
        align: 'center',
        font: 'bold',
        visible: true,
      },
      course_name: {
        x: width / 2,
        y: 305,
        size: 20,
        color: '#1A4E26',
        align: 'center',
        font: 'bold',
        visible: true,
      },
      issue_date: {
        x: width / 2,
        y: 365,
        size: 12,
        color: '#374151',
        align: 'center',
        font: 'normal',
        visible: true,
      },
      signatory: {
        x: width / 2,
        y: 455,
        size: 13,
        color: '#0B2913',
        align: 'center',
        font: 'bold',
        visible: true,
      },
      verification_text: {
        x: width / 2,
        y: height - 48,
        size: 9,
        color: '#92400E',
        align: 'center',
        font: 'normal',
        visible: true,
      },
    };

    const courseOrProgramTitle = cert.course_name || cert.program_name || 'Curso Académico SUMAK';
    const dateText = `Emitido el ${new Date(cert.issued_at).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    const footerText = `Credencial N° ${cert.diploma_number}  |  Código de Verificación: ${cert.verification_code}`;

    drawDynamicText(cert.participant_name || 'Estudiante SUMAK', layoutConfig.participant_name);
    drawDynamicText(courseOrProgramTitle, layoutConfig.course_name);
    drawDynamicText(dateText, layoutConfig.issue_date);
    drawDynamicText(
      cert.template?.signatory_name || 'Dr. Luis Paredes · Formador de Formadores SUMAK',
      layoutConfig.signatory
    );
    drawDynamicText(footerText, layoutConfig.verification_text);

    // 3. Dibujar Código QR Vectorial Real de Verificación Pública
    try {
      const verifyUrl = `https://www.sumakecuador.lat/academia/verificar?code=${encodeURIComponent(
        cert.verification_code
      )}`;
      const qr = qrcode(0, 'M');
      qr.addData(verifyUrl);
      qr.make();
      const moduleCount = qr.getModuleCount();
      const qrSize = 72;
      const cellSize = qrSize / moduleCount;
      const qrX = width - marginQr(width) - qrSize;
      const qrY = 52;

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            page.drawRectangle({
              x: qrX + col * cellSize,
              y: qrY + (moduleCount - 1 - row) * cellSize,
              width: cellSize + 0.2,
              height: cellSize + 0.2,
              color: hexToRgbColor('#0B2913'),
            });
          }
        }
      }
    } catch (qrErr) {
      console.warn('No se pudo renderizar QR vectorial:', qrErr);
    }

    const pdfBytes = await pdfDoc.save();
    const documentHash = await computeSha256Hex(pdfBytes);

    const folderId = cert.course_id || cert.program_id || 'general';
    const storagePath = `certificados/${folderId}/${cert.diploma_number}.pdf`;

    const { error: uploadError } = await supabaseClient.storage
      .from('academy-diplomas')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabaseClient
      .from('academy_diploma_issuances')
      .update({
        pdf_storage_path: storagePath,
        document_hash: documentHash,
        status: 'valid',
      })
      .eq('id', certificate_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        path: storagePath,
        document_hash: documentHash,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error("Error generating certificate PDF:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function marginQr(_width: number): number {
  return 54;
}
