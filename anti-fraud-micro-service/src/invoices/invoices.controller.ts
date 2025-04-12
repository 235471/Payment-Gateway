import { Controller, Get, Inject, OnModuleInit, Param, Query } from '@nestjs/common';
import { FindAllInvoiceDto } from './dto/find-all-invoice.dto';
import { InvoicesService } from './invoices.service';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessInvoiceFraudDto } from './dto/process-invoice-fraud.dto'; // Assuming this DTO exists or will be created

@Controller('invoices')
export class InvoicesController implements OnModuleInit {
  // Inject Kafka client for producing results later
  constructor(
    private readonly invoicesService: InvoicesService,
    @Inject('ANTI_FRAUD_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Subscribe to topics on initialization
    await this.kafkaClient.connect();
    console.log('Kafka Client Connected for InvoicesController');
  }

  // Handler for consuming messages from 'pending_transactions' topic
  @MessagePattern('pending_transactions')
  async handlePendingTransaction(
    @Payload()
    message: ProcessInvoiceFraudDto,
  ) {
    console.log(`Received pending transaction: ${JSON.stringify(message)}`);
    // TODO: Validate message payload with a DTO

    const processDto: ProcessInvoiceFraudDto = {
      invoice_id: message.invoice_id,
      account_id: message.account_id,
      amount: message.amount,
    };
    try {
      const result = await this.invoicesService.processFraudCheck(processDto); // This method needs to be implemented in InvoicesService
      console.log(
        `Fraud check result for ${message.invoice_id}: ${result.status}`,
      );

      // Produce result to 'transactions_result' topic
      this.kafkaClient.emit('transactions_result', {
        invoice_id: result.invoiceId,
        status: result.status, // 'approved' or 'rejected'
      });
    } catch (error) {
      console.error(
        `Error processing fraud check for invoice ${message.invoice_id}:`,
        error,
      );
      // Optionally produce an error message to Kafka or handle differently
      // Ensure message.invoice_id exists and is correct case from original message
      this.kafkaClient.emit('transactions_result', {
        invoice_id: message.invoice_id, // Keep snake_case for Kafka message consistency
        status: 'pending',
        error: error.message,
      });
    }
  }

  // --- Existing HTTP Handlers ---
  @Get()
  findAll(@Query() filter: FindAllInvoiceDto) {
    return this.invoicesService.findAll({
      withFraud: filter.with_fraud,
      accountId: filter.account_id,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }
}
