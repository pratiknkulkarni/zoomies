CREATE TABLE `exercise_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`display_order` integer NOT NULL,
	`target_sets` integer,
	`target_metric_id` text,
	`target_value` real,
	`notes` text,
	`is_ad_hoc` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_metric_id`) REFERENCES `exercise_metrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercise_entries_session_id_idx` ON `exercise_entries` (`session_id`);--> statement-breakpoint
CREATE INDEX `exercise_entries_exercise_id_idx` ON `exercise_entries` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`unit` text,
	`display_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_metrics_exercise_id_idx` ON `exercise_metrics` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`family` text,
	`notes` text,
	`is_builtin` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`suggestion_dismissed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `exercises_family_idx` ON `exercises` (`family`);--> statement-breakpoint
CREATE INDEX `exercises_is_active_idx` ON `exercises` (`is_active`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text,
	`name` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`paused_at` integer,
	`accumulated_pause_ms` integer DEFAULT 0 NOT NULL,
	`is_quick_log` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_started_at_idx` ON `sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `sessions_completed_at_idx` ON `sessions` (`completed_at`);--> statement-breakpoint
CREATE INDEX `sessions_template_id_idx` ON `sessions` (`template_id`);--> statement-breakpoint
CREATE TABLE `set_metric_values` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`exercise_metric_id` text NOT NULL,
	`value_num` real,
	`value_text` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`set_id`) REFERENCES `sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_metric_id`) REFERENCES `exercise_metrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `set_metric_values_set_id_idx` ON `set_metric_values` (`set_id`);--> statement-breakpoint
CREATE INDEX `set_metric_values_exercise_metric_id_idx` ON `set_metric_values` (`exercise_metric_id`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_entry_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`to_failure` integer DEFAULT false NOT NULL,
	`performed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`exercise_entry_id`) REFERENCES `exercise_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sets_exercise_entry_id_idx` ON `sets` (`exercise_entry_id`);--> statement-breakpoint
CREATE TABLE `template_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`display_order` integer NOT NULL,
	`target_sets` integer,
	`target_metric_id` text,
	`target_value` real,
	`rest_seconds` integer DEFAULT 60,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_metric_id`) REFERENCES `exercise_metrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `template_slots_template_id_idx` ON `template_slots` (`template_id`);--> statement-breakpoint
CREATE INDEX `template_slots_exercise_id_idx` ON `template_slots` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
