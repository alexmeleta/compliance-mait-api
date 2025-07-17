-- Table: public.UserFiles

-- DROP TABLE IF EXISTS public."UserFiles";

CREATE TABLE IF NOT EXISTS public."UserFiles"
(
    "ID" SERIAL NOT NULL,
    "UserID" integer NOT NULL,
    "FileID" integer NOT NULL,
    "IsDeleted" boolean NOT NULL DEFAULT false,
    CONSTRAINT "UserFiles_pkey" PRIMARY KEY ("ID")
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."UserFiles"
    OWNER to postgres;