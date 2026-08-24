CREATE TABLE `rollover_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rollover_id` integer NOT NULL,
	`enrolment_id` integer NOT NULL,
	`customer_id` text NOT NULL,
	`current_programme_id` text NOT NULL,
	`next_programme_id` text NOT NULL,
	`continuation_status` text DEFAULT 'Awaiting Confirmation' NOT NULL,
	`progression_status` text DEFAULT 'Not Required' NOT NULL,
	`progression_reason` text DEFAULT '' NOT NULL,
	`age_at_next_term_months` integer,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rollover_enrolment_idx` ON `rollover_decisions` (`rollover_id`,`enrolment_id`);--> statement-breakpoint
CREATE TABLE `term_rollovers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`current_term_id` text NOT NULL,
	`next_term_id` text NOT NULL,
	`status` text DEFAULT 'Prepared' NOT NULL,
	`prepared_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `term_rollover_pair_idx` ON `term_rollovers` (`current_term_id`,`next_term_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD `date_of_birth` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `trial_sessions_allowed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `trial_sessions_completed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `trial_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `next_trial_session` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `programmes` ADD `min_age_years` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `programmes` ADD `max_age_years` integer DEFAULT 99 NOT NULL;--> statement-breakpoint
ALTER TABLE `programmes` ADD `suggested_next_programme_id` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `programmes` SET `min_age_years` = 4, `max_age_years` = 7, `suggested_next_programme_id` = 'orange-green' WHERE `id` = 'mini-red';
--> statement-breakpoint
UPDATE `programmes` SET `min_age_years` = 7, `max_age_years` = 10, `suggested_next_programme_id` = 'junior-development' WHERE `id` = 'orange-green';
--> statement-breakpoint
UPDATE `programmes` SET `min_age_years` = 10, `max_age_years` = 14, `suggested_next_programme_id` = 'performance' WHERE `id` = 'junior-development';
--> statement-breakpoint
UPDATE `programmes` SET `min_age_years` = 12, `max_age_years` = 18 WHERE `id` = 'performance';
--> statement-breakpoint
UPDATE `customers` SET `date_of_birth` = '2018-11-15' WHERE `id` = 'ST-1048' AND `date_of_birth` = '';
--> statement-breakpoint
UPDATE `customers` SET `date_of_birth` = '2020-02-01' WHERE `id` = 'ST-1057' AND `date_of_birth` = '';
--> statement-breakpoint
UPDATE `enrolments` SET `status` = 'Trial', `trial_sessions_allowed` = 2, `trial_sessions_completed` = 1, `trial_status` = 'In Progress', `next_trial_session` = '2026-09-14' WHERE `customer_id` = 'ST-1057' AND `term_id` = 'autumn-2026';
