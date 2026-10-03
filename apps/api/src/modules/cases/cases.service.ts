import { Injectable, NotFoundException } from '@nestjs/common';
import { CasesRepository } from '../../data/repositories/repositories';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';

@Injectable()
export class CasesService {
  constructor(private readonly repository: CasesRepository) {}
  list() {
    return this.repository.listCases();
  }

  create(payload: UpsertCaseDto) {
    return this.repository.createCase(payload);
  }

  async update(id: string, payload: UpdateCaseDto) {
    const updated = await this.repository.updateCase(id, payload);
    if (!updated) {
      throw new NotFoundException('Caso não encontrado');
    }
    return updated;
  }

  async remove(id: string) {
    const removed = await this.repository.deleteCase(id);
    if (!removed) {
      throw new NotFoundException('Caso não encontrado');
    }
    return { success: true };
  }
}
