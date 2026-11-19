import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

function estimatedEntropyBits(value) {
  const counts = new Map();
  for (const character of value) {
    counts.set(character, (counts.get(character) || 0) + 1);
  }

  let entropyPerCharacter = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropyPerCharacter -= probability * Math.log2(probability);
  }
  return entropyPerCharacter * value.length;
}

function validateProductionJwtSecret(secret) {
  const knownPlaceholder = /(?:change[\s_-]*me|replace[\s_-]*me|your[\s_-]*(?:secret|key)|example|placeholder|test-jwt-secret|(?:admin|manager|agent)@12345)/i;
  if (
    secret !== secret.trim()
    || secret.length < 32
    || knownPlaceholder.test(secret)
    || estimatedEntropyBits(secret) < 128
  ) {
    throw new Error('JWT_SECRET must be a unique, high-entropy secret of at least 32 characters in production.');
  }
}

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function parseCorsOrigins(value) {
  const configuredOrigins = String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length === 0) {
    if (isProduction) {
      throw new Error('CORS_ORIGINS must contain at least one approved HTTPS origin in production.');
    }
    return developmentOrigins;
  }

  const origins = configuredOrigins.map((origin) => {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must be a comma-separated list of valid origins.');
    }

    if (
      !['http:', 'https:'].includes(parsed.protocol)
      || parsed.username
      || parsed.password
      || parsed.pathname !== '/'
      || parsed.search
      || parsed.hash
      || origin === '*'
      || (isProduction && parsed.protocol !== 'https:')
    ) {
      throw new Error('CORS_ORIGINS must contain valid origins; production origins must use HTTPS.');
    }
    return parsed.origin;
  });

  return [...new Set(origins)];
}

let corsOrigins;
try {
  if (isProduction) validateProductionJwtSecret(process.env.JWT_SECRET);
  corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  isProduction,
  corsOrigins,
};
