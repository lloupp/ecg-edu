import { AuthService } from '../../src/modules/auth/auth.service';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password';
import { AuthRepository } from '../../src/data/repositories/repositories';
import { UserProfile } from '@ecg-edu/shared';

class FakeAuthRepository extends AuthRepository {
  users = new Map<string, { user: UserProfile; passwordHash: string | null }>();
  sessions = new Map<string, { userId: string; expiresAt: string; revoked: boolean }>();

  async findAuthUserByEmail(email: string) {
    return this.users.get(email.toLowerCase());
  }

  async createStudentAccount(input: { name: string; email: string; passwordHash: string }) {
    const user: UserProfile = {
      id: `user-${this.users.size + 1}`,
      name: input.name,
      email: input.email,
      role: 'student',
      institution: 'Teste',
      specialty: 'Teste',
    };
    this.users.set(input.email, { user, passwordHash: input.passwordHash });
    return user;
  }

  async createAuthSession(input: { userId: string; tokenHash: string; expiresAt: string }) {
    this.sessions.set(input.tokenHash, { userId: input.userId, expiresAt: input.expiresAt, revoked: false });
  }

  async resolveAuthSession(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revoked || Date.parse(session.expiresAt) <= Date.now()) return undefined;
    for (const record of this.users.values()) if (record.user.id === session.userId) return record.user;
    return undefined;
  }

  async revokeAuthSession(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    if (session) session.revoked = true;
  }
}

describe('authentication primitives', () => {
  it('hashes passwords with salt and verifies without storing plaintext', async () => {
    const first = await hashPassword('Password-Test-2026!');
    const second = await hashPassword('Password-Test-2026!');
    expect(first).not.toBe(second);
    expect(first).not.toContain('Password-Test-2026!');
    expect(await verifyPassword('Password-Test-2026!', first)).toBe(true);
    expect(await verifyPassword('wrong-password', first)).toBe(false);
  });

  it('rejects malformed password hashes', async () => {
    expect(await verifyPassword('Password-Test-2026!', 'not-a-valid-hash')).toBe(false);
    expect(await verifyPassword('Password-Test-2026!', 'scrypt$999999$8$1$bad$bad')).toBe(false);
  });

  it('issues and revokes a server-side session for a registered student', async () => {
    const repository = new FakeAuthRepository();
    const service = new AuthService(repository);
    const session = await service.register({
      name: 'Aluno Teste',
      email: 'student@example.org',
      password: 'Password-Test-2026!',
    });
    expect(session.user.role).toBe('student');
    expect(session.token.length).toBeGreaterThan(32);
    expect(await service.authenticate(session.token)).toEqual(session.user);

    await service.logout(session.token);
    await expect(service.authenticate(session.token)).rejects.toThrow('Sessão inválida ou expirada');
  });

  it('does not allow role selection during public registration', async () => {
    const repository = new FakeAuthRepository();
    const service = new AuthService(repository);
    const session = await service.register({
      name: 'Outro Aluno',
      email: 'another@example.org',
      password: 'Another-Password-2026!',
    });
    expect(session.user.role).toBe('student');
  });
});
