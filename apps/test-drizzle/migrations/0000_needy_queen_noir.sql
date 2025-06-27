-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION
-- This migration contains potentially destructive operations.
-- It is STRONGLY recommended to create a full database backup before proceeding.
-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION
-- This migration contains potentially destructive operations.
-- It is STRONGLY recommended to create a full database backup before proceeding.
-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- Flow Enhancement: Transaction Wrapper
-- Wraps migration in transaction for safety and rollback capability
BEGIN;

CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`user_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

COMMIT;

-- If any statement fails, the entire transaction will be rolled back automatically