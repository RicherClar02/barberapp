-- Rename ENTERPRISE to STANDARD in Plan enum
ALTER TYPE "Plan" RENAME VALUE 'ENTERPRISE' TO 'STANDARD';

-- Add whatsappNumber to users
ALTER TABLE "users" ADD COLUMN "whatsappNumber" TEXT;

-- Add isFeatured to barbershops
ALTER TABLE "barbershops" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable barbershop_configs
CREATE TABLE "barbershop_configs" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "barberPercentage" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "shopPercentage" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cutsForFreeService" INTEGER NOT NULL DEFAULT 10,
    "cancellationWindowMin" INTEGER NOT NULL DEFAULT 60,
    "appointmentDuration" INTEGER NOT NULL DEFAULT 40,
    "toleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "barbershop_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "barbershop_configs_barbershopId_key" ON "barbershop_configs"("barbershopId");

ALTER TABLE "barbershop_configs" ADD CONSTRAINT "barbershop_configs_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable client_loyalties
CREATE TABLE "client_loyalties" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "totalCuts" INTEGER NOT NULL DEFAULT 0,
    "freeCutsEarned" INTEGER NOT NULL DEFAULT 0,
    "freeCutsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastVisit" TIMESTAMP(3),
    CONSTRAINT "client_loyalties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_loyalties_clientId_barbershopId_key" ON "client_loyalties"("clientId", "barbershopId");

ALTER TABLE "client_loyalties" ADD CONSTRAINT "client_loyalties_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_loyalties" ADD CONSTRAINT "client_loyalties_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable advertisements
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" DOUBLE PRECISION,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable notification_preferences
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "preferWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "preferPush" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum WaitlistStatus
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CONFIRMED', 'EXPIRED');

-- CreateTable waitlists
CREATE TABLE "waitlists" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "preferredTime" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waitlists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlists_clientId_barberId_date_key" ON "waitlists"("clientId", "barberId", "date");

ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_barberId_fkey"
    FOREIGN KEY ("barberId") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum SubscriptionStatus
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');

-- CreateTable subscriptions
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_barbershopId_key" ON "subscriptions"("barbershopId");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
