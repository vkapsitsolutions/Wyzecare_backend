import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('/health')
  getHealth(): object {
    return {
      status: 'running',
      uptime: `${process.uptime().toFixed(2)} seconds`,
      memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      timestamp: new Date().toISOString().split('T')[0],
    };
  }
}
