import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import type { TradeSide } from '@trade-count/ledger';

// Mirror the numeric(18,6) / numeric(14,4) columns and reject zero.
const QUANTITY = /^(?=.*[1-9])\d{1,12}(\.\d{1,6})?$/;
const PRICE = /^(?=.*[1-9])\d{1,10}(\.\d{1,4})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SIDES: TradeSide[] = ['buy', 'sell'];

const quantityMessage =
  'quantity must be a positive decimal string with at most 6 decimals, e.g. "3" or "0.5"';
const priceMessage =
  'price must be a positive decimal string with at most 4 decimals, e.g. "560.25"';

export class CreateTradeDto {
  @IsUUID()
  stockId: string;

  @IsIn(SIDES)
  side: TradeSide;

  @IsString()
  @Matches(QUANTITY, { message: quantityMessage })
  quantity: string;

  @IsString()
  @Matches(PRICE, { message: priceMessage })
  price: string;

  @Matches(DATE, { message: 'tradedOn must be a date like 2026-10-05' })
  @IsISO8601({ strict: true })
  tradedOn: string;
}

export class UpdateTradeDto {
  @IsOptional()
  @IsUUID()
  stockId?: string;

  @IsOptional()
  @IsIn(SIDES)
  side?: TradeSide;

  @IsOptional()
  @IsString()
  @Matches(QUANTITY, { message: quantityMessage })
  quantity?: string;

  @IsOptional()
  @IsString()
  @Matches(PRICE, { message: priceMessage })
  price?: string;

  @IsOptional()
  @Matches(DATE, { message: 'tradedOn must be a date like 2026-10-05' })
  @IsISO8601({ strict: true })
  tradedOn?: string;
}
