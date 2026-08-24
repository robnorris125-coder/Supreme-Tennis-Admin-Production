ALTER TABLE `tenant_memberships` ADD `display_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_memberships` ADD `last_signed_in_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `tenant_memberships` SET `display_name` = 'Rob Norris', `role` = 'Owner' WHERE lower(`user_email`) = 'robnorris125@gmail.com';--> statement-breakpoint
INSERT INTO `tenant_memberships` (`tenant_id`, `user_email`, `display_name`, `role`, `status`, `last_signed_in_at`, `created_at`)
SELECT `tenant_id`, 'info@supremetennis.co.uk', 'Jake Norris', 'Administrator', 'Active', '', '2026-08-21T00:00:00.000Z'
FROM `tenant_memberships`
WHERE lower(`user_email`) = 'robnorris125@gmail.com'
ON CONFLICT(`tenant_id`, `user_email`) DO UPDATE SET
  `display_name` = 'Jake Norris',
  `role` = 'Administrator',
  `status` = 'Active';
