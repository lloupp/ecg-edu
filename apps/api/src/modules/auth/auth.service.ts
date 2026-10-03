import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { UserProfile } from '@ecg-edu/shared';
import { AuthRepository } from '../../data/repositories/repositories';
import { LoginDto, RegisterDto } from './auth.dto';
import { hashPassword, verifyPassword } from './password';

function sessionTtlMs() {
  const parsed = Number(process.env.AUTH_SESSION_TTL_HOURS ?? '12');
  const hours = Number.isFinite(parsed) ? Math.min(168, Math.max(1, parsed)) : 12;
  return hours * 60 * 60 * 1000;
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  private async issueSession(user: UserProfile) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString();
    await this.repository.createAuthSession({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
    return { user, token, expiresAt };
  }

  async register(payload: RegisterDto) {
    const email = payload.email.trim().toLowerCase();
    if (await this.repository.findAuthUserByEmail(email)) {
      throw new ConflictException('Já existe uma conta com este e-mail');
    }
    const passwordHash = await hashPassword(payload.password);
    try {
      const user = await this.repository.createStudentAccount({
        name: payload.name.trim(),
        email,
        passwordHash,
      });
      return this.issueSession(user);
    } catch {
      throw new ConflictException('Não foi possível criar a conta');
    }
  }

  async login(payload: LoginDto) {
    const record = await this.repository.findAuthUserByEmail(payload.email.trim().toLowerCase());
    if (!record?.passwordHash || !(await verifyPassword(payload.password, record.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.issueSession(record.user);
  }

  async authenticate(token: string) {
    if (!token || token.length < 32 || token.length > 256) throw new UnauthorizedException('Sessão inválida');
    const user = await this.repository.resolveAuthSession(tokenHash(token));
    if (!user) throw new UnauthorizedException('Sessão inválida ou expirada');
    return user;
  }

  async logout(token: string) {
    if (token) await this.repository.revokeAuthSession(tokenHash(token));
    return { success: true };
  }
}
