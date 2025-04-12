-- CreateIndex
CREATE INDEX "invoices_account_id_status_created_at_idx" ON "invoices"("account_id", "status", "created_at");
