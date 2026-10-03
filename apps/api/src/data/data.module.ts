import { Global, Module } from '@nestjs/common';
import { CasesRepository, LearningRepository, UsersRepository } from './repositories/repositories';
import { MemoryRepository } from './repositories/memory.repository';
import { PostgresRepository } from './repositories/postgres.repository';
import { runtimeConfig } from './runtime-config';
import { PlatformController } from './platform.controller';

const DATA_STORE = Symbol('DATA_STORE');

@Global()
@Module({
  controllers: [PlatformController],
  providers: [
    { provide: DATA_STORE, useFactory: () => {
      const { databaseUrl } = runtimeConfig();
      return databaseUrl ? new PostgresRepository(databaseUrl) : new MemoryRepository();
    } },
    ...[CasesRepository, LearningRepository, UsersRepository].map((provide) => ({ provide, useExisting: DATA_STORE })),
  ],
  exports: [CasesRepository, LearningRepository, UsersRepository],
})
export class DataModule {}
