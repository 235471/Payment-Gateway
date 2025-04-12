import { Injectable } from '@nestjs/common';
import { FraudReason } from '@prisma/client';
import {
  IFraudSpecification,
  FraudSpecificationContext,
  FraudDetectionResult,
} from './fraud-specification.interface';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SuspiciousAccountSpecification implements IFraudSpecification {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}
  detectFraud(context: FraudSpecificationContext): FraudDetectionResult {
    const { account, currentSuspicionScore } = context;
    const suspiciousScoreThreshold = this.configService.getOrThrow<number>(
      'SUSPICIOUS_SCORE_THRESHOLD',
    );

  if (currentSuspicionScore >= suspiciousScoreThreshold) {
    return {
      hasFraud: true,
      reason: FraudReason.SUSPICIOUS_ACCOUNT,
      description: `Account suspicion score (${currentSuspicionScore}) exceeds threshold (${suspiciousScoreThreshold}) based on recent activity.`,
    };
  }

    return { hasFraud: false };
  }
}
