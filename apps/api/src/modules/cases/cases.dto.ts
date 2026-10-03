import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import type { CompetencyCode, EcgInterpretation } from '@ecg-edu/shared';

class ClinicalReferenceDto {
  @IsString()
  title!: string;

  @IsString()
  organization!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsUrl({ require_protocol: true })
  url!: string;
}

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
  @IsString({ each: true })
  tags!: string[];

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
  @IsString({ each: true })
  learningObjectives?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['rate', 'rhythm', 'axis', 'intervals', 'waves', 'segments', 'diagnosis', 'differential', 'clinical_context'], { each: true })
  competencies?: CompetencyCode[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  differentialDiagnoses?: string[];

  @IsOptional()
  @IsObject()
  interpretation?: EcgInterpretation;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalReferenceDto)
  references?: ClinicalReferenceDto[];

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
  @IsString({ each: true })
  tags?: string[];

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
  @IsString({ each: true })
  learningObjectives?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['rate', 'rhythm', 'axis', 'intervals', 'waves', 'segments', 'diagnosis', 'differential', 'clinical_context'], { each: true })
  competencies?: CompetencyCode[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  differentialDiagnoses?: string[];

  @IsOptional()
  @IsObject()
  interpretation?: EcgInterpretation;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalReferenceDto)
  references?: ClinicalReferenceDto[];

}
