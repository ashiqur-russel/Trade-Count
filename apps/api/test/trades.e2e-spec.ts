import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, resetDatabase } from './test-app.js';

describe('/api/trades', () => {
  let app: INestApplication<App>;
  let stockId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    const res = await request(app.getHttpServer())
      .post('/api/stocks')
      .send({ name: 'Acme' })
      .expect(201);
    stockId = res.body.id;
  });
  afterAll(() => app.close());

  const addTrade = (
    side: 'buy' | 'sell',
    quantity: string,
    price: string,
    tradedOn: string,
  ) =>
    request(app.getHttpServer())
      .post('/api/trades')
      .send({ stockId, side, quantity, price, tradedOn });

  it('stores a trade and returns decimals as exact strings', async () => {
    const res = await addTrade('buy', '3', '560.10', '2026-10-01').expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      stockId,
      side: 'buy',
      quantity: '3',
      price: '560.1',
      tradedOn: '2026-10-01',
      createdAt: expect.any(String),
    });
  });

  it('allows selling up to the shares held', async () => {
    await addTrade('buy', '3', '560', '2026-10-01').expect(201);
    await addTrade('sell', '3', '600', '2026-10-02').expect(201);
  });

  it('rejects selling more than held with 409 and says how many were available', async () => {
    await addTrade('buy', '3', '560', '2026-10-01').expect(201);
    const res = await addTrade('sell', '4', '600', '2026-10-02').expect(409);

    expect(res.body.code).toBe('OVERSELL');
    expect(res.body.message).toBe(
      "You only hold 3 Acme share(s) on 2026-10-02, so you can't sell 4.",
    );
    expect(res.body).not.toHaveProperty('saleId');
  });

  it('rejects a sale dated before the shares were bought', async () => {
    await addTrade('buy', '1', '560', '2026-10-05').expect(201);
    await addTrade('sell', '1', '600', '2026-10-04').expect(409);
  });

  it('refuses to delete a buy whose shares were already sold, then allows it once the sale is gone', async () => {
    const buy = await addTrade('buy', '2', '560', '2026-10-01');
    const sell = await addTrade('sell', '2', '600', '2026-10-02');

    const res = await request(app.getHttpServer())
      .delete(`/api/trades/${buy.body.id}`)
      .expect(409);
    expect(res.body.saleId).toBe(sell.body.id);

    await request(app.getHttpServer())
      .delete(`/api/trades/${sell.body.id}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/trades/${buy.body.id}`)
      .expect(204);
  });

  it('refuses to shrink a buy below what was sold but allows a price correction', async () => {
    const buy = await addTrade('buy', '3', '560', '2026-10-01');
    await addTrade('sell', '2', '600', '2026-10-02');

    await request(app.getHttpServer())
      .patch(`/api/trades/${buy.body.id}`)
      .send({ quantity: '1' })
      .expect(409);
    const res = await request(app.getHttpServer())
      .patch(`/api/trades/${buy.body.id}`)
      .send({ price: '555.5' })
      .expect(200);

    expect(res.body).toMatchObject({
      quantity: '3',
      price: '555.5',
      tradedOn: '2026-10-01',
    });
  });

  it('rejects zero, too many decimals, bad dates and unknown stocks', async () => {
    await addTrade('buy', '0', '560', '2026-10-01').expect(400);
    await addTrade('buy', '1', '560.12345', '2026-10-01').expect(400);
    await addTrade('buy', '1', '560', '2026-02-30').expect(400);
    await request(app.getHttpServer())
      .post('/api/trades')
      .send({
        stockId: '0199a1b2-0000-7000-8000-000000000000',
        side: 'buy',
        quantity: '1',
        price: '1',
        tradedOn: '2026-10-01',
      })
      .expect(404);
  });

  it('lets only one of two simultaneous sales of the same shares through', async () => {
    await addTrade('buy', '3', '560', '2026-10-01').expect(201);

    const results = await Promise.all([
      addTrade('sell', '2', '600', '2026-10-02'),
      addTrade('sell', '2', '610', '2026-10-02'),
    ]);

    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
  });
});

describe('/api/portfolio and /api/health', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
  });
  afterAll(() => app.close());

  it('returns every stock and trade in one response', async () => {
    const stock = await request(app.getHttpServer())
      .post('/api/stocks')
      .send({ name: 'Zeta' });
    await request(app.getHttpServer()).post('/api/trades').send({
      stockId: stock.body.id,
      side: 'buy',
      quantity: '2',
      price: '10',
      tradedOn: '2026-10-01',
    });

    const res = await request(app.getHttpServer())
      .get('/api/portfolio')
      .expect(200);

    expect(res.body.stocks).toEqual([
      { id: stock.body.id, name: 'Zeta', symbol: null },
    ]);
    expect(res.body.trades).toHaveLength(1);
  });

  it('reports healthy when the database answers', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200, { status: 'ok' });
  });
});
