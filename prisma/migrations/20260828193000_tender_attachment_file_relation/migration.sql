-- Correct TenderAttachment's FileObject relation to use the existing fileId.
-- The service already validates tenant ownership before attachment.
ALTER TABLE "tender_attachments"
ADD CONSTRAINT "tender_attachments_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "file_objects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
