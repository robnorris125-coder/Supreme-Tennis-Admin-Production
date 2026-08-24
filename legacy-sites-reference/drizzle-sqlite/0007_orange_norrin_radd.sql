CREATE TABLE `communication_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`campaign_id` text DEFAULT '' NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`player_id` text DEFAULT '' NOT NULL,
	`programme_id` text DEFAULT '' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`recipient` text NOT NULL,
	`intended_recipient` text NOT NULL,
	`subject` text NOT NULL,
	`message_type` text NOT NULL,
	`related_invoice_id` integer,
	`attachment_name` text DEFAULT '' NOT NULL,
	`sending_account` text NOT NULL,
	`delivery_mode` text NOT NULL,
	`send_status` text NOT NULL,
	`provider_message_id` text DEFAULT '' NOT NULL,
	`failure_reason` text DEFAULT '' NOT NULL,
	`sent_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `communication_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`operational_email_eligible` integer DEFAULT true NOT NULL,
	`marketing_email_opt_in` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communication_preference_idx` ON `communication_preferences` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `email_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`provider` text NOT NULL,
	`connected_email` text DEFAULT '' NOT NULL,
	`encrypted_access_token` text DEFAULT '' NOT NULL,
	`encrypted_refresh_token` text DEFAULT '' NOT NULL,
	`token_expires_at` text DEFAULT '' NOT NULL,
	`connection_status` text DEFAULT 'Not connected' NOT NULL,
	`scopes` text DEFAULT '' NOT NULL,
	`oauth_state` text DEFAULT '' NOT NULL,
	`connected_at` text DEFAULT '' NOT NULL,
	`last_successful_use` text DEFAULT '' NOT NULL,
	`last_failure_category` text DEFAULT '' NOT NULL,
	`active_for_sending` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_connection_tenant_provider_idx` ON `email_connections` (`tenant_id`,`provider`);--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`message_type` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_template_name_idx` ON `email_templates` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `tenant_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`user_email` text NOT NULL,
	`role` text DEFAULT 'Owner' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_membership_idx` ON `tenant_memberships` (`tenant_id`,`user_email`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);