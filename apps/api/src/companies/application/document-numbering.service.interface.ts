import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import {
  AllocateDocumentNumberDto,
  CreateDocumentSequenceDto,
  UpdateDocumentSequenceDto,
} from '../dto/document-sequence.dto';

export interface IDocumentNumberingService {
  list(companyId: string, principal: AuthenticatedPrincipal): Promise<unknown>;
  create(
    companyId: string,
    dto: CreateDocumentSequenceDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  update(
    companyId: string,
    sequenceId: string,
    dto: UpdateDocumentSequenceDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  delete(
    companyId: string,
    sequenceId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  allocate(
    companyId: string,
    dto: AllocateDocumentNumberDto,
    principal: AuthenticatedPrincipal,
  ): Promise<{ value: string; sequenceId: string; numericValue: string }>;
}

export const DOCUMENT_NUMBERING_SERVICE = Symbol('DOCUMENT_NUMBERING_SERVICE');
