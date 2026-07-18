export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  frequency: PricingFrequency;
  features: string[];       // Lista de beneficios incluidos
  isPopular: boolean;       // Para destacar un plan
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum PricingFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}

export interface CreatePricingPlanDto {
  name: string;
  description: string;
  price: number;
  currency: string;
  frequency: PricingFrequency;
  features: string[];
  isPopular?: boolean;
}

export interface UpdatePricingPlanDto extends Partial<CreatePricingPlanDto> {}
