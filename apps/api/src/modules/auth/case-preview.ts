import { CasePreview, ClinicalCase } from '@ecg-edu/shared';
export function casePreview(item: ClinicalCase): CasePreview {
  return { id: item.id, title: 'Caso de ECG', ecgImageUrl: item.ecgImageUrl, clinicalDescription: item.clinicalDescription,
    level: item.level, status: item.status, tags: [], createdBy: item.createdBy, liveQuestionId: item.liveQuestionId };
}
