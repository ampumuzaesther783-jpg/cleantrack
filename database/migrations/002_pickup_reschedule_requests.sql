CREATE TABLE IF NOT EXISTS pickup_reschedule_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pickup_request_id INT NOT NULL,
  customer_id INT NOT NULL,
  company_id INT NOT NULL,
  requested_for DATETIME NOT NULL,
  customer_reason TEXT,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  manager_response TEXT,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reschedule_pickup FOREIGN KEY (pickup_request_id)
    REFERENCES pickup_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_reschedule_customer FOREIGN KEY (customer_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reschedule_company FOREIGN KEY (company_id)
    REFERENCES waste_companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reschedule_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reschedule_customer (customer_id, created_at),
  INDEX idx_reschedule_company_status (company_id, status, created_at),
  INDEX idx_reschedule_pickup_status (pickup_request_id, status)
);
