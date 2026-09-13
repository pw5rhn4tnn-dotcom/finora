-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'CSV', 'RECURRING');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('Transaction', 'Budget', 'Category', 'RecurringTransaction');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "themePreference" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(24,12) NOT NULL,
    "amountInBaseCurrency" DECIMAL(24,8) NOT NULL,
    "description" TEXT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "source" "TransactionSource" NOT NULL,
    "recurringTransactionId" UUID,
    "recurringOccurrenceDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "limitAmount" DECIMAL(24,8) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(24,12) NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextOccurrenceDate" DATE NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_id_key" ON "categories"("userId", "id");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_id_idx" ON "transactions"("userId", "transactionDate", "id");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_transactionDate_idx" ON "transactions"("userId", "categoryId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_type_transactionDate_idx" ON "transactions"("userId", "type", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_recurringTransactionId_idx" ON "transactions"("userId", "recurringTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_recurringTransactionId_recurringOccurrenceDate_key" ON "transactions"("recurringTransactionId", "recurringOccurrenceDate");

-- CreateIndex
CREATE INDEX "budgets_userId_year_month_idx" ON "budgets"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_categoryId_year_month_key" ON "budgets"("userId", "categoryId", "year", "month");

-- CreateIndex
CREATE INDEX "recurring_transactions_userId_categoryId_idx" ON "recurring_transactions"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_transactions_userId_id_key" ON "recurring_transactions"("userId", "id");

-- CreateIndex
CREATE INDEX "audit_entries_userId_createdAt_id_idx" ON "audit_entries"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "audit_entries_userId_entityType_entityId_idx" ON "audit_entries"("userId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_categoryId_fkey" FOREIGN KEY ("userId", "categoryId") REFERENCES "categories"("userId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_recurringTransactionId_fkey" FOREIGN KEY ("userId", "recurringTransactionId") REFERENCES "recurring_transactions"("userId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_categoryId_fkey" FOREIGN KEY ("userId", "categoryId") REFERENCES "categories"("userId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_userId_categoryId_fkey" FOREIGN KEY ("userId", "categoryId") REFERENCES "categories"("userId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Инварианты ARCHITECTURE §9, не выражаемые Prisma schema.
CREATE UNIQUE INDEX users_email_case_insensitive_key ON users (lower(email));
ALTER TABLE transactions
  ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0 AND amount <> 'NaN'::numeric),
  ADD CONSTRAINT transactions_rate_positive CHECK ("exchangeRate" > 0 AND "exchangeRate" <> 'NaN'::numeric),
  ADD CONSTRAINT transactions_recurring_pair CHECK (("recurringTransactionId" IS NULL) = ("recurringOccurrenceDate" IS NULL)),
  ADD CONSTRAINT transactions_recurring_source CHECK (source <> 'RECURRING' OR "recurringTransactionId" IS NOT NULL);
ALTER TABLE budgets
  ADD CONSTRAINT budgets_limit_positive CHECK ("limitAmount" > 0 AND "limitAmount" <> 'NaN'::numeric),
  ADD CONSTRAINT budgets_month_range CHECK (month BETWEEN 1 AND 12);
ALTER TABLE recurring_transactions
  ADD CONSTRAINT recurring_amount_positive CHECK (amount > 0 AND amount <> 'NaN'::numeric),
  ADD CONSTRAINT recurring_rate_positive CHECK ("exchangeRate" > 0 AND "exchangeRate" <> 'NaN'::numeric),
  ADD CONSTRAINT recurring_day_range CHECK ("dayOfMonth" BETWEEN 1 AND 31),
  ADD CONSTRAINT recurring_date_range CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
ALTER TABLE audit_entries ADD CONSTRAINT audit_snapshot_shape CHECK (
  (action = 'CREATE' AND before IS NULL AND after IS NOT NULL AND jsonb_typeof(after) = 'object') OR
  (action = 'DELETE' AND before IS NOT NULL AND after IS NULL AND jsonb_typeof(before) = 'object') OR
  (action IN ('UPDATE', 'ARCHIVE') AND before IS NOT NULL AND after IS NOT NULL AND jsonb_typeof(before) = 'object' AND jsonb_typeof(after) = 'object')
);
CREATE INDEX recurring_active_next_occurrence_idx ON recurring_transactions ("nextOccurrenceDate") WHERE "archivedAt" IS NULL;
