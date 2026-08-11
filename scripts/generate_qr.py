#!/usr/bin/env python3
"""
SUMAK ECUADOR — Generador de Codigos QR y Credenciales Digitales para Clientes
=============================================================================
- Exclusivo para Clientes y Distribuidores de la base de datos de SUMAK.
- Genera codigos QR de alta resolucion con esquinas redondeadas y logo centrado (logo_qr.png).
- Genera tarjetas / credenciales de dos caras (Frente y Reverso):
    * FRENTE: Logo corporativo, foto/avatar, nombre completo del cliente, codigo, rango y estado activo.
    * REVERSO: Codigo QR redondeado con logo central, instrucciones de escaneo, SIN texto de enlace visible.
    * VISTA DUAL: Frente y Reverso en un lienzo de presentacion listo para imprimir o compartir.
- Modo 100% solo lectura (sin modificar ni editar la base de datos).

Uso:
  python scripts/generate_qr.py --cliente SUMAK-00030
  python scripts/generate_qr.py --cliente felixalvarez
  python scripts/generate_qr.py --todos
  python scripts/generate_qr.py --custom "https://sumakecuador.com/registro?ref=SUMAK-00001" --name "qr_invitado"
"""

import os
import sys
import json
import argparse
import io
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from dotenv import load_dotenv

# Forzar encoding utf-8 en consola Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Cargar variables de entorno
load_dotenv('.env.local')
load_dotenv('.env')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'https://pdzviwvurafyvbetjkhr.supabase.co')
SUPABASE_ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY', '')
BASE_WEB_URL = os.getenv('APP_URL', 'https://sumakecuador.com').rstrip('/')

WORKSPACE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LOGO_PATH = WORKSPACE_DIR / 'logo_qr.png'
HEADER_LOGO_PATH = WORKSPACE_DIR / 'public' / 'LOGO_SUMAK.png'
OUTPUT_DIR = WORKSPACE_DIR / 'output_qr'
DATA_SNAPSHOT_PATH = WORKSPACE_DIR / 'scripts' / 'distribuidores_snapshot.json'


def sanitize_filename(name: str) -> str:
    """Convierte un texto en un nombre seguro para archivo."""
    if not name:
        return "sin_nombre"
    clean = "".join(c if c.isalnum() or c in ('-', '_', '.') else '_' for c in name)
    while '__' in clean:
        clean = clean.replace('__', '_')
    return clean.strip('_')


def get_font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    """Carga fuentes del sistema o cae en la default."""
    font_names = []
    if mono:
        font_names = ["consola.ttf", "cour.ttf", "arial.ttf"]
    elif bold:
        font_names = ["arialbd.ttf", "segoeuib.ttf", "calibrib.ttf", "tahomabd.ttf"]
    else:
        font_names = ["arial.ttf", "segoeui.ttf", "calibri.ttf", "tahoma.ttf"]

    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    try:
        return ImageFont.load_default()
    except Exception:
        return None


def hex_to_rgb(hex_str: str) -> tuple:
    """Convierte hex '#1A4E26' a tupla RGB."""
    hex_clean = hex_str.lstrip('#')
    if len(hex_clean) == 3:
        hex_clean = "".join(2 * c for c in hex_clean)
    return tuple(int(hex_clean[i:i+2], 16) for i in (0, 2, 4))


def create_qr_with_logo(
    data_url: str,
    logo_path: Path = DEFAULT_LOGO_PATH,
    fill_color: str = "#1A4E26", # Verde corporativo Sumak
    back_color: str = "#FFFFFF",
    qr_size: int = 1000,
    logo_ratio: float = 0.25, # 25% del tamano del QR
) -> Image.Image:
    """
    Genera un codigo QR con:
    1. Modulos con esquinas redondeadas (RoundedModuleDrawer).
    2. Ojos / esquinas de deteccion personalizadas redondeadas.
    3. Logo corporativo incrustado en el centro sobre placa protectora blanca.
    """
    border = 2
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=20,
        border=border,
    )
    qr.add_data(data_url)
    qr.make(fit=True)

    rgb_fill = hex_to_rgb(fill_color)
    rgb_back = hex_to_rgb(back_color)

    # 1. Generar base con modulos redondeados
    qr_img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(back_color=rgb_back, front_color=rgb_fill)
    ).convert("RGBA")

    # 2. Redibujar las 3 esquinas de posicion con esquinas redondeadas
    w, h = qr_img.size
    draw = ImageDraw.Draw(qr_img)
    mod_count = qr.modules_count
    cell_size = w / (mod_count + border * 2)

    eyes = [
        (border, border),                    # Superior Izquierda
        (border + mod_count - 7, border),    # Superior Derecha
        (border, border + mod_count - 7),    # Inferior Izquierda
    ]

    fill_rgba = (*rgb_fill, 255)
    bg_rgba = (*rgb_back, 255)

    for ex, ey in eyes:
        x0 = int(ex * cell_size)
        y0 = int(ey * cell_size)
        x1 = int((ex + 7) * cell_size)
        y1 = int((ey + 7) * cell_size)

        # Limpiar ojo cuadrado existente
        draw.rectangle([(x0, y0), (x1, y1)], fill=bg_rgba)

        # Marco exterior redondeado (7x7 modulos)
        out_r = int(cell_size * 2.2)
        draw.rounded_rectangle([(x0, y0), (x1, y1)], radius=out_r, fill=fill_rgba)

        # Hueco blanco intermedio (5x5 modulos)
        ix0 = int((ex + 1) * cell_size)
        iy0 = int((ey + 1) * cell_size)
        ix1 = int((ex + 6) * cell_size)
        iy1 = int((ey + 6) * cell_size)
        in_r = int(cell_size * 1.5)
        draw.rounded_rectangle([(ix0, iy0), (ix1, iy1)], radius=in_r, fill=bg_rgba)

        # Punto solido central redondeado (3x3 modulos)
        cx0 = int((ex + 2) * cell_size)
        cy0 = int((ey + 2) * cell_size)
        cx1 = int((ex + 5) * cell_size)
        cy1 = int((ey + 5) * cell_size)
        cnt_r = int(cell_size * 1.2)
        draw.rounded_rectangle([(cx0, cy0), (cx1, cy1)], radius=cnt_r, fill=fill_rgba)

    # Redimensionar en alta resolucion
    qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)

    # 3. Incrustar el logo en el centro
    if logo_path and Path(logo_path).exists():
        logo = Image.open(logo_path).convert("RGBA")
        
        target_logo_width = int(qr_size * logo_ratio)
        w_percent = (target_logo_width / float(logo.size[0]))
        target_logo_height = int((float(logo.size[1]) * float(w_percent)))
        logo = logo.resize((target_logo_width, target_logo_height), Image.Resampling.LANCZOS)

        badge_padding = int(target_logo_width * 0.08)
        badge_w = target_logo_width + (badge_padding * 2)
        badge_h = target_logo_height + (badge_padding * 2)

        badge = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
        b_draw = ImageDraw.Draw(badge)
        radius = int(min(badge_w, badge_h) * 0.28)
        
        # Placa blanca con borde suave
        b_draw.rounded_rectangle(
            [(0, 0), (badge_w, badge_h)],
            radius=radius,
            fill=(255, 255, 255, 255),
            outline=(200, 216, 203, 255),
            width=4
        )

        badge.paste(logo, (badge_padding, badge_padding), mask=logo)

        pos_x = (qr_size - badge_w) // 2
        pos_y = (qr_size - badge_h) // 2
        qr_img.paste(badge, (pos_x, pos_y), mask=badge)

    return qr_img


def create_avatar_image(name: str, avatar_url: str = None, size: int = 340) -> Image.Image:
    """
    Descarga o genera una foto de perfil circular de alta calidad.
    Si no hay foto, dibuja un avatar con iniciales sobre fondo verde Sumak y anillo dorado.
    """
    avatar_img = None
    if avatar_url and (avatar_url.startswith("http://") or avatar_url.startswith("https://")):
        try:
            resp = requests.get(avatar_url, timeout=5)
            if resp.status_code == 200:
                avatar_img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        except Exception:
            avatar_img = None

    if not avatar_img:
        avatar_img = Image.new("RGBA", (size, size), (26, 78, 38, 255))
        draw = ImageDraw.Draw(avatar_img)
        draw.ellipse([(0, 0), (size, size)], fill=(26, 78, 38, 255), outline=(212, 175, 55, 255), width=8)
        
        words = [w for w in name.replace('@', '').split() if w]
        if len(words) >= 2:
            initials = f"{words[0][0]}{words[1][0]}".upper()
        elif len(words) == 1:
            initials = words[0][:2].upper()
        else:
            initials = "SK"

        font_init = get_font(int(size * 0.42), bold=True)
        draw.text((size // 2, size // 2), initials, font=font_init, fill=(255, 255, 255), anchor="mm")
    else:
        avatar_img = ImageOps.fit(avatar_img, (size, size), centering=(0.5, 0.5))

    mask = Image.new("L", (size, size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.ellipse([(0, 0), (size, size)], fill=255)

    final_avatar = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_avatar.paste(avatar_img, (0, 0), mask=mask)

    ring_draw = ImageDraw.Draw(final_avatar)
    ring_draw.ellipse([(2, 2), (size - 3, size - 3)], outline=(212, 175, 55, 255), width=7)

    return final_avatar


def create_card_front(
    name: str,
    code: str,
    paquete: str = None,
    rol: str = "distribuidor",
    estado: str = "activo",
    avatar_url: str = None,
    width: int = 1000,
    height: int = 1500,
) -> Image.Image:
    """
    Genera el FRENTE de la tarjeta de identificacion del Cliente / Distribuidor.
    Incluye: Cabecera con logo oficial, foto/avatar, nombre completo, codigo, rango y estado activo.
    """
    card = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(card)

    margin = 35
    draw.rounded_rectangle(
        [(margin, margin), (width - margin, height - margin)],
        radius=40,
        fill=(250, 252, 250, 255),
        outline=(200, 216, 203, 255),
        width=3
    )

    # Cabecera verde corporativa
    header_h = 240
    draw.rounded_rectangle(
        [(margin, margin), (width - margin, margin + header_h)],
        radius=40,
        fill=(26, 78, 38, 255),
    )
    draw.rectangle(
        [(margin, margin + header_h - 40), (width - margin, margin + header_h)],
        fill=(26, 78, 38, 255)
    )

    # Linea divisoria dorada
    draw.rectangle(
        [(margin, margin + header_h), (width - margin, margin + header_h + 8)],
        fill=(212, 175, 55, 255)
    )

    # Logo en cabecera
    if HEADER_LOGO_PATH.exists():
        h_logo = Image.open(HEADER_LOGO_PATH).convert("RGBA")
        target_h = 130
        ratio = target_h / float(h_logo.size[1])
        target_w = int(h_logo.size[0] * ratio)
        h_logo = h_logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
        logo_x = (width - target_w) // 2
        logo_y = margin + 35
        card.paste(h_logo, (logo_x, logo_y), mask=h_logo)
    else:
        f_head = get_font(54, bold=True)
        draw.text((width // 2, margin + 80), "SUMAK VIDA", font=f_head, fill=(255, 255, 255), anchor="mm")

    f_subhead = get_font(22, bold=True)
    draw.text((width // 2, margin + 195), "CREDENCIAL OFICIAL DE DISTRIBUIDOR", font=f_subhead, fill=(212, 175, 55), anchor="mm")

    # Foto / Avatar
    avatar_size = 320
    avatar_y = margin + header_h + 50
    avatar = create_avatar_image(name, avatar_url, size=avatar_size)
    avatar_x = (width - avatar_size) // 2
    card.paste(avatar, (avatar_x, avatar_y), mask=avatar)

    # Nombre
    f_name = get_font(38, bold=True)
    display_name = name.upper() if name else "DISTRIBUIDOR INDEPENDIENTE"
    if len(display_name) > 34:
        display_name = display_name[:32] + "..."
    if len(display_name) > 26:
        f_name = get_font(32, bold=True)

    name_y = avatar_y + avatar_size + 50
    draw.text((width // 2, name_y), display_name, font=f_name, fill=(17, 17, 17), anchor="mm")

    # Codigo del Distribuidor
    code_box_w = 420
    code_box_h = 70
    code_box_x = (width - code_box_w) // 2
    code_box_y = name_y + 40

    draw.rounded_rectangle(
        [(code_box_x, code_box_y), (code_box_x + code_box_w, code_box_y + code_box_h)],
        radius=20,
        fill=(235, 244, 237, 255),
        outline=(26, 78, 38, 120),
        width=2
    )

    f_code_lbl = get_font(18, bold=True)
    f_code_val = get_font(30, bold=True, mono=True)
    draw.text((width // 2, code_box_y + 22), "CÓDIGO OFICIAL", font=f_code_lbl, fill=(107, 114, 128), anchor="mm")
    draw.text((width // 2, code_box_y + 50), code, font=f_code_val, fill=(26, 78, 38), anchor="mm")

    # Rango / Categoria
    rango_str = f"PAQUETE {paquete.upper()}" if paquete else "DISTRIBUIDOR INDEPENDIENTE"
    if rol == "admin":
        rango_str = "ADMINISTRADOR GENERAL"
    elif rol == "operaciones":
        rango_str = "EQUIPO DE OPERACIONES"

    f_rango_lbl = get_font(18, bold=True)
    f_rango_val = get_font(28, bold=True)
    
    rango_y = code_box_y + code_box_h + 45
    draw.text((width // 2, rango_y), "RANGO / CATEGORÍA", font=f_rango_lbl, fill=(156, 163, 175), anchor="mm")
    draw.text((width // 2, rango_y + 35), rango_str, font=f_rango_val, fill=(212, 175, 55), anchor="mm")

    # Estado Activo (Badge verde esmeralda con indicador luminoso)
    badge_w = 260
    badge_h = 55
    badge_x = (width - badge_w) // 2
    badge_y = rango_y + 85

    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=28,
        fill=(235, 247, 238, 255),
        outline=(34, 197, 94, 255),
        width=2
    )

    dot_radius = 8
    dot_x = badge_x + 35
    dot_y = badge_y + (badge_h // 2)
    draw.ellipse([(dot_x - dot_radius, dot_y - dot_radius), (dot_x + dot_radius, dot_y + dot_radius)], fill=(34, 197, 94, 255))

    f_badge = get_font(22, bold=True)
    estado_text = f"ESTADO: {estado.upper()}"
    draw.text((badge_x + 140, badge_y + (badge_h // 2)), estado_text, font=f_badge, fill=(26, 78, 38), anchor="mm")

    # Pie
    f_foot = get_font(17, bold=False)
    draw.text((width // 2, height - margin - 35), "VÁLIDO EN TODO EL TERRITORIO NACIONAL", font=f_foot, fill=(156, 163, 175), anchor="mm")

    return card


def create_card_back(
    qr_img: Image.Image,
    name: str,
    code: str,
    width: int = 1000,
    height: int = 1500,
) -> Image.Image:
    """
    Genera el REVERSO de la tarjeta con:
    - Encabezado institucional.
    - Codigo QR redondeado en alta definicion con logo centrado.
    - Instrucciones de escaneo.
    - SIN link de texto visible (oculto en el diseno).
    - Pie oficial.
    """
    card = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(card)

    margin = 35
    draw.rounded_rectangle(
        [(margin, margin), (width - margin, height - margin)],
        radius=40,
        fill=(250, 252, 250, 255),
        outline=(200, 216, 203, 255),
        width=3
    )

    # Cabecera verde
    header_h = 180
    draw.rounded_rectangle(
        [(margin, margin), (width - margin, margin + header_h)],
        radius=40,
        fill=(26, 78, 38, 255),
    )
    draw.rectangle(
        [(margin, margin + header_h - 40), (width - margin, margin + header_h)],
        fill=(26, 78, 38, 255)
    )

    draw.rectangle(
        [(margin, margin + header_h), (width - margin, margin + header_h + 8)],
        fill=(212, 175, 55, 255)
    )

    f_head_back = get_font(38, bold=True)
    f_sub_back = get_font(22, bold=True)
    draw.text((width // 2, margin + 65), "SUMAK VIDA ECUADOR", font=f_head_back, fill=(255, 255, 255), anchor="mm")
    draw.text((width // 2, margin + 120), "CÓDIGO DIGITAL DE AFILIACIÓN", font=f_sub_back, fill=(212, 175, 55), anchor="mm")

    # Contenedor del QR
    qr_display_size = 720
    qr_resized = qr_img.resize((qr_display_size, qr_display_size), Image.Resampling.LANCZOS)
    
    qr_card_padding = 25
    qr_box_size = qr_display_size + (qr_card_padding * 2)
    qr_box_x = (width - qr_box_size) // 2
    qr_box_y = margin + header_h + 50

    draw.rounded_rectangle(
        [(qr_box_x, qr_box_y), (qr_box_x + qr_box_size, qr_box_y + qr_box_size)],
        radius=30,
        fill=(255, 255, 255, 255),
        outline=(200, 216, 203, 255),
        width=3
    )

    card.paste(qr_resized, (qr_box_x + qr_card_padding, qr_box_y + qr_card_padding), mask=qr_resized)

    # Instrucciones (SIN mostrar enlace en texto plano)
    inst_y = qr_box_y + qr_box_size + 45
    f_inst_title = get_font(26, bold=True)
    f_inst_desc = get_font(21, bold=False)

    draw.text((width // 2, inst_y), "¡ESCANEA Y CONÉCTATE!", font=f_inst_title, fill=(26, 78, 38), anchor="mm")
    
    desc_lines = [
        "Apunta la cámara de tu teléfono a este código QR",
        "para afiliarte directamente como nuevo distribuidor",
        "o comprar tus productos con descuento exclusivo.",
    ]
    
    line_y = inst_y + 40
    for line in desc_lines:
        draw.text((width // 2, line_y), line, font=f_inst_desc, fill=(75, 85, 99), anchor="mm")
        line_y += 30

    f_ref_code = get_font(20, bold=True, mono=True)
    draw.text((width // 2, line_y + 20), f"Distribuidor ID: {code}", font=f_ref_code, fill=(156, 163, 175), anchor="mm")

    f_foot = get_font(18, bold=True)
    draw.text((width // 2, height - margin - 35), "www.sumakecuador.com • Soporte Oficial", font=f_foot, fill=(26, 78, 38), anchor="mm")

    return card


def create_card_dual_preview(front: Image.Image, back: Image.Image) -> Image.Image:
    """
    Une el Frente y el Reverso lado a lado en un lienzo de presentacion (2200 x 1650 px).
    """
    cw, ch = front.size
    gap = 80
    margin = 70
    canvas_w = (cw * 2) + gap + (margin * 2)
    canvas_h = ch + (margin * 2) + 60

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (235, 240, 237, 255))
    draw = ImageDraw.Draw(canvas)

    f_label = get_font(32, bold=True)
    draw.text((margin + (cw // 2), margin - 15), "FRENTE", font=f_label, fill=(26, 78, 38), anchor="mm")
    draw.text((margin + cw + gap + (cw // 2), margin - 15), "REVERSO", font=f_label, fill=(26, 78, 38), anchor="mm")

    canvas.paste(front, (margin, margin + 25), mask=front)
    canvas.paste(back, (margin + cw + gap, margin + 25), mask=back)

    return canvas


def load_clientes():
    """Carga los clientes/distribuidores desde el snapshot de solo lectura."""
    if DATA_SNAPSHOT_PATH.exists():
        with open(DATA_SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def process_cliente(cliente_data: dict, base_url: str, logo_path: Path, color: str, generate_card: bool = True):
    """Genera los archivos QR y credenciales para un cliente/distribuidor."""
    dist_out = OUTPUT_DIR / 'clientes'
    cards_out = OUTPUT_DIR / 'tarjetas'
    dist_out.mkdir(parents=True, exist_ok=True)
    cards_out.mkdir(parents=True, exist_ok=True)

    cod = cliente_data.get('codigo_distribuidor') or "CLIENTE"
    raw_nom = cliente_data.get('nombre_completo')
    u_name = cliente_data.get('username')
    paquete = cliente_data.get('paquete')
    rol = cliente_data.get('rol', 'distribuidor')
    estado = cliente_data.get('estado', 'activo')
    avatar_url = cliente_data.get('avatar_url')

    display_name = raw_nom if (raw_nom and raw_nom.strip()) else (f"@{u_name}" if u_name else f"Cliente {cod}")
    ref_param = u_name if u_name else cod
    url = f"{base_url}/registro?ref={ref_param}"

    clean_label = sanitize_filename(display_name.replace('@', ''))
    file_label = f"QR_{cod}_{clean_label}"
    qr_filename = dist_out / f"{file_label}.png"

    # Generar QR redondeado con logo centrado
    qr_img = create_qr_with_logo(url, logo_path=logo_path, fill_color=color)
    qr_img.save(qr_filename, format="PNG")

    front_path, back_path, dual_path = None, None, None
    if generate_card:
        front = create_card_front(display_name, cod, paquete=paquete, rol=rol, estado=estado, avatar_url=avatar_url)
        back = create_card_back(qr_img, display_name, cod)
        dual = create_card_dual_preview(front, back)

        front_path = cards_out / f"CARNET_FRENTE_{cod}_{clean_label}.png"
        back_path = cards_out / f"CARNET_REVERSO_{cod}_{clean_label}.png"
        dual_path = cards_out / f"CARNET_DUAL_{cod}_{clean_label}.png"

        front.save(front_path, format="PNG")
        back.save(back_path, format="PNG")
        dual.save(dual_path, format="PNG")

    return {
        'nombre': display_name,
        'codigo': cod,
        'url': url,
        'qr_file': qr_filename,
        'front_file': front_path,
        'back_file': back_path,
        'dual_file': dual_path
    }


def main():
    parser = argparse.ArgumentParser(description="Generador de Codigos QR y Credenciales Digitales para Clientes de SUMAK.")
    parser.add_argument('--cliente', '--distribuidor', dest='cliente', type=str, help="Codigo o username del cliente (ej. SUMAK-00030 o felixalvarez)")
    parser.add_argument('--todos', '--clientes', '--distribuidores', dest='todos', action='store_true', help="Generar QR y credenciales para todos los clientes activos")
    parser.add_argument('--custom', type=str, help="URL personalizada para generar un QR de cliente/invitado")
    parser.add_argument('--name', type=str, default="qr_cliente", help="Nombre del archivo para el QR custom")
    parser.add_argument('--base-url', type=str, default=BASE_WEB_URL, help="URL base del sitio web")
    parser.add_argument('--color', type=str, default="#1A4E26", help="Color HEX del QR (ej. #1A4E26 o #000000)")
    parser.add_argument('--logo', type=str, default=str(DEFAULT_LOGO_PATH), help="Ruta al archivo del logo")
    parser.add_argument('--no-card', action='store_true', help="Generar solo el codigo QR sin las tarjetas/carnet")

    args = parser.parse_args()
    logo_path = Path(args.logo)
    base_url = args.base_url.rstrip('/')
    generate_card = not args.no_card

    if not any([args.cliente, args.todos, args.custom]):
        print("\n========================================================")
        print("  SUMAK ECUADOR — Generador de QR y Credenciales Digitales")
        print("                 (Exclusivo para Clientes)")
        print("========================================================")
        print("Ejemplos de uso:")
        print("  python scripts/generate_qr.py --cliente SUMAK-00030")
        print("  python scripts/generate_qr.py --cliente felixalvarez")
        print("  python scripts/generate_qr.py --todos")
        print(f"  python scripts/generate_qr.py --custom \"{base_url}/registro?ref=SUMAK-00001\" --name \"invitado\"")
        print("  python scripts/generate_qr.py --cliente SUMAK-00030 --no-card  (solo QR)")
        print()
        return

    # 1. Modo QR Personalizado
    if args.custom:
        custom_out = OUTPUT_DIR / 'custom'
        custom_out.mkdir(parents=True, exist_ok=True)
        url = args.custom
        filename = custom_out / f"{sanitize_filename(args.name)}.png"
        img = create_qr_with_logo(url, logo_path=logo_path, fill_color=args.color)
        img.save(filename, format="PNG")
        print(f"[OK] QR Custom para Cliente generado exitosamente:")
        print(f"     URL: {url}")
        print(f"     Archivo: {filename}\n")

    # 2. Modo Cliente Especifico
    if args.cliente:
        codigo = args.cliente.strip().upper()
        clientes = load_clientes()
        found = next((d for d in clientes if (d.get('codigo_distribuidor') == codigo or (d.get('username') and d.get('username').upper() == codigo))), None)
        
        if not found:
            # Crear registro sintetico si no esta en snapshot
            found = {
                'codigo_distribuidor': codigo,
                'nombre_completo': None,
                'username': args.cliente.strip(),
                'rol': 'distribuidor',
                'estado': 'activo',
                'paquete': None
            }

        res = process_cliente(found, base_url, logo_path, args.color, generate_card=generate_card)
        print(f"[OK] Credencial y QR de Cliente generados exitosamente:")
        print(f"     Cliente:        {res['nombre']} ({res['codigo']})")
        print(f"     URL Codificada: {res['url']} (oculta visualmente en carnet)")
        print(f"     Archivo QR:     {res['qr_file']}")
        if generate_card:
            print(f"     Carnet Frente:  {res['front_file']}")
            print(f"     Carnet Reverso: {res['back_file']}")
            print(f"     Vista Dual:     {res['dual_file']}")
        print()

    # 3. Modo Todos los Clientes
    if args.todos:
        clientes = load_clientes()
        print(f"[*] Generando codigos QR y credenciales para {len(clientes)} clientes...")
        count = 0
        for d in clientes:
            if not d.get('codigo_distribuidor'):
                continue
            process_cliente(d, base_url, logo_path, args.color, generate_card=generate_card)
            count += 1
        print(f"[OK] Se procesaron exitosamente {count} clientes en '{OUTPUT_DIR}'.\n")


if __name__ == '__main__':
    main()
