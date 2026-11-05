import { Module } from '@nestjs/common';
import { ThreatIntelService } from './threat-intel.service';
import { ThreatIntelController } from './threat-intel.controller';
import { VirusTotalClient } from './virustotal.client';
import { UrlhausClient } from './urlhaus.client';
import { ThreatIntelCacheService } from './threat-intel-cache.service';

@Module({
  providers: [ThreatIntelService, VirusTotalClient, UrlhausClient, ThreatIntelCacheService],
  controllers: [ThreatIntelController],
})
export class ThreatIntelModule {}
