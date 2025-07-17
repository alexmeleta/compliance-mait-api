const config = require('../config/config');

describe('Configuration Tests', () => {
  beforeAll(() => {
    // Ensure we're using the test environment
    process.env.NODE_ENV = 'test';
  });

  test('should load database configuration from .env.test', () => {
    // Check that database configuration is loaded correctly
    expect(config.database).toBeDefined();
    expect(config.database.dialect).toBe('postgres');
    
    // These values should match what's in your .env.test file
    expect(config.database.host).toBe('52.156.160.251');
    expect(config.database.port).toBe(5432);
    expect(config.database.username).toBe('postgres');
    expect(config.database.database).toBe('certs-v3');
  });

  test('should load server configuration', () => {
    expect(config.server).toBeDefined();
    expect(parseInt(config.server.port)).toBe(3001); // From .env.test
    expect(config.server.host).toBe('localhost');
  });

  test('should load JWT configuration', () => {
    expect(config.jwt).toBeDefined();
    expect(config.jwt.secret).toBe('test-secret-key');
    expect(config.jwt.expiresIn).toBe('1h');
  });
});
