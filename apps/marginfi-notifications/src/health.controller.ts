import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private health: HealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
