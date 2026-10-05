import { ConflictException } from '@nestjs/common';
import { describeOversell, type Oversell } from '@trade-count/ledger';

export class OversellException extends ConflictException {
  constructor(oversell: Oversell, changedTradeId: string) {
    const isChangedSale = oversell.sale.sell.id === changedTradeId;
    super({
      statusCode: 409,
      error: 'Conflict',
      code: 'OVERSELL',
      message: describeOversell(oversell, changedTradeId),
      ...(isChangedSale ? {} : { saleId: oversell.sale.sell.id }),
    });
  }
}
