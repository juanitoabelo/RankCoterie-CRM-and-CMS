-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_email_key" ON "LoginAttempt"("email");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_resetAt_idx" ON "LoginAttempt"("email", "resetAt");
