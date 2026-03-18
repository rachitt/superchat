CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) DEFAULT 'generic' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webhooks_token_idx" ON "webhooks" USING btree ("token");--> statement-breakpoint
CREATE INDEX "webhooks_channel_idx" ON "webhooks" USING btree ("channel_id");