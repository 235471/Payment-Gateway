import { Injectable } from '@nestjs/common';
import { FraudReason } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  IFraudSpecification,
  FraudSpecificationContext,
  FraudDetectionResult,
} from './fraud-specification.interface';

@Injectable()
export class FrequentHighValueSpecification implements IFraudSpecification {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async detectFraud(
    context: FraudSpecificationContext,
  ): Promise<FraudDetectionResult> {
    const { account } = context;
    const suspiciousInvoicesCount = this.configService.getOrThrow<number>(
      'SUSPICIOUS_INVOICES_COUNT',
    );
    const suspiciousTimeframeHours = this.configService.getOrThrow<number>(
      'SUSPICIOUS_TIMEFRAME_HOURS',
    );

    const recentDate = new Date();
    recentDate.setHours(recentDate.getHours() - suspiciousTimeframeHours);

    const recentInvoices = await this.prisma.invoice.findMany({
      where: {
        accountId: account.id,
        createdAt: { gte: recentDate },
      },
    });

    if (recentInvoices.length >= suspiciousInvoicesCount) {
      return {
        hasFraud: true,
        reason: FraudReason.FREQUENT_HIGH_VALUE,
        description:
          'Account has made a large number of invoices in the last 24 hours',
      };
    }

    return { hasFraud: false };
  }
}
