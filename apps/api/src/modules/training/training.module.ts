import { Module } from '@nestjs/common';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}
