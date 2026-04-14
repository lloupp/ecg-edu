import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../data/in-memory.db';
import { UpdateCaseDto, UpsertCaseDto } from './cases.dto';

@Injectable()
export class CasesService {
  list() {
    return db.listCases();
  }

  create(payload: UpsertCaseDto) {
    return db.createCase(payload);
  }

  update(id: string, payload: UpdateCaseDto) {
    const updated = db.updateCase(id, payload);
    if (!updated) {
      throw new NotFoundException('Caso não encontrado');
    }
    return updated;
  }

  remove(id: string) {
    const removed = db.deleteCase(id);
    if (!removed) {
      throw new NotFoundException('Caso não encontrado');
    }
    return { success: true };
  }
}
