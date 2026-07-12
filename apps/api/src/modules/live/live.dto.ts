import { IsArray, IsString } from 'class-validator';

export class StartSessionDto {
  @IsString()
  teacherId!: string;

  @IsString()
  title!: string;

  @IsArray()
  questionIds!: string[];
}

export class JoinSessionDto {
  @IsString()
  name!: string;
}

export class ActivateSessionDto {
  @IsString()
  teacherId!: string;
}

export class AdvanceSessionDto {
  @IsString()
  teacherId!: string;
}

export class AnswerSessionDto {
  @IsString()
  participantId!: string;

  @IsString()
  answer!: string;
}
