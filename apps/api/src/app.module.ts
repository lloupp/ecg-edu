import { DataModule } from './data/data.module';
import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { CasesModule } from './modules/cases/cases.module';
import { LiveModule } from './modules/live/live.module';
import { TrainingModule } from './modules/training/training.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [DataModule, AuthModule, UsersModule, CasesModule, LiveModule, TrainingModule],
})
export class AppModule {}
