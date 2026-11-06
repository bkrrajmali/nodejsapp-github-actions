const request = require('supertest');
const { createApp, PIPELINE_STAGES } = require('../src/app');
const { getBuildInfo, resetBuildInfoCache } = require('../src/buildInfo');

const app = createApp();

describe('health endpoints', () => {
  test('GET /health returns UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'UP' });
  });

  test('GET /ready returns READY', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
  });
});

describe('GET /api/info', () => {
  test('returns runtime and build info', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body.app).toBe('devops-node-app');
    expect(res.body.node).toBe(process.version);
    expect(res.body).toHaveProperty('hostname');
    expect(res.body).toHaveProperty('build.commit');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });
});

describe('GET /api/pipeline', () => {
  test('lists all 9 pipeline stages in order', async () => {
    const res = await request(app).get('/api/pipeline');
    expect(res.status).toBe(200);
    expect(res.body.stages).toHaveLength(9);
    expect(res.body.stages[0].id).toBe('checkout');
    expect(res.body.stages.at(-1).id).toBe('eks');
    expect(res.body.stages).toEqual(PIPELINE_STAGES);
  });
});

describe('POST /api/echo', () => {
  test('echoes a trimmed message', async () => {
    const res = await request(app).post('/api/echo').send({ message: '  hello devops  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ echo: 'hello devops', length: 12 });
  });

  test('rejects an empty message', async () => {
    const res = await request(app).post('/api/echo').send({ message: '   ' });
    expect(res.status).toBe(400);
  });

  test('rejects a missing message', async () => {
    const res = await request(app).post('/api/echo').send({});
    expect(res.status).toBe(400);
  });
});

describe('static UI and 404', () => {
  test('serves the dashboard at /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('DevOps Pipeline');
  });

  test('unknown route returns JSON 404', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});

describe('build info', () => {
  const OLD_ENV = process.env;
  afterEach(() => {
    process.env = OLD_ENV;
    resetBuildInfoCache();
  });

  test('environment variables override defaults', () => {
    process.env = { ...OLD_ENV, APP_VERSION: '9.9.9', GIT_SHA: 'abc1234' };
    resetBuildInfoCache();
    const info = getBuildInfo();
    expect(info.version).toBe('9.9.9');
    expect(info.commit).toBe('abc1234');
  });
});
