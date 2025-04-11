import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProcessInvoiceFraudDto } from '../dto/process-invoice-fraud.dto';
import { InvoiceStatus } from '@prisma/client';
import { FraudAggregateSpecification } from './specifications/fraud-aggregate.specification';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FraudService {
  constructor(
    private readonly prisma: PrismaService,
    private fraudAggregateSpecification: FraudAggregateSpecification,
    private configService: ConfigService,
  ) {}

  async processInvoice(processInvoiceFraud: ProcessInvoiceFraudDto) {
    const { invoiceId, accountId, amount } = processInvoiceFraud;

    const checkInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (checkInvoice) {
      throw new ConflictException('Invoice has already been processed');
    }

    const account = await this.prisma.account.upsert({
      where: { id: accountId },
      update: {},
      create: {
        id: accountId,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRejectedInvoices = await this.prisma.invoice.findMany({
      where: {
        accountId: accountId,
        status: InvoiceStatus.REJECTED,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        fraudHistory: true,
      },
    });

    const currentSuspicionScore = recentRejectedInvoices.reduce(
      (acc, invoice) => {
        switch (invoice.fraudHistory?.reason) {
          case 'UNUSUAL_PATTERN':
            acc += this.configService.getOrThrow<number>(
              'POINTS_UNUSUAL_PATTERN',
            );
            break;
          case 'FREQUENT_HIGH_VALUE':
            acc += this.configService.getOrThrow<number>(
              'POINTS_FREQUENT_HIGH_VALUE',
            );
            break;
          default:
            break;
        }
        return acc;
      },
      0,
    );

    const fraudResult = await this.fraudAggregateSpecification.detectFraud({
      account,
      amount,
      invoiceId,
      currentSuspicionScore,
    });

    const invoice = await this.prisma.invoice.create({
      data: {
        id: invoiceId,
        accountId,
        amount,
        ...(fraudResult.hasFraud && {
          // Use mapped result
          fraudHistory: {
            create: {
              reason: fraudResult.reason!,
              description: fraudResult.description,
            },
          },
        }),
        status: fraudResult.hasFraud // Use mapped result
          ? InvoiceStatus.REJECTED
          : InvoiceStatus.APPROVED,
      },
    });

    return {
      invoice,
      fraudResult,
    };
  }
}
