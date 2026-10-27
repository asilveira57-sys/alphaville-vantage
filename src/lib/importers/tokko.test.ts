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
    expect(tokkoFacts({ ...api, iptu: '1000.00', iptu_type: 'Mensal' }).iptu_period).toBe('monthly');
    expect(tokkoFacts({ ...api, iptu: '12000.00', iptu_type: 'Anual' }).iptu_period).toBe('annual');
  });
  it('keeps absent bathroom counts null rather than inventing zero', () => {
    expect(tokkoFacts(api).bathrooms).toBeNull();
  });
  it('preserves gallery order and detects changed main photos', () => {
    const f = tokkoFacts({ ...api, photos: [{ original: 'https://static.tokkobroker.com/2.jpg', order: 2 }, { original: 'https://static.tokkobroker.com/1.jpg', order: 1, is_front_cover: true }] });
    expect(f.images).toEqual(['https://static.tokkobroker.com/1.jpg', 'https://static.tokkobroker.com/2.jpg']);
    expect(apiFactPatch({ images: ['old.jpg'] }, f).mainPhotoChanged).toBe(true);
  });
  it('does not publish exact address numbers', () => {
    const f = tokkoFacts({ ...api, fake_address: 'Rua Exemplo', real_address: 'Rua Exemplo 123', address_complement: 'Apto 10' });
    expect(f.address).toBe('Rua Exemplo'); expect(f).not.toHaveProperty('address_number');
  });
});