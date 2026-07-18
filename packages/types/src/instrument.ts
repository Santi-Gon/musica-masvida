export interface Instrument {
  id: string;
  name: string;
  description: string;
  category: InstrumentCategory;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum InstrumentCategory {
  STRINGS = 'STRINGS',         // Cuerdas
  WIND = 'WIND',               // Viento
  PERCUSSION = 'PERCUSSION',   // Percusión
  KEYBOARD = 'KEYBOARD',       // Teclado
  VOICE = 'VOICE',             // Voz
  OTHER = 'OTHER',
}

export interface CreateInstrumentDto {
  name: string;
  description: string;
  category: InstrumentCategory;
  imageUrl?: string;
}

export interface UpdateInstrumentDto extends Partial<CreateInstrumentDto> {}
