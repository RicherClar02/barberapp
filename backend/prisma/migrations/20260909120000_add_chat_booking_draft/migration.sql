-- CreateTable
CREATE TABLE "chat_booking_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "barberId" TEXT,
    "barberName" TEXT,
    "date" TEXT,
    "startTime" TEXT,
    "awaitingConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_booking_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_booking_drafts_userId_barbershopId_key" ON "chat_booking_drafts"("userId", "barbershopId");

-- CreateIndex
CREATE INDEX "chat_booking_drafts_updatedAt_idx" ON "chat_booking_drafts"("updatedAt");

-- AddForeignKey
ALTER TABLE "chat_booking_drafts" ADD CONSTRAINT "chat_booking_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_booking_drafts" ADD CONSTRAINT "chat_booking_drafts_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
