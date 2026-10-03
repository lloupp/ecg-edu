import { Controller, Get } from '@nestjs/common';
import { runtimeConfig } from './runtime-config';

@Controller('platform')
export class PlatformController {
  @Get('capabilities')
  capabilities() {
    const { databaseUrl, liveEnabled } = runtimeConfig();
    return {
      storage: databaseUrl ? 'postgresql' : 'memory',
      liveEnabled,
      authentication: 'password-session',
      liveAuthorization: liveEnabled ? 'demonstration-only' : 'disabled',
    };
  }
}
