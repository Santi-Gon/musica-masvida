import { Controller } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // TODO: Implementar endpoints de lectura (solo informativo)
}
