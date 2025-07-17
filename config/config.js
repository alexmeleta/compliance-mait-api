// Load environment-specific .env file
const env = process.env.NODE_ENV || 'development';
const path = require('path');
const dotenv = require('dotenv');

// First load the .env file
dotenv.config();

// Then load environment-specific .env file if it exists
const envPath = path.resolve(process.cwd(), `.env.${env}`);
const file = dotenv.config({ path: envPath });

console.log(`Loading configuration for environment: .env.${env}`);
console.log(`Loading configuration for environment: ${env}`);
console.log(file.parsed.DB_HOST);

// Default configuration for all environments
const defaultConfig = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  }
};

// Environment specific configurations
const environments = {
  development: {
    database: {
      dialect: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      define: {
        timestamps: true,
        underscored: false,
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
      },
      logging: console.log
    }
  },
  production: {
    database: {
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      define: {
        timestamps: true,
        underscored: false,
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
      },
      logging: false
    }
  },
  test: {
    database: {
      dialect: 'postgres',
      host: file.parsed.DB_HOST,
      port: parseInt(file.parsed.DB_PORT) ,
      username: file.parsed.DB_USERNAME,
      password: file.parsed.DB_PASSWORD,
      database: file.parsed.DB_NAME,
      define: {
        timestamps: true,
        underscored: false,
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
      },
      logging: false
    }
  }
};

console.log(environments[env]);

// Merge default config with environment specific config
const config = {
  ...defaultConfig,
  ...environments[env]
};

module.exports = config;
