import { ConflictException, Injectable } from '@nestjs/common';
import { db } from '../../data/in-memory.db';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  login(payload: LoginDto) {
    try {
      const user = db.login(payload.email, payload.role);
      return {
        user,
        token: `mock-token-${user.id}`,
      };
    } catch (error) {
      throw new ConflictException(error instanceof Error ? error.message : 'Não foi possível autenticar');
    }
  }
}
