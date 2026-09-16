module.exports = {
  apps: [{
    name: 'gateway',
    script: 'src/index.ts',
    // tsx 直接跑 TS（与 npm run dev 同运行时路径，避免 dist ESM emit 陷阱）
    // 注意：Termux 下 node_modules/.bin/tsx 是 bash shim，PM2 spawn 可执行
    interpreter: require('path').join(__dirname, 'node_modules', '.bin', 'tsx'),
    interpreter_args: ['--env-file=.env'],
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '250M',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
