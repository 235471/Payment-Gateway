import { Module } from '@nestjs/common';
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
})
export class InvoicesModule {}
