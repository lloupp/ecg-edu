import { Controller, Get, Post, ServiceUnavailableException } from '@nestjs/common';
// Live identity and persistence have not been migrated. Deny every HTTP mutation until that work is complete.
@Controller('live')
export class LiveController {
  @Get('sessions')
  list() { return []; }
  @Post(['sessions', 'sessions/:code/join', 'sessions/:code/activate', 'sessions/:code/answer', 'sessions/:code/next'])
  unavailable() { throw new ServiceUnavailableException('Aulas ao vivo aguardam persistência e vínculo dos participantes à sessão autenticada.'); }
}
