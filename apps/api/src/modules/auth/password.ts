import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, cost = COST, blockSize = BLOCK_SIZE, parallelization = PARALLELIZATION) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: cost, r: blockSize, p: parallelization, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, costRaw, blockRaw, parallelRaw, saltRaw, keyRaw] = encoded.split('$');
  const cost = Number(costRaw);
  const blockSize = Number(blockRaw);
  const parallelization = Number(parallelRaw);
  if (
    algorithm !== 'scrypt' ||
    !Number.isInteger(cost) ||
    !Number.isInteger(blockSize) ||
    !Number.isInteger(parallelization) ||
    cost < 4096 ||
    cost > COST ||
    blockSize !== BLOCK_SIZE ||
    parallelization !== PARALLELIZATION ||
    !saltRaw ||
    !keyRaw
  ) return false;

  try {
    const expected = Buffer.from(keyRaw, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await derive(password, Buffer.from(saltRaw, 'base64url'), cost, blockSize, parallelization);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
