-- CreateEnum
CREATE TYPE "trade_side" AS ENUM ('buy', 'sell');

-- CreateTable
CREATE TABLE "stocks" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "symbol" VARCHAR(12),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "side" "trade_side" NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "traded_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trades_stock_id_traded_on_created_at_idx" ON "trades"("stock_id", "traded_on", "created_at");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Not expressible in schema.prisma
CREATE UNIQUE INDEX "stocks_name_lower_key" ON "stocks" (lower("name"));
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_name_not_blank" CHECK (btrim("name") <> '');
ALTER TABLE "trades" ADD CONSTRAINT "trades_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "trades" ADD CONSTRAINT "trades_price_positive" CHECK ("price" > 0);
