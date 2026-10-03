import { Controller, Get } from '@nestjs/common';
import { runtimeConfig } from './runtime-config';
import { Public } from '../modules/auth/access';

@Controller('platform')
export class PlatformController {
  @Get('capabilities')
  @Public()
  capabilities() {
    const { databaseUrl } = runtimeConfig();
    return { storage: databaseUrl ? 'postgresql' : 'memory', liveEnabled: false, authentication: 'session_cookie' };
  }
}
