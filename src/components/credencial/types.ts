export type CardStatus = 'ACTIVO' | 'INACTIVO' | 'PENDIENTE' | 'SUSPENDIDO';

export type ViewMode = 'split' | 'flip3d' | 'frontOnly' | 'backOnly';

export interface DistributorData {
  companyName: string;
  companySub: string;
  fullName: string;
  officialCode: string;
  category: string;
  status: CardStatus;
  validityArea: string;
  avatarInitials: string;
  avatarImage?: string;
  qrUrl: string;
  website: string;
  supportText: string;
  scanTitle: string;
  scanInstruction: string;
}

export interface PresetProfile {
  id: string;
  label: string;
  data: DistributorData;
}
