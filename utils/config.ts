import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true } as any);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

export const config = {
  baseUrl: requireEnv('BASE_URL'),
  username: requireEnv('USERNAME'),
  password: requireEnv('PASSWORD'),
};
