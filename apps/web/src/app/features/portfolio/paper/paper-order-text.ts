import type { PaperOrderTrigger } from './paper-record';

const TRIGGER_TEXT: Record<PaperOrderTrigger, string> = {
  'price-at-or-above': 'Price reaches',
  'price-at-or-below': 'Price falls to',
  'close-above': 'Closes above',
  'close-below': 'Closes below',
};

export function triggerText(trigger: PaperOrderTrigger): string {
  return TRIGGER_TEXT[trigger];
}
