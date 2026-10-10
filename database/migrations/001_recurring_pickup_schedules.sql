CREATE TABLE IF NOT EXISTS recurring_pickup_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  location_id INT NOT NULL,
  waste_category_id INT NOT NULL,
  frequency ENUM('weekly', 'biweekly') NOT NULL,
  preferred_day TINYINT UNSIGNED NOT NULL,
  preferred_time TIME NOT NULL,
  start_date DATE NOT NULL,
  next_pickup_date DATE NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_recurring_schedule_preferred_day CHECK (preferred_day BETWEEN 1 AND 7),
  CONSTRAINT fk_recurring_schedule_customer FOREIGN KEY (customer_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recurring_schedule_location FOREIGN KEY (location_id)
    REFERENCES customer_locations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_recurring_schedule_category FOREIGN KEY (waste_category_id)
    REFERENCES waste_categories(id) ON DELETE RESTRICT,
  INDEX idx_recurring_schedule_owner (customer_id, status),
  INDEX idx_recurring_schedule_due (status, next_pickup_date, preferred_time)
);

CREATE TABLE IF NOT EXISTS recurring_pickup_occurrences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  occurrence_date DATE NOT NULL,
  pickup_request_id INT NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_recurring_occurrence UNIQUE (schedule_id, occurrence_date),
  CONSTRAINT uq_recurring_occurrence_pickup UNIQUE (pickup_request_id),
  CONSTRAINT fk_recurring_occurrence_schedule FOREIGN KEY (schedule_id)
    REFERENCES recurring_pickup_schedules(id) ON DELETE RESTRICT,
  CONSTRAINT fk_recurring_occurrence_pickup FOREIGN KEY (pickup_request_id)
    REFERENCES pickup_requests(id) ON DELETE RESTRICT
);
