/**
 * Who runs this site, as shown in the Imprint and Privacy policy. `npm run deploy` refuses to run while any
 * value still says REPLACE_ME (see scripts/check-operator.mjs).
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
  name: 'Mohammad Ashiqur Rahman',
  street: 'Kohelnhof Str. 4',
  postalCode: '90443',
  city: 'Nürnberg',
  country: 'Germany',
  email: 'devops.tuc@gmail.com',
};
