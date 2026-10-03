import { Controller, Get } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { CurrentUser } from '../auth/access';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  listUsers(@CurrentUser() user: UserProfile) {
    return user.role === 'teacher' ? this.usersService.list() : [user];
  }

  @Get('dashboard/metrics')
  metrics() {
    return this.usersService.metrics();
  }
}
