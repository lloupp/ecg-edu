import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { AuthRepository } from '../../data/repositories/repositories';
import { LoginDto, RegisterDto } from './auth.dto';
import { hashPassword, verifyPassword } from './password';
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const sessionLifetimeMs = 8 * 60 * 60 * 1000;
@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly repository: AuthRepository) {}
  // Single-process protection for development/staging; production remains explicitly blocked.
  private throttle(ip: string, email: string) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
    if (this.buckets.size >= 5000) throw new HttpException('Autenticação temporariamente indisponível', 429);
    for (const [key, limit] of [[`ip:${ip}`, 30], [`email:${email}`, 10]] as const) {
      const bucket = this.buckets.get(key) ?? { count: 0, resetAt: now + 5 * 60 * 1000 };
      this.buckets.set(key, bucket);
      if (++bucket.count > limit) throw new HttpException('Muitas tentativas. Aguarde antes de tentar novamente.', 429);
    }
  }
  async register(payload: RegisterDto, ip: string) {
    const email = payload.email.trim().toLowerCase(); this.throttle(ip, email);
    const user = await this.repository.createAccount({ id: randomUUID(), email, name: payload.name.trim(), role: 'student',
      institution: 'Comunidade ECG Edu', specialty: 'Aprendizagem educacional' }, await hashPassword(payload.password));
    return this.startSession(user);
  }
  async login(payload: LoginDto, ip: string) {
    const email = payload.email.trim().toLowerCase(); this.throttle(ip, email);
    const credential = await this.repository.findCredential(email);
    const valid = await verifyPassword(payload.password, credential?.passwordHash ?? await this.dummyHash);
    if (!valid || !credential) throw new UnauthorizedException('E-mail ou senha inválidos');
    return this.startSession(credential.user);
  }
  private async startSession(user: UserProfile) {
    const token = randomBytes(32).toString('base64url');
    await this.repository.createSession(tokenHash(token), user.id, new Date(Date.now() + sessionLifetimeMs));
    return { user, token };
  }
  sessionUser(token: string) { return this.repository.sessionUser(tokenHash(token)); }
  logout(token: string) { return this.repository.revokeSession(tokenHash(token)); }
}
