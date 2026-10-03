import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { CurrentUser, Roles } from '../auth/access';
import { casePreview } from '../auth/case-preview';
import { CasesService } from './cases.service';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}
  @Get()
  async list(@CurrentUser() user: UserProfile) {
    const cases = await this.casesService.list();
    return user.role === 'teacher' ? cases.filter((c) => c.createdBy === user.id || c.status === 'published') : cases.filter((c) => c.status === 'published').map(casePreview);
  }
  @Roles('teacher')
  @Post()
  create(@Body() payload: UpsertCaseDto, @CurrentUser() user: UserProfile) {
    if (payload.createdBy && payload.createdBy !== user.id) throw new ForbiddenException('Autoria deve corresponder à sessão');
    return this.casesService.create({ ...payload, createdBy: user.id });
  }
  @Roles('teacher')
  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateCaseDto, @CurrentUser() user: UserProfile) {
    return this.casesService.update(id, payload, user.id);
  }
  @Roles('teacher')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserProfile) {
    return this.casesService.remove(id, user.id);
  }
}
