CREATE TYPE "public"."business_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "status" "business_status" DEFAULT 'active' NOT NULL;