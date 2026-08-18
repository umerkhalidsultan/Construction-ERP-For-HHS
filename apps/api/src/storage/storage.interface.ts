import { FilePurpose } from '@prisma/client';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';

export interface IStorageService {
  uploadBrandAsset(
    companyId: string,
    purpose: FilePurpose,
    file: Express.Multer.File,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
