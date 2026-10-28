import type { PillTone } from '../../../shared/ui';
import type { SignalStatus } from './signal-record';

export const SIGNAL_STATUSES: readonly SignalStatus[] = ['missed', 'acted', 'open', 'unreached'];

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  missed: 'Reached, not acted',
  acted: 'Reached, acted',
  open: 'Open',
  unreached: 'Never reached',
};

export const SIGNAL_STATUS_TONE: Record<SignalStatus, PillTone> = {
  missed: 'warn',
  acted: 'gain',
  open: 'accent',
  unreached: 'neutral',
};
