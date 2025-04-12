// DTO for data received from the 'pending_transactions' Kafka topic
// Adjust properties and types based on the actual data produced by the Go backend
export class ProcessInvoiceFraudDto {
  invoice_id: string; // Matches the property name used in the controller
  account_id: string;
  amount: number;
  // payment_method removed as it's not in the Prisma schema
  // Add any other relevant fields needed for fraud check
  // e.g., timestamp?: Date;
  // e.g., user_details?: object;
}
