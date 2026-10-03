import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split('$');
  if (version !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(hash ?? '')) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, 'hex'));
}
