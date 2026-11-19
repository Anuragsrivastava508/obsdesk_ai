import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const envModuleUrl = pathToFileURL(resolve('src/config/env.js')).href;
const configImport = `import(${JSON.stringify(envModuleUrl)}).then(({ env }) => {
  console.log(JSON.stringify({ nodeEnv: env.nodeEnv, corsOrigins: env.corsOrigins }));
});`;

function loadConfig(environment) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', configImport], {
    cwd: tmpdir(),
    env: environment,
    encoding: 'utf8',
  });
}

function baseEnvironment() {
  return {
    ...process.env,
    MONGODB_URI: 'mongodb://127.0.0.1:27017/config-validation-only',
  };
}

describe('production configuration', () => {
  test('rejects a missing JWT secret without connecting to MongoDB', () => {
    const environment = baseEnvironment();
    environment.NODE_ENV = 'production';
    environment.CORS_ORIGINS = 'https://frontend.example.com';
    delete environment.JWT_SECRET;

    const result = loadConfig(environment);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required environment variable: JWT_SECRET');
  });

  test.each([
    ['short', 'short-secret'],
    ['example', 'example-production-secret-value-that-is-long-enough'],
    ['known default', 'Admin@12345-This-Is-A-Long-Enough-Key-123456'],
  ])('rejects %s JWT secrets', (_name, secret) => {
    const environment = baseEnvironment();
    environment.NODE_ENV = 'production';
    environment.JWT_SECRET = secret;
    environment.CORS_ORIGINS = 'https://frontend.example.com';

    const result = loadConfig(environment);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JWT_SECRET must be a unique, high-entropy secret');
    expect(result.stderr).not.toContain(secret);
  });

  test('accepts a strong secret and multiple HTTPS CORS origins', () => {
    const environment = baseEnvironment();
    environment.NODE_ENV = 'production';
    environment.JWT_SECRET = randomBytes(48).toString('base64url');
    environment.CORS_ORIGINS = 'https://frontend.example.com,https://admin.example.com';

    const result = loadConfig(environment);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      nodeEnv: 'production',
      corsOrigins: ['https://frontend.example.com', 'https://admin.example.com'],
    });
  });

  test('rejects missing production CORS origins', () => {
    const environment = baseEnvironment();
    environment.NODE_ENV = 'production';
    environment.JWT_SECRET = randomBytes(48).toString('base64url');
    delete environment.CORS_ORIGINS;

    const result = loadConfig(environment);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CORS_ORIGINS must contain at least one approved HTTPS origin');
  });

  test('rejects non-HTTPS production CORS origins', () => {
    const environment = baseEnvironment();
    environment.NODE_ENV = 'production';
    environment.JWT_SECRET = randomBytes(48).toString('base64url');
    environment.CORS_ORIGINS = 'http://frontend.example.com';

    const result = loadConfig(environment);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('production origins must use HTTPS');
  });

  test('uses localhost CORS defaults in development', () => {
    const environment = baseEnvironment();
    environment.NODE_ENV = 'development';
    environment.JWT_SECRET = 'test-only-development-secret';
    delete environment.CORS_ORIGINS;

    const result = loadConfig(environment);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      nodeEnv: 'development',
      corsOrigins: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ],
    });
  });
});
