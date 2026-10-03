import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { ClinicalReference, CompetencyCode, EcgInterpretation } from '@ecg-edu/shared';

export class UpsertCaseDto {
  @IsString()
  title!: string;

  @IsString()
  ecgImageUrl!: string;

  @IsString()
  clinicalDescription!: string;

  @IsString()
  diagnosis!: string;

  @IsString()
  explanation!: string;

  @IsIn(['basic', 'intermediate', 'advanced'])
  level!: 'basic' | 'intermediate' | 'advanced';

  @IsArray()
  tags!: string[];

  @IsString()
  createdBy!: string;

  @IsIn(['published', 'pending_review'])
  status!: 'published' | 'pending_review';

  @IsOptional()
  @IsIn(['schematic', 'deidentified_clinical'])
  ecgImageKind?: 'schematic' | 'deidentified_clinical';

  @IsOptional()
  @IsString()
  imageSource?: string;

  @IsOptional()
  @IsArray()
  learningObjectives?: string[];

  @IsOptional()
  @IsArray()
  competencies?: CompetencyCode[];

  @IsOptional()
  @IsArray()
  differentialDiagnoses?: string[];

  @IsOptional()
  @IsObject()
  interpretation?: EcgInterpretation;

  @IsOptional()
  @IsArray()
  references?: ClinicalReference[];

  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  lastReviewedAt?: string;
}

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  ecgImageUrl?: string;

  @IsOptional()
  @IsString()
  clinicalDescription?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsIn(['basic', 'intermediate', 'advanced'])
  level?: 'basic' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsIn(['published', 'pending_review'])
  status?: 'published' | 'pending_review';

  @IsOptional()
  @IsIn(['schematic', 'deidentified_clinical'])
  ecgImageKind?: 'schematic' | 'deidentified_clinical';

  @IsOptional()
  @IsString()
  imageSource?: string;

  @IsOptional()
  @IsArray()
  learningObjectives?: string[];

  @IsOptional()
  @IsArray()
  competencies?: CompetencyCode[];

  @IsOptional()
  @IsArray()
  differentialDiagnoses?: string[];

  @IsOptional()
  @IsObject()
  interpretation?: EcgInterpretation;

  @IsOptional()
  @IsArray()
  references?: ClinicalReference[];

  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  lastReviewedAt?: string;
}
