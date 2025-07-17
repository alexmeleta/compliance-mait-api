CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Create Invites table
CREATE TABLE "Invites" (
    "ID" SERIAL PRIMARY KEY,
    "Guid" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    "Email" VARCHAR(255) NOT NULL,
    "SenderId" INTEGER NOT NULL,
    "SendOn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX "Invites_guid_idx" ON "Invites" ("Guid");
CREATE INDEX "Invites_email_idx" ON "Invites" ("Email");
CREATE INDEX "Invites_senderId_idx" ON "Invites" ("SenderId");

-- Add comment for the table
COMMENT ON TABLE "Invites" IS 'Stores user invitation records';

-- Add comments for columns
COMMENT ON COLUMN "Invites"."ID" IS 'Primary key';
COMMENT ON COLUMN "Invites"."Guid" IS 'Globally unique identifier';
COMMENT ON COLUMN "Invites"."Email" IS 'Email address of the invitee';
COMMENT ON COLUMN "Invites"."SenderId" IS 'ID of the user who sent the invite';
COMMENT ON COLUMN "Invites"."SendOn" IS 'When the invite was sent';
COMMENT ON COLUMN "Invites"."IsActive" IS 'Whether the invite is active';
COMMENT ON COLUMN "Invites"."IsDeleted" IS 'Soft delete flag';
COMMENT ON COLUMN "Invites"."CreatedAt" IS 'When the record was created';
COMMENT ON COLUMN "Invites"."UpdatedAt" IS 'When the record was last updated';