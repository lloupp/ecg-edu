import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { AuthGuard, RolesGuard } from '../auth/auth.guards';
import { CasesService } from './cases.service';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';

@Controller('cases')
@UseGuards(AuthGuard, RolesGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  list() { return this.casesService.list(); }

  @Post()
  @Roles('teacher')
  create(@Body() payload: UpsertCaseDto, @CurrentUser() user: UserProfile) {
    return this.casesService.create(payload, user);
  }

  @Patch(':id')
  @Roles('teacher')
  update(@Param('id') id: string, @Body() payload: UpdateCaseDto, @CurrentUser() user: UserProfile) {
    return this.casesService.update(id, payload, user);
  }

  @Delete(':id')
  @Roles('teacher')
  remove(@Param('id') id: string, @CurrentUser() user: UserProfile) {
    return this.casesService.remove(id, user);
  }
}
