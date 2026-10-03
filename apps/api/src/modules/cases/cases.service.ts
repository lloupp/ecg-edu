import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { CasesRepository } from '../../data/repositories/repositories';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';

@Injectable()
export class CasesService {
  constructor(private readonly repository: CasesRepository) {}

  list() { return this.repository.listCases(); }

  create(payload: UpsertCaseDto, user: UserProfile) {
    return this.repository.createCase({ ...payload, createdBy: user.id });
  }

  private async requireOwner(id: string, user: UserProfile) {
    const current = (await this.repository.listCases()).find((item) => item.id === id);
    if (!current) throw new NotFoundException('Caso não encontrado');
    if (current.createdBy !== user.id) throw new ForbiddenException('Apenas o autor pode alterar este caso');
  }

  async update(id: string, payload: UpdateCaseDto, user: UserProfile) {
    await this.requireOwner(id, user);
    const updated = await this.repository.updateCase(id, payload);
    if (!updated) throw new NotFoundException('Caso não encontrado');
    return updated;
  }

  async remove(id: string, user: UserProfile) {
    await this.requireOwner(id, user);
    const removed = await this.repository.deleteCase(id);
    if (!removed) throw new NotFoundException('Caso não encontrado');
    return { success: true };
  }
}
