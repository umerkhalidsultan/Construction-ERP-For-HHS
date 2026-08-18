import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  FilePurpose,
  FileStatus,
  Prisma,
  VirusScanStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PrismaService } from '../prisma/prisma.service';
import { IStorageService } from './storage.interface';

type BrandingFileField =
  | 'logoFileId'
  | 'faviconFileId'
  | 'reportHeaderFileId'
  | 'reportFooterFileId'
  | 'emailLogoFileId'
  | 'watermarkFileId';

@Injectable()
export class R2StorageService implements IStorageService {
  private readonly client: S3Client | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.client =
      accountId && accessKeyId && secretAccessKey
        ? new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  async uploadBrandAsset(
    companyId: string,
    purpose: FilePurpose,
    file: Express.Multer.File,
    principal: AuthenticatedPrincipal,
  ) {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access is denied');
    }
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Cloudflare R2 storage is not configured',
      );
    }
    const maxBytes = this.config.get<number>(
      'MAX_IMAGE_UPLOAD_BYTES',
      5 * 1024 * 1024,
    );
    if (!file?.buffer?.length || file.size > maxBytes) {
      throw new BadRequestException(
        `Image is required and must not exceed ${maxBytes} bytes`,
      );
    }

    const processed = await this.processImage(file.buffer, purpose);
    const extension = processed.mimeType === 'image/png' ? 'png' : 'webp';
    const objectKey = `${companyId}/branding/${purpose.toLowerCase()}/${randomUUID()}.${extension}`;
    const publicUrl = this.publicUrl(objectKey);
    const checksum = createHash('sha256')
      .update(processed.buffer)
      .digest('hex');
    const actorId = principal.userId;
    const bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');

    const pending = await this.prisma.fileObject.create({
      data: {
        companyId,
        purpose,
        objectKey,
        originalName: file.originalname.slice(0, 255),
        mimeType: processed.mimeType,
        sizeBytes: BigInt(processed.buffer.length),
        checksumSha256: checksum,
        status: FileStatus.PENDING,
        virusScanStatus: VirusScanStatus.NOT_SCANNED,
        publicUrl,
        metadata: processed.metadata,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: processed.buffer,
          ContentType: processed.mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            companyId,
            checksumSha256: checksum,
          },
        }),
      );
      return await this.attachBrandAsset(
        pending.id,
        companyId,
        purpose,
        publicUrl,
        actorId,
      );
    } catch (error) {
      await this.prisma.fileObject.update({
        where: { id: pending.id },
        data: {
          status: FileStatus.DELETED,
          deletedAt: new Date(),
          updatedBy: actorId,
          metadata: {
            ...processed.metadata,
            uploadFailed: true,
          },
        },
      });
      throw error;
    }
  }

  private async processImage(buffer: Buffer, purpose: FilePurpose) {
    const allowed = new Set<FilePurpose>([
      FilePurpose.COMPANY_LOGO,
      FilePurpose.FAVICON,
      FilePurpose.REPORT_HEADER,
      FilePurpose.REPORT_FOOTER,
      FilePurpose.EMAIL_LOGO,
      FilePurpose.WATERMARK,
    ]);
    if (!allowed.has(purpose)) {
      throw new BadRequestException('Unsupported branding file purpose');
    }
    try {
      const source = sharp(buffer, { failOn: 'warning' }).rotate();
      const metadata = await source.metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Image dimensions are unavailable');
      }
      const maxWidth =
        purpose === FilePurpose.FAVICON
          ? 256
          : purpose === FilePurpose.REPORT_HEADER ||
              purpose === FilePurpose.REPORT_FOOTER
            ? 2400
            : 1600;
      const pipeline = source.resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      });
      const isFavicon = purpose === FilePurpose.FAVICON;
      const output = isFavicon
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.webp({ quality: 88, effort: 5 }).toBuffer();
      return {
        buffer: output,
        mimeType: isFavicon ? 'image/png' : 'image/webp',
        metadata: {
          sourceFormat: metadata.format ?? 'unknown',
          sourceWidth: metadata.width,
          sourceHeight: metadata.height,
          processed: true,
        } satisfies Prisma.InputJsonObject,
      };
    } catch {
      throw new BadRequestException(
        'The uploaded file is not a supported or valid image',
      );
    }
  }

  private async attachBrandAsset(
    fileId: string,
    companyId: string,
    purpose: FilePurpose,
    publicUrl: string | null,
    actorId: string,
  ) {
    const field = this.brandingField(purpose);
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.companyBranding.findUnique({
        where: { companyId },
      });
      const previousFileId = previous?.[field] ?? null;
      const branding = await transaction.companyBranding.upsert({
        where: { companyId },
        create: {
          companyId,
          [field]: fileId,
          createdBy: actorId,
          updatedBy: actorId,
        },
        update: {
          [field]: fileId,
          updatedBy: actorId,
        },
      });
      const file = await transaction.fileObject.update({
        where: { id: fileId },
        data: {
          status: FileStatus.AVAILABLE,
          updatedBy: actorId,
        },
      });
      if (purpose === FilePurpose.COMPANY_LOGO) {
        await transaction.company.update({
          where: { id: companyId },
          data: { logo: publicUrl, updatedBy: actorId },
        });
      }
      if (previousFileId && previousFileId !== fileId) {
        await transaction.fileObject.updateMany({
          where: { id: previousFileId, companyId },
          data: {
            status: FileStatus.DELETED,
            deletedAt: new Date(),
            updatedBy: actorId,
          },
        });
      }
      await this.audit.record(transaction, {
        companyId,
        action: `Company.Branding.${purpose}.Upload`,
        entity: 'CompanyBranding',
        entityId: branding.id,
        oldValue: previous,
        newValue: branding,
      });
      return { branding, file };
    });
  }

  private brandingField(purpose: FilePurpose): BrandingFileField {
    const fields: Partial<Record<FilePurpose, BrandingFileField>> = {
      [FilePurpose.COMPANY_LOGO]: 'logoFileId',
      [FilePurpose.FAVICON]: 'faviconFileId',
      [FilePurpose.REPORT_HEADER]: 'reportHeaderFileId',
      [FilePurpose.REPORT_FOOTER]: 'reportFooterFileId',
      [FilePurpose.EMAIL_LOGO]: 'emailLogoFileId',
      [FilePurpose.WATERMARK]: 'watermarkFileId',
    };
    const field = fields[purpose];
    if (!field) {
      throw new BadRequestException('Unsupported branding file purpose');
    }
    return field;
  }

  private publicUrl(objectKey: string): string | null {
    const base = this.config.get<string>('R2_PUBLIC_URL')?.replace(/\/$/, '');
    if (!base) {
      return null;
    }
    const encodedKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${base}/${encodedKey}`;
  }
}
