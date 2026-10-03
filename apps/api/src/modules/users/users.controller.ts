import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { AuthGuard, RolesGuard } from '../auth/auth.guards';
import { UsersService } from './users.service';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('teacher')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  listUsers() { return this.usersService.list(); }

  @Get('dashboard/metrics')
  metrics() { return this.usersService.metrics(); }
}
