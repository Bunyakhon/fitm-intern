// Pure configuration reader: callers may supply an explicit environment without
// importing Models, creating a connection, or changing dotenv precedence.
function databaseEnvironment(env = process.env) {
  const required = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'];
  const invalid = required.filter(key => typeof env[key] !== 'string'
    || !env[key].trim() || env[key].includes('\0'));
  const port = typeof env.DB_PORT === 'string' && /^[0-9]+$/.test(env.DB_PORT) ? Number(env.DB_PORT) : NaN;
  if (!invalid.includes('DB_PORT')
    && (!Number.isInteger(port) || port < 1 || port > 65535)) invalid.push('DB_PORT');
  if (invalid.length) {
    // Never interpolate values, credentials, or a connection URI into errors.
    throw new Error(`Invalid database environment: ${invalid.join(', ')}`);
  }
  return { database: env.DB_NAME, username: env.DB_USER, password: env.DB_PASSWORD,
    host: env.DB_HOST, port };
}

module.exports = { databaseEnvironment };
