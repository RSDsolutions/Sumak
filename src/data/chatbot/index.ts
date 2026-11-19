import { botWebProfile } from './botWeb';
import { botPlatformProfile } from './botPlatform';
import { botAcademyProfile } from './botAcademy';
import type { ChatbotId, ChatbotNode, ChatbotProfileConfig } from './types';

export * from './types';

export const CHATBOT_PROFILES: Record<ChatbotId, ChatbotProfileConfig> = {
  web: botWebProfile,
  platform: botPlatformProfile,
  academy: botAcademyProfile,
};

/**
 * Determina automáticamente cuál de los 3 bots corresponde según la ruta actual:
 * - Academia (`/academia*`, `/verificar-diploma*`, `/admin/academia*`, `/operaciones/academia*`) -> 'academy'
 * - Plataforma Multinivel (`/dashboard*`, `/tarjetadigital`, `/credencial`, `/admin*`, `/operaciones*`) -> 'platform'
 * - Página Web Pública (`/`, `/productos`, `/oportunidad`, `/plan-multinivel`, `/escaleras`, etc.) -> 'web'
 */
export function resolveBotForPathname(pathname: string): ChatbotId {
  const path = (pathname || '/').toLowerCase();

  if (
    path.startsWith('/academia') ||
    path.startsWith('/verificar-diploma') ||
    path.startsWith('/admin/academia') ||
    path.startsWith('/operaciones/academia')
  ) {
    return 'academy';
  }

  if (
    path.startsWith('/dashboard') ||
    path.startsWith('/tarjetadigital') ||
    path.startsWith('/credencial') ||
    path.startsWith('/admin') ||
    path.startsWith('/operaciones')
  ) {
    return 'platform';
  }

  return 'web';
}

const STOP_WORDS = new Set([
  'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'como', 'que', 'cual', 'cuales', 'donde', 'cuando', 'cuanto', 'cuesta',
  'para', 'por', 'con', 'sin', 'y', 'o', 'en', 'a', 'es', 'son', 'sobre',
  'mi', 'mis', 'me', 'tu', 'tus', 'se', 'su', 'sus', 'al', 'lo', 'hola',
  'buenos', 'dias', 'tardes', 'noches', 'quiero', 'saber', 'ver', 'hay',
]);

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s%$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface KnowledgeMatch {
  node: ChatbotNode;
  score: number;
}

/**
 * Buscador determinístico en la base de respuestas del bot activo.
 * Devuelve los nodos ordenados por relevancia sin depender de IA externa.
 */
export function searchBotKnowledge(
  profile: ChatbotProfileConfig,
  rawQuery: string,
  limit = 4
): KnowledgeMatch[] {
  const normalized = normalizeText(rawQuery);
  if (!normalized || normalized.length < 2) return [];

  const tokens = normalized
    .split(' ')
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  const effectiveTokens = tokens.length > 0 ? tokens : normalized.split(' ').filter((t) => t.length >= 2);
  if (effectiveTokens.length === 0) return [];

  const results: KnowledgeMatch[] = [];

  for (const node of Object.values(profile.nodes)) {
    // Skip root in search matches unless explicitly searched
    if (node.id === profile.rootNodeId && effectiveTokens.length > 0 && !effectiveTokens.includes('menu')) {
      continue;
    }

    const titleNorm = normalizeText(node.title);
    const catNorm = normalizeText(node.category);
    const keywordsNorm = node.keywords.map(normalizeText);
    const bodyNorm = normalizeText(
      [
        node.message,
        ...(node.rich?.bullets || []),
        ...(node.rich?.steps || []),
        ...(node.rich?.facts?.map((f) => `${f.label} ${f.value}`) || []),
      ].join(' ')
    );

    let score = 0;

    // Exact phrase match bonus
    if (titleNorm.includes(normalized)) score += 30;
    if (keywordsNorm.some((k) => k === normalized)) score += 35;
    else if (keywordsNorm.some((k) => k.includes(normalized))) score += 20;

    for (const tok of effectiveTokens) {
      if (titleNorm.includes(tok)) score += 12;
      if (catNorm.includes(tok)) score += 6;
      if (keywordsNorm.some((k) => k === tok)) score += 15;
      else if (keywordsNorm.some((k) => k.includes(tok))) score += 8;
      if (bodyNorm.includes(tok)) score += 3;
    }

    if (score > 0) {
      results.push({ node, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
