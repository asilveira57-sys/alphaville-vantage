import { describe, expect, it } from 'vitest';
import { apiFactPatch, previewTokkoMigration, tokkoFacts, type TokkoProperty } from './tokko';

const api: TokkoProperty = { id: 12575108, reference_code: 'AP06763', operations: [
  { operation_id: 1, prices: [{ currency: 'BRL', price: 1000000 }] },
  { operation_id: 2, prices: [{ currency: 'BRL', price: 5000 }] },
] };
const portal = { id: 'p1', internal_code: ' ap06763 ', source_id: '78622609', source_url: 'https://old/78622609', external_ref: '/78622609', slug: 'original-slug-78622609', status: 'active' };
describe('Tokko migration safeguards', () => {
  it('matches reference codes even when numeric IDs changed', () => {
    const rows = previewTokkoMigration([portal], [api]);
    expect(rows[0].result).toBe('matched'); expect(rows[0].new_source_id).toBe('12575108');
    expect(rows[0].portal_url).toContain('/original-slug-78622609');
  });
  it('does not guess matches for duplicate reference codes', () => {
    expect(previewTokkoMigration([portal], [api, { ...api, id: 12575109 }])[0].result).toBe('duplicate_code');
  });
  it('uses sale and rent operations with separate prices', () => {
    const f = tokkoFacts(api); expect(f.purpose).toBe('both'); expect(f.price_sale).toBe(1000000); expect(f.price_rent).toBe(5000);
  });
  it('preserves manual overrides including null values', () => {
    const diff = apiFactPatch({ price_sale: 900000, manual_overrides: { price_sale: null } }, { price_sale: 1000000 });
    expect(diff.patch).not.toHaveProperty('price_sale'); expect(diff.conflicts).toEqual(['price_sale']);
  });
  it('never changes existing slugs', () => {
    expect(apiFactPatch({ slug: portal.slug }, { slug: 'new-slug' }).patch).toEqual({});
  });
  it('maps monthly and annual IPTU explicitly', () => {
    expect(tokkoFacts({ ...api, iptu: '1000.00', iptu_type: 'Mensal' }).iptu_period).toBe('mensal');
    expect(tokkoFacts({ ...api, iptu: '12000.00', iptu_type: 'Anual' }).iptu_period).toBe('anual');
  });
  it('keeps absent bathroom counts null rather than inventing zero', () => {
    expect(tokkoFacts(api).bathrooms).toBeNull();
  });
  it('maps suite_amount to bedrooms and total_suites to suites (AP06648: 2 dorm, 1 suíte)', () => {
    const f = tokkoFacts({ ...api, room_amount: 0, suite_amount: 2, total_suites: 1 });
    expect(f.bedrooms).toBe(2); expect(f.suites).toBe(1);
  });
  it('treats API zero counts as not informed and keeps current values', () => {
    const f = tokkoFacts({ ...api, suite_amount: 0, total_suites: 0, toilet_amount: 0, bathroom_amount: 0, parking_lot_amount: 0 });
    const d = apiFactPatch({ bedrooms: 3, suites: 1, lavabos: 1, bathrooms: 2, parking: 2 }, f).patch;
    for (const k of ['bedrooms', 'suites', 'lavabos', 'bathrooms', 'parking']) expect(d).not.toHaveProperty(k);
  });
  it('sums covered and uncovered parking when total is missing', () => {
    expect(tokkoFacts({ ...api, parking_lot_amount: 0, covered_parking_lot: 2, uncovered_parking_lot: 1 }).parking).toBe(3);
  });
  it('ignores money differences under R$ 1', () => {
    expect(apiFactPatch({ price_sale: 1000000.6 }, { price_sale: 1000000 }).patch).toEqual({});
    expect(apiFactPatch({ price_sale: 999000 }, { price_sale: 1000000 }).patch).toEqual({ price_sale: 1000000 });
  });
  it('ignores condominium name changes of case or accents only', () => {
    expect(apiFactPatch({ condominium_name: 'Residencial Gênesis' }, { condominium_name: 'RESIDENCIAL GENESIS' }).patch).toEqual({});
  });
  it('never downgrades rent/both to sale', () => {
    expect(apiFactPatch({ purpose: 'both' }, { purpose: 'sale' }).patch).toEqual({});
  });
  it('preserves gallery order and detects changed main photos', () => {
    const f = tokkoFacts({ ...api, photos: [{ original: 'https://static.tokkobroker.com/2.jpg', order: 2 }, { original: 'https://static.tokkobroker.com/1.jpg', order: 1, is_front_cover: true }] });
    expect(f.images).toEqual(['https://static.tokkobroker.com/1.jpg', 'https://static.tokkobroker.com/2.jpg']);
    expect(apiFactPatch({ images: ['old.jpg'] }, f).mainPhotoChanged).toBe(true);
  });
  it('keeps only the street name', () => {
    expect(tokkoFacts({ ...api, fake_address: 'AVENIDA ÔMEGA al' }).address).toBe('Avenida Ômega');
    expect(tokkoFacts({ ...api, fake_address: 'AVENIDA DELMAR al 200' }).address).toBe('Avenida Delmar');
  });
  it('does not publish exact address numbers', () => {
    const f = tokkoFacts({ ...api, fake_address: 'Rua Exemplo 123', real_address: 'Rua Exemplo 123', address_complement: 'Apto 10' });
    expect(f.address).toBe('Rua Exemplo'); expect(f).not.toHaveProperty('address_number');
  });
});