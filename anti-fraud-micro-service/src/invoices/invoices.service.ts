import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';
import { FraudService } from './fraud/fraud.service';
import { ProcessInvoiceFraudDto } from './dto/process-invoice-fraud.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private fraudService: FraudService,
  ) {}

  async findAll(filter?: { withFraud?: boolean; accountId?: string }) {
    const where = {
      ...(filter?.accountId && { accountId: filter.accountId }),
      ...(filter?.withFraud && { status: InvoiceStatus.REJECTED }),
    };

    return this.prisma.invoice.findMany({
      where,
      include: { account: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { account: true },
    });
  }

  // Method to handle incoming Kafka message for fraud check
  async processFraudCheck(
    data: ProcessInvoiceFraudDto,
  ): Promise<{ invoiceId: string; status: InvoiceStatus }> {
    console.log(`Processing fraud check for invoice: ${data.invoice_id}`);

    // 1. Call the FraudService to handle the entire process
    // It checks for duplicates, runs specs, creates invoice & fraud history
    try {
      const { invoice } = await this.fraudService.processInvoice(data);
      console.log(`FraudService processed invoice ${invoice.id} with status ${invoice.status}`);

      // 2. Return the final status determined by FraudService
      return {
        invoiceId: invoice.id,
        status: invoice.status,
      };
    } catch (error) {
       // Handle potential errors from FraudService (e.g., ConflictException)
       console.error(`Error processing invoice ${data.invoice_id} in FraudService:`, error);
       throw error;
    }
  }
}
