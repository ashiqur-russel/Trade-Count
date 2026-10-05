import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, resetDatabase } from './test-app.js';

describe('/api/stocks', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  const createStock = (body: object) =>
    request(app.getHttpServer()).post('/api/stocks').send(body);

  it('creates a stock with a trimmed name and an upper-cased symbol', async () => {
    const res = await createStock({
      name: '  Rheinmetall ',
      symbol: ' rhm ',
    }).expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Rheinmetall',
      symbol: 'RHM',
    });
  });

  it('stores an empty symbol as null', async () => {
    const res = await createStock({ name: 'SAP', symbol: '' }).expect(201);

    expect(res.body.symbol).toBeNull();
  });

  it('rejects a name that differs from an existing one only in case with 409', async () => {
    await createStock({ name: 'Allianz' }).expect(201);
    const res = await createStock({ name: 'ALLIANZ' }).expect(409);

    expect(res.body.message).toBe('ALLIANZ is already in your list.');
  });

  it('rejects a blank name and unknown fields with 400', async () => {
    await createStock({ name: '   ' }).expect(400);
    await createStock({ name: 'BASF', owner: 'someone' }).expect(400);
  });

  it('renames a stock', async () => {
    const { body } = await createStock({ name: 'Siemns' });
    const res = await request(app.getHttpServer())
      .patch(`/api/stocks/${body.id}`)
      .send({ name: 'Siemens' })
      .expect(200);

    expect(res.body.name).toBe('Siemens');
  });

  it('deletes a stock without trades and returns 404 for an unknown one', async () => {
    const { body } = await createStock({ name: 'Bayer' });
    await request(app.getHttpServer())
      .delete(`/api/stocks/${body.id}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/stocks/${body.id}`)
      .expect(404);
  });

  it('refuses to delete a stock that still has trades', async () => {
    const { body } = await createStock({ name: 'BMW' });
    await request(app.getHttpServer())
      .post('/api/trades')
      .send({
        stockId: body.id,
        side: 'buy',
        quantity: '1',
        price: '80',
        tradedOn: '2026-10-01',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .delete(`/api/stocks/${body.id}`)
      .expect(409);
    expect(res.body.message).toBe(
      'This stock still has trades. Delete its trades first.',
    );
  });

  it('rejects an id that is not a UUID with 400', async () => {
    await request(app.getHttpServer())
      .delete('/api/stocks/not-a-uuid')
      .expect(400);
  });
});
