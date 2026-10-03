import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingService } from './training.service';

class TrainingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index = 0;

  @IsOptional()
  @IsString()
  userId?: string;
}

class SubmitTrainingDto {
  @IsString()
  questionId!: string;

  @IsString()
  selectedAnswer!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

class UserLearningQueryDto {
  @IsString()
  userId!: string;
}

@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('question')
  question(@Query() query: TrainingQueryDto) {
    return this.trainingService.next(query.index, query.userId);
  }

  @Get('progress')
  progress(@Query() query: UserLearningQueryDto) {
    return this.trainingService.progress(query.userId);
  }

  @Get('review')
  review(@Query() query: UserLearningQueryDto) {
    return this.trainingService.review(query.userId);
  }

  @Post('answer')
  answer(@Body() payload: SubmitTrainingDto) {
    return this.trainingService.answer(payload.questionId, payload.selectedAnswer, payload.userId);
  }
}
