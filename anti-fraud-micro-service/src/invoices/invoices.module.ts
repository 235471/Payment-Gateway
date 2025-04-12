import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices'; // Import ClientsModule and Transport
import { FraudService } from './fraud/fraud.service';
import { FraudAggregateSpecification } from './fraud/specifications/fraud-aggregate.specification';
import { SuspiciousAccountSpecification } from './fraud/specifications/suspicious-account.specification';
import { UnusualAmountSpecification } from './fraud/specifications/unusual-amount.specification';
import { FrequentHighValueSpecification } from './fraud/specifications/frequent-high-value.specification';
import { IFraudSpecification } from './fraud/specifications/fraud-specification.interface';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';

@Module({
  providers: [
    FraudService,
    SuspiciousAccountSpecification,
    UnusualAmountSpecification,
    FrequentHighValueSpecification,
    FraudAggregateSpecification,
    {
      provide: 'FRAUD_SPECIFICATIONS',
      useFactory: (
        suspiciousAccountSpec,
        unusualAmountSpec,
        frequentHighValueSpec,
      ) => [
        suspiciousAccountSpec,
        unusualAmountSpec,
        frequentHighValueSpec,
      ],
      inject: [
        SuspiciousAccountSpecification,
        UnusualAmountSpecification,
        FrequentHighValueSpecification,
      ],
    },
    InvoicesService,
  ],
  controllers: [InvoicesController],
  // Register Kafka Client
  imports: [
    ClientsModule.register([
      {
        name: 'ANTI_FRAUD_SERVICE', // Same token used for injection in controller
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'anti-fraud',
            brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
          },
          consumer: {
            // Consumer options are usually set in main.ts connectMicroservice
            // but groupId can be specified here if needed for producer logic (rare)
            groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'anti-fraud-group',
          },
          // Producer options can be added here if needed
          producer: {
            allowAutoTopicCreation: false,
            retry: { retries: 5 }
           }
        },
      },
    ]),
  ],
})
export class InvoicesModule {}
