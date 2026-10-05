/**
 * Who runs this site, as shown in the Imprint and Privacy policy. Fill in every field, then deploy:
 * `npm run deploy` refuses to run while any value still says REPLACE_ME (see scripts/check-operator.mjs).
 */
export interface Operator {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
}

export const OPERATOR: Operator = {
  name: 'REPLACE_ME',
  street: 'REPLACE_ME',
  postalCode: 'REPLACE_ME',
  city: 'REPLACE_ME',
  country: 'Germany',
  email: 'REPLACE_ME',
};
