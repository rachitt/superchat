CREATE TABLE "channel_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"persona" varchar(50),
	"custom_prompt" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_prompts_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
ALTER TABLE "channel_prompts" ADD CONSTRAINT "channel_prompts_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;