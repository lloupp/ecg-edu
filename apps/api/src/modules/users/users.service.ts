import { Injectable } from '@nestjs/common';
import { db } from '../../data/in-memory.db';

@Injectable()
export class UsersService {
  list() {
    return db.listUsers();
  }

  metrics() {
    return db.metrics();
  }
}
