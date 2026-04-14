import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

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
}
