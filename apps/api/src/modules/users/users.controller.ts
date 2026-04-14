import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  listUsers() {
    return this.usersService.list();
  }

  @Get('dashboard/metrics')
  metrics() {
    return this.usersService.metrics();
  }
}
