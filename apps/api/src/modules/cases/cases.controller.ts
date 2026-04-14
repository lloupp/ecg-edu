import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CasesService } from './cases.service';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  list() {
    return this.casesService.list();
  }

  @Post()
  create(@Body() payload: UpsertCaseDto) {
    return this.casesService.create(payload);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateCaseDto) {
    return this.casesService.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.casesService.remove(id);
  }
}
