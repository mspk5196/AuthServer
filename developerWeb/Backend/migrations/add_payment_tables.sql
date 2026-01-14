-- Payment Orders Table
CREATE TABLE IF NOT EXISTS dev_payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(255) UNIQUE NOT NULL,
  payment_id VARCHAR(255),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES dev_plans(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'created',
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_orders_developer ON dev_payment_orders(developer_id);
CREATE INDEX idx_payment_orders_status ON dev_payment_orders(status);
CREATE INDEX idx_payment_orders_order_id ON dev_payment_orders(order_id);
CREATE INDEX idx_payment_orders_payment_id ON dev_payment_orders(payment_id);

-- Comments
COMMENT ON TABLE dev_payment_orders IS 'Stores Razorpay payment orders for plan purchases';
COMMENT ON COLUMN dev_payment_orders.order_id IS 'Razorpay order ID';
COMMENT ON COLUMN dev_payment_orders.payment_id IS 'Razorpay payment ID after successful payment';
COMMENT ON COLUMN dev_payment_orders.status IS 'Payment status: created, paid, failed';
COMMENT ON COLUMN dev_payment_orders.payment_method IS 'Payment method used: upi, card, netbanking, etc.';
