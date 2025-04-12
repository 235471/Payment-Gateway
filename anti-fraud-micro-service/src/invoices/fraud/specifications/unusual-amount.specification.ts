import { Injectable } from '@nestjs/common';
import { FraudReason, Invoice } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  IFraudSpecification,
  FraudSpecificationContext,
  FraudDetectionResult,
} from './fraud-specification.interface';

// Helper function to calculate the median
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper function to calculate Median Absolute Deviation (MAD)
function calculateMAD(numbers: number[], median: number): number {
  if (numbers.length === 0) return 0;
  const deviations = numbers.map((num) => Math.abs(num - median));
  return calculateMedian(deviations);
}

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

    // Get configuration values
    const historyWindowDays = this.configService.getOrThrow<number>(
      'FRAUD_HISTORY_WINDOW_DAYS',
    );
    const minInvoicesWindow = this.configService.getOrThrow<number>(
      'FRAUD_MIN_INVOICES_WINDOW',
    );
    const minInvoicesFallback = this.configService.getOrThrow<number>(
      'FRAUD_MIN_INVOICES_FALLBACK',
    );
    const madMultiplier = this.configService.getOrThrow<number>(
      'FRAUD_MAD_MULTIPLIER',
    );
    const invoicesHistoryCount = this.configService.getOrThrow<number>(
      'INVOICES_HISTORY_COUNT', // Used for fallback
    );

    // Calculate date threshold for time window
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - historyWindowDays);

    // 1. Try fetching data within the time window
    let historicalData = await this.prisma.invoice.findMany({
      where: {
        accountId: account.id,
        createdAt: {
          gte: dateThreshold,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Check if count meets window minimum, if not, try fallback
    if (historicalData.length < minInvoicesWindow) {
      console.log(
        `Not enough invoices in the last ${historyWindowDays} days (${historicalData.length}). Falling back to last ${invoicesHistoryCount} invoices.`,
      );
      historicalData = await this.prisma.invoice.findMany({
        where: {
          accountId: account.id,
        },
        orderBy: { createdAt: 'desc' },
        take: invoicesHistoryCount,
      });
    }

    // 3. Check if we have enough data after fallback for any calculation
    if (historicalData.length < minInvoicesFallback) {
      console.log(
        `Insufficient historical data (${historicalData.length}) even after fallback. Skipping unusual amount check.`,
      );
      return { hasFraud: false };
    }

    // 4. Calculate Median and MAD
    const amounts = historicalData.map((invoice) => invoice.amount);
    const median = calculateMedian(amounts);
    const mad = calculateMAD(amounts, median);

    // MAD = 0 can happen if all historical amounts are identical. Avoid division by zero or threshold being just the median.
    // If MAD is 0, any deviation is significant, but we need a small tolerance or specific handling.
    // For simplicity, if MAD is 0, we might only flag if the amount is different *at all* from the median,
    // or use a small absolute threshold, or revert to a simpler check. Let's flag if amount > median when MAD is 0.
    if (mad === 0) {
        if (amount > median) {
             console.log(`MAD is 0, amount ${amount} is greater than median ${median}.`);
             return {
                hasFraud: true,
                reason: FraudReason.UNUSUAL_PATTERN,
                description: `Invoice amount ${amount} differs from the consistent historical median of ${median.toFixed(2)} (MAD is 0).`,
             };
        } else {
            // Amount is <= median, and all historical amounts are the same. Not unusual.
            return { hasFraud: false };
        }
    }

    // 5. Determine Threshold using MAD
    // The 1.4826 factor scales MAD to be comparable to standard deviation for normal distributions
    const threshold = median + madMultiplier * 1.4826 * mad;

    console.log(`Median: ${median.toFixed(2)}, MAD: ${mad.toFixed(2)}, Threshold: ${threshold.toFixed(2)}`);

    // 6. Compare and Return Result
    if (amount > threshold) {
      return {
        hasFraud: true,
        reason: FraudReason.UNUSUAL_PATTERN,
        description: `Invoice amount ${amount} exceeds the typical range (Threshold: ${threshold.toFixed(2)}) based on historical median ${median.toFixed(2)} and MAD ${mad.toFixed(2)}.`,
      };
    }

    return { hasFraud: false };
  }
}
