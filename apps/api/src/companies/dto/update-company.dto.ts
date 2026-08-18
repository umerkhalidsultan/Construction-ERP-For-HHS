import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl, MaxLength } from 'class-validator';
import { normalizeWebsiteUrl } from '../../common/utils/website-url';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({ example: 'https://example.com', nullable: true })
  @Transform(({ value }) => normalizeWebsiteUrl(value))
  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
      protocols: ['http', 'https'],
      allow_underscores: true,
    },
    { message: 'website must be a valid HTTP or HTTPS URL' },
  )
  @MaxLength(2048)
  website?: string | null;
}
