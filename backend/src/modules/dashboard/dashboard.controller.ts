import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard aggregate statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }
}
