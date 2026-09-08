module.exports = {
  apps: [{
    name: 'gateway',
    script: 'src/index.ts',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '250M',
    env: {
      NODE_ENV: 'production',
      HTTP_PORT: '8080',
      MQTT_PORT: '1883',
      DB_PATH: './data/gateway.db',
      CLOUD_API: 'https://your-worker.workers.dev',
      CLOUD_KEY: '',
      SYNC_INTERVAL: '30',
      DATA_RETENTION_DAYS: '180',
      DEVICE_AUTO_REGISTER: 'true',
      LOG_LEVEL: 'info',
    },
  }],
};
