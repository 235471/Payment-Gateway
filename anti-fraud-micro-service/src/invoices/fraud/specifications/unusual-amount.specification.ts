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
export class UnusualAmountSpecification implements IFraudSpecification {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async detectFraud(
    context: FraudSpecificationContext,
  ): Promise<FraudDetectionResult> {
    const { account, amount } = context;
    const invoicesHistoryCount = this.configService.getOrThrow<number>(
      'INVOICES_HISTORY_COUNT',
    );

    const historicalData = await this.prisma.invoice.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: invoicesHistoryCount,
    });

    if (historicalData.length > 0) {
      const average =
        historicalData.reduce((acc, curr) => acc + curr.amount, 0) /
        historicalData.length;

      const standardDeviation =
        historicalData.reduce(
          (acc, curr) => acc + Math.pow(curr.amount - average, 2),
          0,
        ) / (historicalData.length - 1 || 1);

        console.log('Average: ', average);
        console.log('Deviation: ', standardDeviation);
        
      if (amount > average + 2 * standardDeviation) {
        return {
          hasFraud: true,
          reason: FraudReason.UNUSUAL_PATTERN,
          description: `Invoice amount ${amount} is atypical considering deviation ${standardDeviation.toFixed(2)} from historical average ${average.toFixed(2)}`,
        };
      }
    }

    return { hasFraud: false };
  }
}
