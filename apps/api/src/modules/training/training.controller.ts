import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfile } from '@ecg-edu/shared';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guards';
import { TrainingService } from './training.service';

class TrainingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index = 0;
}

class SubmitTrainingDto {
  @IsString()
  questionId!: string;

  @IsString()
  selectedAnswer!: string;
}

@Controller('training')
@UseGuards(AuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('question')
  question(@Query() query: TrainingQueryDto, @CurrentUser() user: UserProfile) {
    return this.trainingService.next(query.index, user.id);
  }

  @Get('progress')
  progress(@CurrentUser() user: UserProfile) {
    return this.trainingService.progress(user.id);
  }

  @Get('review')
  review(@CurrentUser() user: UserProfile) {
    return this.trainingService.review(user.id);
  }

  @Post('answer')
  answer(@Body() payload: SubmitTrainingDto, @CurrentUser() user: UserProfile) {
    return this.trainingService.answer(payload.questionId, payload.selectedAnswer, user.id);
  }
}
