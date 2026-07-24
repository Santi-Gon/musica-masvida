import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreatePricingPlanDto } from './dto/create-pricing-plan.dto';
import { UpdatePricingPlanDto } from './dto/update-pricing-plan.dto';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.pricingPlan.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan con id ${id} no encontrado`);
    return plan;
  }

  async create(dto: CreatePricingPlanDto) {
    return this.prisma.pricingPlan.create({ data: dto });
  }

  async update(id: string, dto: UpdatePricingPlanDto) {
    await this.findOne(id);
    return this.prisma.pricingPlan.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.pricingPlan.delete({ where: { id } });
  }
}
