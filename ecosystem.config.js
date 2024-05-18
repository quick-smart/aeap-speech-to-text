module.exports = {
    apps: [
      {
        name: 'speech-to-text',
        script: './index.js', // Path to your main application file
        instances: 'max', // Or a specific number of instances, e.g., 2
        exec_mode: 'cluster', // 'fork' or 'cluster'
        env: {
          NODE_ENV: 'development',
          PORT: 3000
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 8080
        },
        watch: false, // Watch files for changes and automatically restart
        ignore_watch: ['node_modules', 'logs'], // Ignore watching these directories
        log_file: './logs/combined.log', // Combined log file
        error_file: './logs/err.log', // Error log file
        out_file: './logs/out.log', // Out log file
        merge_logs: true, // Merge logs from different instances
        autorestart: true, // Automatically restart if the process crashes
        max_restarts: 10, // Maximum number of restarts in case of crashing
        min_uptime: '60s' // Minimum uptime before considering a restart
      }
    ]
  };
  