ALTER TABLE `programmes` ADD `type` text DEFAULT 'Junior course' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `qualifications` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `safeguarding` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `employment_status` text DEFAULT 'Contractor' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `pay_rate_pence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `notes` text DEFAULT '' NOT NULL;