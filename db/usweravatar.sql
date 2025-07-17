-- Table: public.UserAvatars

-- DROP TABLE IF EXISTS public."UserAvatars";

CREATE TABLE IF NOT EXISTS public."UserAvatars"
(
    "ID" SERIAL NOT NULL,
    "GUID" uuid NOT NULL DEFAULT gen_random_uuid(),
    "UserID" integer,
    "Content" bytea,
    "CreatedOn" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "MimeType" character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT "UserAvatars_pkey" PRIMARY KEY ("ID"),
    CONSTRAINT "UserAvatars_GUID_key" UNIQUE ("GUID"),
    CONSTRAINT "UserAvatars_OwnerID_fkey" FOREIGN KEY ("UserID")
        REFERENCES public."Users" ("ID") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."UserAvatars"
    OWNER to postgres;