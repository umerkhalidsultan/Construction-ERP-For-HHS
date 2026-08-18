import { PartialType } from '@nestjs/swagger';
import {
  QualityActionStatus,
  QualityAnswerType,
  QualityControlPoint,
  QualityInspectionStatus,
  QualityInspectionType,
  QualityIssueStatus,
  QualityIssueType,
  QualityItpStatus,
  QualityNcrSeverity,
  QualityNcrStatus,
  QualityPlanStatus,
  QualitySampleStatus,
  QualitySubmittalStatus,
  QualitySubmittalType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class QualityPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 50;
  @IsOptional() @IsString() @MaxLength(80) status?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}

export class CreateQualityStandardDto {
  @IsString() @Length(2, 50) code!: string;
  @IsString() @Length(2, 200) name!: string;
  @IsOptional() @IsString() @MaxLength(160) issuingBody?: string;
  @IsOptional() @IsString() @MaxLength(80) edition?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
}

export class CreateQualityPlanDto {
  @IsString() @Length(2, 80) planNumber!: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsUUID() projectManagerId?: string;
  @IsOptional() @IsUUID() qualityManagerId?: string;
  @IsArray() @ArrayMaxSize(100) applicableStandards!: string[];
  @IsString() @MinLength(10) @MaxLength(10000) qualityObjectives!: string;
  @IsString() @MinLength(10) @MaxLength(10000) inspectionStrategy!: string;
  @IsOptional() @IsString() @MaxLength(10000) testingRequirements?: string;
  @IsOptional() @IsString() @MaxLength(10000) approvalRequirements?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) criticalActivities?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) criticalMaterials?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) requiredRecords?: string[];
  @IsOptional() @IsDateString() effectiveDate?: string;
}

export class UpdateQualityPlanDto extends PartialType(CreateQualityPlanDto) {
  @IsOptional() @IsEnum(QualityPlanStatus) status?: QualityPlanStatus;
}

export class QualityDecisionDto {
  @IsOptional() @IsString() @MaxLength(10000) comments?: string;
}

export class CreateItpDto {
  @IsString() @Length(2, 80) itpNumber!: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsUUID() wbsId?: string;
  @IsOptional() @IsUUID() activityId?: string;
  @IsOptional() @IsUUID() boqItemId?: string;
  @IsOptional() @IsString() @MaxLength(500) specification?: string;
  @IsString() @Length(2, 160) inspectionStage!: string;
  @IsEnum(QualityInspectionType) inspectionType!: QualityInspectionType;
  @IsString() @MinLength(3) @MaxLength(10000) acceptanceCriteria!: string;
  @IsString() @Length(2, 200) responsibleParty!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(100) requiredDocuments?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) requiredTests?: string[];
  @IsOptional() @IsEnum(QualityControlPoint) controlPoint?: QualityControlPoint;
  @IsOptional() @IsEnum(QualityItpStatus) status?: QualityItpStatus;
}

export class UpdateItpDto extends PartialType(CreateItpDto) {}

export class ChecklistQuestionDto {
  @IsString() @Length(2, 1000) prompt!: string;
  @IsEnum(QualityAnswerType) answerType!: QualityAnswerType;
  @IsOptional() @IsString() @MaxLength(1000) acceptanceCriteria?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsBoolean() requiredEvidence?: boolean;
  @IsOptional() @IsBoolean() requiredSignature?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(50) options?: string[];
  @IsOptional() @Type(() => Number) @IsNumber() minValue?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxValue?: number;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class CreateChecklistTemplateDto {
  @IsString() @Length(2, 200) name!: string;
  @IsString() @Length(2, 120) category!: string;
  @IsOptional() @IsString() @MaxLength(120) activityTrade?: string;
  @IsOptional() @IsString() @MaxLength(200) standard?: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => ChecklistQuestionDto)
  questions!: ChecklistQuestionDto[];
}

export class CreateInspectionDto {
  @IsString() @Length(2, 80) inspectionNumber!: string;
  @IsOptional() @IsUUID() itpId?: string;
  @IsOptional() @IsUUID() checklistTemplateId?: string;
  @IsOptional() @IsString() @MaxLength(200) siteReference?: string;
  @IsOptional() @IsString() @MaxLength(200) areaReference?: string;
  @IsOptional() @IsUUID() wbsId?: string;
  @IsOptional() @IsUUID() activityId?: string;
  @IsOptional() @IsUUID() boqItemId?: string;
  @IsOptional() @IsString() @MaxLength(200) drawingReference?: string;
  @IsOptional() @IsString() @MaxLength(50) drawingRevision?: string;
  @IsOptional() @IsString() @MaxLength(500) specification?: string;
  @IsDateString() requestedDate!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsUUID() inspectorId?: string;
  @IsOptional() @IsString() @MaxLength(200) consultant?: string;
  @IsOptional() @IsString() @MaxLength(200) client?: string;
  @IsEnum(QualityInspectionType) inspectionType!: QualityInspectionType;
  @IsOptional() @IsEnum(QualityControlPoint) controlPoint?: QualityControlPoint;
  @IsString() @MinLength(3) @MaxLength(10000) description!: string;
  @IsOptional() @IsString() @MaxLength(120) clientMutationId?: string;
}

export class InspectionResponseDto {
  @IsUUID() questionId!: string;
  @IsObject() answer!: Record<string, unknown>;
  @IsOptional() @IsBoolean() compliant?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) comments?: string;
}

export class CompleteInspectionDto {
  @IsEnum(QualityInspectionStatus) status!: QualityInspectionStatus;
  @IsOptional() @IsString() @MaxLength(10000) outcomeComments?: string;
  @IsOptional() @IsInt() @Min(1) syncVersion?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => InspectionResponseDto)
  responses?: InspectionResponseDto[];
}

export class CreateTestDefinitionDto {
  @IsString() @Length(2, 50) code!: string;
  @IsString() @Length(2, 200) name!: string;
  @IsOptional() @IsString() @MaxLength(200) standard?: string;
  @IsString() @Length(1, 160) parameter!: string;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minValue?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxValue?: number;
  @IsString() @Length(2, 1000) acceptanceCriteria!: string;
  @IsOptional() @IsString() @MaxLength(200) samplingFrequency?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) requiredEquipment?: string[];
  @IsOptional() @IsString() @MaxLength(200) requiredLaboratory?: string;
}

export class CreateTestResultDto {
  @IsString() @Length(2, 80) testNumber!: string;
  @IsUUID() definitionId!: string;
  @IsOptional() @IsUUID() activityId?: string;
  @IsOptional() @IsString() @MaxLength(200) siteReference?: string;
  @IsOptional() @IsString() @MaxLength(200) areaReference?: string;
  @IsOptional() @IsString() @MaxLength(200) materialReference?: string;
  @IsOptional() @IsString() @MaxLength(120) batchReference?: string;
  @IsOptional() @IsString() @MaxLength(120) sampleReference?: string;
  @IsDateString() testDate!: string;
  @IsOptional() @IsString() @MaxLength(200) laboratory?: string;
  @IsOptional() @IsString() @MaxLength(200) technician?: string;
  @IsOptional() @Type(() => Number) @IsNumber() numericResult?: number;
  @IsOptional() @IsString() @MaxLength(1000) textResult?: string;
  @IsOptional() @IsString() @MaxLength(10000) remarks?: string;
}

export class OverrideTestResultDto {
  @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
  @IsBoolean() pass!: boolean;
}

export class CreateNcrDto {
  @IsString() @Length(2, 80) ncrNumber!: string;
  @IsOptional() @IsUUID() inspectionId?: string;
  @IsOptional() @IsUUID() testResultId?: string;
  @IsOptional() @IsUUID() wbsId?: string;
  @IsOptional() @IsUUID() activityId?: string;
  @IsOptional() @IsString() @MaxLength(200) siteReference?: string;
  @IsOptional() @IsString() @MaxLength(200) areaReference?: string;
  @IsOptional() @IsString() @MaxLength(200) responsibleParty?: string;
  @IsString() @Length(2, 80) source!: string;
  @IsString() @MinLength(5) @MaxLength(10000) description!: string;
  @IsEnum(QualityNcrSeverity) severity!: QualityNcrSeverity;
  @IsDateString() reportedDate!: string;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(10000) immediateAction?: string;
}

export class UpdateNcrDto {
  @IsOptional() @IsEnum(QualityNcrStatus) status?: QualityNcrStatus;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(80) rootCauseMethod?: string;
  @IsOptional() @IsString() @MaxLength(10000) rootCause?: string;
  @IsOptional() @IsString() @MaxLength(10000) correctiveAction?: string;
  @IsOptional() @IsString() @MaxLength(10000) preventiveAction?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class CreateCorrectiveActionDto {
  @IsString() @Length(2, 80) actionNumber!: string;
  @IsOptional() @IsString() @MaxLength(30) actionType?: string;
  @IsOptional() @IsUUID() responsiblePersonId?: string;
  @IsOptional() @IsString() @MaxLength(200) responsibleCompany?: string;
  @IsString() @MinLength(5) @MaxLength(10000) action!: string;
  @IsDateString() dueDate!: string;
}

export class UpdateCorrectiveActionDto {
  @IsOptional() @IsEnum(QualityActionStatus) status?: QualityActionStatus;
  @IsOptional() @IsDateString() completedDate?: string;
  @IsOptional() @IsString() @MaxLength(10000) verification?: string;
  @IsOptional() @IsString() @MaxLength(10000) effectiveness?: string;
}

export class CreateQualityIssueDto {
  @IsString() @Length(2, 80) issueNumber!: string;
  @IsEnum(QualityIssueType) type!: QualityIssueType;
  @IsOptional() @IsString() @MaxLength(200) siteReference?: string;
  @IsOptional() @IsString() @MaxLength(200) areaReference?: string;
  @IsOptional() @IsString() @MaxLength(300) location?: string;
  @IsOptional() @IsUUID() activityId?: string;
  @IsOptional() @IsString() @MaxLength(120) trade?: string;
  @IsString() @MinLength(3) @MaxLength(10000) description!: string;
  @IsOptional() @IsEnum(QualityNcrSeverity) severity?: QualityNcrSeverity;
  @IsDateString() reportedDate!: string;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateQualityIssueDto {
  @IsOptional() @IsEnum(QualityIssueStatus) status?: QualityIssueStatus;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(10000) resolution?: string;
  @IsOptional() @IsString() @MaxLength(10000) verification?: string;
}

export class CreateReworkDto {
  @IsString() @Length(2, 80) reworkNumber!: string;
  @IsOptional() @IsUUID() activityId?: string;
  @IsOptional() @IsString() @MaxLength(200) areaReference?: string;
  @IsString() @MinLength(3) @MaxLength(10000) cause!: string;
  @IsOptional() @IsString() @MaxLength(200) responsibleParty?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) reworkQuantity?: number;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) laborCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) materialCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) equipmentCost?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subcontractorCost?: number;
}

export class CreateQualitySubmittalDto {
  @IsString() @Length(2, 80) submittalNumber!: string;
  @IsEnum(QualitySubmittalType) type!: QualitySubmittalType;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsUUID() activityId?: string;
  @IsString() @Length(2, 255) title!: string;
  @IsOptional() @IsString() @MaxLength(200) materialReference?: string;
  @IsOptional() @IsString() @MaxLength(200) vendorReference?: string;
  @IsOptional() @IsString() @MaxLength(200) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(160) brand?: string;
  @IsOptional() @IsString() @MaxLength(500) specification?: string;
  @IsOptional() @IsString() @MaxLength(200) contractor?: string;
  @IsOptional() @IsString() @MaxLength(200) subcontractorReference?: string;
  @IsOptional() @IsString() @MaxLength(20000) method?: string;
  @IsOptional() @IsString() @MaxLength(20000) sequence?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) resources?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) equipment?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) materials?: string[];
  @IsOptional() @IsString() @MaxLength(10000) safetyRequirements?: string;
  @IsOptional() @IsString() @MaxLength(10000) qualityRequirements?: string;
  @IsOptional() @IsString() @MaxLength(10000) inspectionRequirements?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) references?: string[];
}

export class UpdateQualitySubmittalDto {
  @IsEnum(QualitySubmittalStatus) status!: QualitySubmittalStatus;
  @IsOptional() @IsString() @MaxLength(10000) reviewComments?: string;
}

export class CreateQualitySampleDto {
  @IsString() @Length(2, 80) sampleNumber!: string;
  @IsString() @Length(2, 200) materialReference!: string;
  @IsOptional() @IsString() @MaxLength(120) batchReference?: string;
  @IsOptional() @IsString() @MaxLength(200) supplierReference?: string;
  @IsOptional() @IsString() @MaxLength(300) location?: string;
  @IsDateString() collectedDate!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsString() @Length(2, 300) testRequired!: string;
  @IsOptional() @IsString() @MaxLength(200) storageLocation?: string;
  @IsOptional() @IsEnum(QualitySampleStatus) status?: QualitySampleStatus;
}

export class LinkQualityEvidenceDto {
  @IsUUID() documentId!: string;
  @IsOptional() @IsUUID() inspectionId?: string;
  @IsOptional() @IsUUID() testResultId?: string;
  @IsOptional() @IsUUID() ncrId?: string;
  @IsOptional() @IsUUID() actionId?: string;
  @IsOptional() @IsUUID() issueId?: string;
  @IsOptional() @IsUUID() submittalId?: string;
  @IsString() @Length(2, 40) evidenceType!: string;
  @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @IsOptional() @IsDateString() capturedAt?: string;
  @IsOptional() @IsObject() annotationData?: Record<string, unknown>;
}
