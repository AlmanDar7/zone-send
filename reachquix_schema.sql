-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: reachquix
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `brand_themes`
--

DROP TABLE IF EXISTS `brand_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `brand_themes` (
  `id` varchar(191) NOT NULL,
  `background_color` varchar(191) NOT NULL,
  `body_font` varchar(191) NOT NULL,
  `brand_name` varchar(191) NOT NULL,
  `button_style` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`button_style`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `footer_style` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`footer_style`)),
  `heading_font` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `primary_color` varchar(191) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_steps`
--

DROP TABLE IF EXISTS `campaign_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_steps` (
  `id` varchar(191) NOT NULL,
  `ab_test_enabled` tinyint(1) DEFAULT NULL,
  `body_a` varchar(191) DEFAULT NULL,
  `body_b` varchar(191) DEFAULT NULL,
  `campaign_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `delay_days` int(11) NOT NULL DEFAULT 0,
  `delay_unit` varchar(191) NOT NULL,
  `delay_value` int(11) NOT NULL DEFAULT 0,
  `step_number` int(11) NOT NULL,
  `subject_a` varchar(191) DEFAULT NULL,
  `subject_b` varchar(191) DEFAULT NULL,
  `template_id` varchar(191) DEFAULT NULL,
  `winning_variant` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_steps_campaign_id_fkey` (`campaign_id`),
  KEY `campaign_steps_template_id_fkey` (`template_id`),
  CONSTRAINT `campaign_steps_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `campaign_steps_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `email_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaigns` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `daily_limit` int(11) NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'draft',
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contact_folder_members`
--

DROP TABLE IF EXISTS `contact_folder_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_folder_members` (
  `id` varchar(191) NOT NULL,
  `contact_id` varchar(191) NOT NULL,
  `folder_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `contact_folder_members_contact_id_fkey` (`contact_id`),
  KEY `contact_folder_members_folder_id_fkey` (`folder_id`),
  CONSTRAINT `contact_folder_members_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `contact_folder_members_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `contact_folders` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contact_folders`
--

DROP TABLE IF EXISTS `contact_folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_folders` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `name` varchar(191) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contact_tags`
--

DROP TABLE IF EXISTS `contact_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_tags` (
  `contact_id` varchar(191) NOT NULL,
  `tag_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`contact_id`,`tag_id`),
  KEY `contact_tags_tag_id_fkey` (`tag_id`),
  CONSTRAINT `contact_tags_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `contact_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contacts` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `email` varchar(191) NOT NULL,
  `first_name` varchar(191) DEFAULT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `campaign_id` varchar(191) DEFAULT NULL,
  `company_name` varchar(191) DEFAULT NULL,
  `name` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_events`
--

DROP TABLE IF EXISTS `email_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_events` (
  `id` varchar(191) NOT NULL,
  `campaign_id` varchar(191) DEFAULT NULL,
  `contact_id` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `email_queue_id` varchar(191) DEFAULT NULL,
  `event_type` varchar(191) NOT NULL,
  `ip_address` varchar(191) DEFAULT NULL,
  `link_url` text DEFAULT NULL,
  `user_agent` varchar(191) DEFAULT NULL,
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `email_events_campaign_id_fkey` (`campaign_id`),
  KEY `email_events_contact_id_fkey` (`contact_id`),
  KEY `email_events_email_queue_id_fkey` (`email_queue_id`),
  CONSTRAINT `email_events_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `email_events_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `email_events_email_queue_id_fkey` FOREIGN KEY (`email_queue_id`) REFERENCES `email_queue` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_queue`
--

DROP TABLE IF EXISTS `email_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_queue` (
  `id` varchar(191) NOT NULL,
  `campaign_id` varchar(191) NOT NULL,
  `click_count` int(11) NOT NULL DEFAULT 0,
  `contact_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `error_message` text DEFAULT NULL,
  `open_count` int(11) NOT NULL DEFAULT 0,
  `scheduled_at` datetime(3) NOT NULL,
  `sent_at` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL,
  `step_number` int(11) NOT NULL DEFAULT 1,
  `user_id` varchar(191) NOT NULL,
  `variant` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_queue_campaign_id_fkey` (`campaign_id`),
  KEY `email_queue_contact_id_fkey` (`contact_id`),
  CONSTRAINT `email_queue_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `email_queue_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_templates` (
  `id` varchar(191) NOT NULL,
  `blocks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`blocks`)),
  `body` text NOT NULL,
  `category` varchar(191) NOT NULL DEFAULT 'email',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `design_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`design_config`)),
  `html_body` text DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `template_format` varchar(191) NOT NULL DEFAULT 'visual',
  `thumbnail_url` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'Initial',
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `google_sheet_settings`
--

DROP TABLE IF EXISTS `google_sheet_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `google_sheet_settings` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `credentials_json` text NOT NULL,
  `sheet_url` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `google_sheet_settings_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profiles` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `avatar_url` varchar(191) DEFAULT NULL,
  `full_name` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profiles_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sending_limits`
--

DROP TABLE IF EXISTS `sending_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sending_limits` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `last_reset_date` varchar(191) NOT NULL,
  `max_per_day` int(11) NOT NULL,
  `sent_today` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sending_limits_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `smtp_settings`
--

DROP TABLE IF EXISTS `smtp_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `smtp_settings` (
  `id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `from_email` varchar(191) DEFAULT NULL,
  `from_name` varchar(191) DEFAULT NULL,
  `host` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `port` int(11) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `use_ssl` tinyint(1) NOT NULL DEFAULT 1,
  `user_id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `smtp_settings_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `template_sections`
--

DROP TABLE IF EXISTS `template_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `template_sections` (
  `id` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL DEFAULT 'custom',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `name` varchar(191) NOT NULL,
  `blocks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`blocks`)),
  `user_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-29  4:24:22
