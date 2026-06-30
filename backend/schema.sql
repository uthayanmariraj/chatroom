-- Table structure for table `users`
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `rooms`
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
  `room_name` VARCHAR(255) NOT NULL,
  `admin_name` VARCHAR(255) NOT NULL,
  `privacy` VARCHAR(10) NOT NULL DEFAULT 'PUB',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`admin_name`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `room_members`
CREATE TABLE IF NOT EXISTS `room_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` BINARY(16) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_membership` (`room_id`, `username`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `room_invites`
CREATE TABLE IF NOT EXISTS `room_invites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` BINARY(16) NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `created_by` VARCHAR(255) NOT NULL,
  `max_uses` INT DEFAULT NULL,
  `uses` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
