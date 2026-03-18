CREATE TABLE "scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"job_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;