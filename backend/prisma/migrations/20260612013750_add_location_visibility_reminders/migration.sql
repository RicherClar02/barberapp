-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "reminder15Sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder5Sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rescheduleReason" TEXT,
ADD COLUMN     "rescheduledByShop" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "amenities" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locality" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "department" TEXT;
