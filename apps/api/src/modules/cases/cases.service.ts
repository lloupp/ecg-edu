import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CasesRepository } from '../../data/repositories/repositories';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';

@Injectable()
export class CasesService {
  constructor(private readonly repository: CasesRepository) {}
  list() {
    return this.repository.listCases();
  }

  create(payload: UpsertCaseDto & { createdBy: string }) {
    return this.repository.createCase(payload);
  }

  async update(id: string, payload: UpdateCaseDto, ownerId: string) {
    await this.requireOwner(id, ownerId);
    const updated = await this.repository.updateCase(id, payload);
    if (!updated) {
      throw new NotFoundException('Caso não encontrado');
    }
    return updated;
  }

  private async requireOwner(id: string, ownerId: string) {
    const item = (await this.repository.listCases()).find((c) => c.id === id);
    if (!item) throw new NotFoundException('Caso não encontrado');
    if (item.createdBy !== ownerId) throw new ForbiddenException('Apenas o autor pode alterar ou excluir este caso');
  }
  async remove(id: string, ownerId: string) {
    await this.requireOwner(id, ownerId);
    const removed = await this.repository.deleteCase(id);
    if (!removed) {
      throw new NotFoundException('Caso não encontrado');
    }
    return { success: true };
  }
}
