module.exports = {
  apps: [
    {
      name: 'reachquix-backend',
      script: './node_modules/.bin/tsx',
      args: 'index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
