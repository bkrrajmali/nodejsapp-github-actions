const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const server = createApp().listen(PORT, () => {
  console.log(`devops-node-app listening on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown so Kubernetes rolling updates don't drop requests
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
