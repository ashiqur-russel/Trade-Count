import { ConflictException } from '@nestjs/common';
import type { Oversell } from '@trade-count/ledger';

export class OversellException extends ConflictException {
  constructor(oversell: Oversell, changedTradeId: string) {
    const { stock, sale } = oversell;
    const date = sale.sell.tradedOn;
    const isChangedSale = sale.sell.id === changedTradeId;
    const message = isChangedSale
      ? `You only hold ${sale.matched.toString()} ${stock.name} share(s) on ${date}, so you can't sell ${sale.sell.quantity}.`
      : `This would leave the sale of ${sale.sell.quantity} ${stock.name} share(s) on ${date} without enough shares. Change or delete that sale first.`;
    super({
      statusCode: 409,
      error: 'Conflict',
      code: 'OVERSELL',
      message,
      ...(isChangedSale ? {} : { saleId: sale.sell.id }),
    });
  }
}
