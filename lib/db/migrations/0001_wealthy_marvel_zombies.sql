ALTER TABLE "chat" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chat" CASCADE;--> statement-breakpoint
ALTER TABLE "message" DROP CONSTRAINT "message_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "chatId";--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "accessedAt";