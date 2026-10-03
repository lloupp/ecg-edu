import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../data/repositories/repositories';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}
  list() {
    return this.repository.listUsers();
  }

  metrics() {
    return this.repository.metrics();
  }
}
