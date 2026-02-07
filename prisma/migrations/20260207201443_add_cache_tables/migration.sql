-- CreateTable
CREATE UNLOGGED TABLE "CachedConnection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE UNLOGGED TABLE "CachedProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE UNLOGGED TABLE "CachedChatAttendee" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedChatAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CachedConnection_accountId_idx" ON "CachedConnection"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedConnection_accountId_providerId_key" ON "CachedConnection"("accountId", "providerId");

-- CreateIndex
CREATE INDEX "CachedProfile_providerId_idx" ON "CachedProfile"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedProfile_accountId_providerId_key" ON "CachedProfile"("accountId", "providerId");

-- CreateIndex
CREATE INDEX "CachedChatAttendee_accountId_idx" ON "CachedChatAttendee"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedChatAttendee_accountId_chatId_key" ON "CachedChatAttendee"("accountId", "chatId");
