import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysesService } from './analyses.service';

class ListAnalysesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

@ApiTags('analyses')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('v1/analyses')
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get()
  @ApiOperation({ summary: 'List analyses (paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findMany(@Query() query: ListAnalysesQueryDto) {
    return this.analysesService.findMany({
      limit: query.limit ?? 10,
      page: query.page ?? 1,
    });
  }
}
