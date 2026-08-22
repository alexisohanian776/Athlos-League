/* IOC codes appearing in the ATHLOS results. */
export const COUNTRIES = {
  AUS: 'Australia', BAH: 'Bahamas', BRN: 'Bahrain', CIV: 'Côte d’Ivoire',
  DOM: 'Dominican Republic', ETH: 'Ethiopia', GBR: 'Great Britain', JAM: 'Jamaica',
  KEN: 'Kenya', NED: 'Netherlands', NOR: 'Norway', NZL: 'New Zealand',
  PUR: 'Puerto Rico', UGA: 'Uganda', USA: 'United States',
  VIN: 'St Vincent & the Grenadines',
};

export const countryName = (code) => COUNTRIES[code] || code;
