import { Pipe, PipeTransform } from '@angular/core';
import type { Big } from '@trade-count/ledger';
import { formatIsoDate } from '../../../shared/dates/iso-date';
import { formatEuro, formatPercent, formatQuantity, formatSignedEuro } from './display-format';

type Decimal = Big | string | number;

@Pipe({ name: 'euro' })
export class EuroPipe implements PipeTransform {
  transform(value: Decimal): string {
    return formatEuro(value);
  }
}

@Pipe({ name: 'signedEuro' })
export class SignedEuroPipe implements PipeTransform {
  transform(value: Decimal): string {
    return formatSignedEuro(value);
  }
}

@Pipe({ name: 'quantity' })
export class QuantityPipe implements PipeTransform {
  transform(value: Decimal): string {
    return formatQuantity(value);
  }
}

@Pipe({ name: 'percentChange' })
export class PercentChangePipe implements PipeTransform {
  transform(ratio: Decimal): string {
    return formatPercent(ratio);
  }
}

@Pipe({ name: 'displayDate' })
export class DisplayDatePipe implements PipeTransform {
  transform(isoDate: string): string {
    return formatIsoDate(isoDate);
  }
}

export const DISPLAY_PIPES = [
  EuroPipe,
  SignedEuroPipe,
  QuantityPipe,
  PercentChangePipe,
  DisplayDatePipe,
] as const;
