ALTER TABLE `events` MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'published';--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `start_date`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `end_date`;