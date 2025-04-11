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
    const { invoice_id, account_id, amount } = processInvoiceFraud;

    const checkInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoice_id },
    });

    if (checkInvoice) {
      throw new ConflictException('Invoice has already been processed');
    }

    const account = await this.prisma.account.upsert({
      where: { id: account_id },
      update: {},
      create: {
        id: account_id,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRejectedInvoices = await this.prisma.invoice.findMany({
      where: {
        accountId: account_id,
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
      invoiceId: invoice_id,
      currentSuspicionScore,
    });

    const invoice = await this.prisma.invoice.create({
      data: {
        id: invoice_id,
        accountId: account_id,
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
