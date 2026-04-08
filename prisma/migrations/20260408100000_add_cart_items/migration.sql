-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_customerProfileId_idx" ON "CartItem"("customerProfileId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_customerProfileId_productId_key" ON "CartItem"("customerProfileId", "productId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
