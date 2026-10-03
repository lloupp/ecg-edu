import { ConflictException, Injectable } from '@nestjs/common';
import { UsersRepository } from '../../data/repositories/repositories';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly repository: UsersRepository) {}
  async login(payload: LoginDto) {
    try {
      const user = await this.repository.login(payload.email, payload.role);
      return {
        user,
        token: `mock-token-${user.id}`,
      };
    } catch (error) {
      throw new ConflictException(error instanceof Error ? error.message : 'Não foi possível autenticar');
    }
  }
}
