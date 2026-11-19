export type ChatbotId = 'web' | 'platform' | 'academy';

export interface ChatbotOption {
  label: string;
  targetNodeId: string;
  iconName?: string;
  badge?: string;
}

export interface ChatbotFactItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ChatbotActionLink {
  label: string;
  to: string;
  variant?: 'primary' | 'secondary' | 'whatsapp';
  external?: boolean;
}

export interface ChatbotRichContent {
  summary?: string;
  bullets?: string[];
  steps?: string[];
  facts?: ChatbotFactItem[];
  tip?: string;
  actions?: ChatbotActionLink[];
}

export interface ChatbotNode {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  message: string;
  rich?: ChatbotRichContent;
  options: ChatbotOption[];
  parentNodeId?: string;
}

export interface ChatbotProfileConfig {
  id: ChatbotId;
  name: string;
  shortName: string;
  roleTitle: string;
  accentGradient: string;
  badgeColor: string;
  welcomeSubtitle: string;
  quickTopics: { label: string; nodeId: string }[];
  rootNodeId: string;
  nodes: Record<string, ChatbotNode>;
}
