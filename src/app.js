const express = require('express');
const path = require('path');
const os = require('os');
const { getBuildInfo } = require('./buildInfo');

const startedAt = Date.now();

const PIPELINE_STAGES = [
  { id: 'checkout', name: 'Checkout', tool: 'actions/checkout', icon: '📥' },
  { id: 'validate', name: 'Validate', tool: 'npm ci + eslint', icon: '🔍' },
  { id: 'build', name: 'Build', tool: 'npm run build', icon: '🛠️' },
  { id: 'test', name: 'Test', tool: 'jest + supertest', icon: '🧪' },
  { id: 'package', name: 'Package', tool: 'npm pack', icon: '📦' },
  { id: 'sonar', name: 'Sonar Analysis', tool: 'SonarCloud', icon: '📊' },
  { id: 'docker', name: 'Docker Build', tool: 'docker build', icon: '🐳' },
  { id: 'ecr', name: 'Push to ECR', tool: 'AWS ECR', icon: '☁️' },
  { id: 'eks', name: 'Deploy to EKS', tool: 'kubectl apply', icon: '🚀' },
];

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Liveness probe: is the process up?
  app.get('/health', (req, res) => {
    res.json({ status: 'UP' });
  });

  // Readiness probe: can we serve traffic?
  app.get('/ready', (req, res) => {
    res.json({ status: 'READY' });
  });

  app.get('/api/info', (req, res) => {
    res.json({
      app: 'devops-node-app',
      version: getBuildInfo().version,
      build: getBuildInfo(),
      hostname: os.hostname(), // pod name when running in Kubernetes
      platform: `${os.platform()}/${os.arch()}`,
      node: process.version,
      environment: process.env.APP_ENV || 'local',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
  });

  app.get('/api/pipeline', (req, res) => {
    res.json({ stages: PIPELINE_STAGES });
  });

  app.post('/api/echo', (req, res) => {
    const { message } = req.body || {};
    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message must be a non-empty string' });
    }
    return res.json({ echo: message.trim(), length: message.trim().length });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
  });

  return app;
}

module.exports = { createApp, PIPELINE_STAGES };
