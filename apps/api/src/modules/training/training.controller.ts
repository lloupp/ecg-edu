import { Body, Controller, ForbiddenException, Get, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfile } from '@ecg-edu/shared';
import { CurrentUser } from '../auth/access';
import { TrainingService } from './training.service';
class TrainingQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) index = 0;
  @IsOptional() @IsString() userId?: string;
}
class SubmitTrainingDto {
  @IsString() questionId!: string;
  @IsString() @MaxLength(1000) selectedAnswer!: string;
  @IsOptional() @IsString() userId?: string;
}
class UserLearningQueryDto { @IsOptional() @IsString() userId?: string; }
function ownId(user: UserProfile, requestedId?: string) {
  if (requestedId && requestedId !== user.id) throw new ForbiddenException('Progresso pertence à conta autenticada');
  return user.id;
}
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}
  @Get('question')
  question(@Query() query: TrainingQueryDto, @CurrentUser() user: UserProfile) {
    return this.trainingService.next(query.index, ownId(user, query.userId));
  }
  @Get('progress')
  progress(@Query() query: UserLearningQueryDto, @CurrentUser() user: UserProfile) {
    return this.trainingService.progress(ownId(user, query.userId));
  }
  @Get('review')
  review(@Query() query: UserLearningQueryDto, @CurrentUser() user: UserProfile) {
    return this.trainingService.review(ownId(user, query.userId));
  }
  @Post('answer')
  answer(@Body() payload: SubmitTrainingDto, @CurrentUser() user: UserProfile) {
    return this.trainingService.answer(payload.questionId, payload.selectedAnswer, ownId(user, payload.userId));
  }
}
