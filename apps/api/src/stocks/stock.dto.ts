import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const toSymbol = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || null : value;

export class CreateStockDto {
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  name: string;

  @Transform(toSymbol)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9.-]{1,12}$/, {
    message: 'symbol may only use letters, digits, dots and dashes (max 12)',
  })
  symbol?: string | null;
}

export class UpdateStockDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 60)
  name?: string;

  @Transform(toSymbol)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9.-]{1,12}$/, {
    message: 'symbol may only use letters, digits, dots and dashes (max 12)',
  })
  symbol?: string | null;
}
