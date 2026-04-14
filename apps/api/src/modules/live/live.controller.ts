import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnswerSessionDto, JoinSessionDto, StartSessionDto } from './live.dto';
import { LiveService } from './live.service';

@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Get('sessions')
  list() {
    return this.liveService.list();
  }

  @Post('sessions')
  start(@Body() payload: StartSessionDto) {
    return this.liveService.start(payload);
  }

  @Post('sessions/:code/join')
  join(@Param('code') code: string, @Body() payload: JoinSessionDto) {
    return this.liveService.join(code, payload.name);
  }

  @Post('sessions/:code/activate')
  activate(@Param('code') code: string) {
    return this.liveService.activate(code);
  }

  @Post('sessions/:code/answer')
  answer(@Param('code') code: string, @Body() payload: AnswerSessionDto) {
    return this.liveService.answer(code, payload);
  }

  @Post('sessions/:code/next')
  advance(@Param('code') code: string) {
    return this.liveService.advance(code);
  }
}
