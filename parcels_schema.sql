-- Parcels Schema for Kolifast Delivery System
-- This schema supports sending and receiving parcels with multiple addresses

-- Table 1: Parcels
-- Main parcel/delivery records
CREATE TABLE IF NOT EXISTS parcels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tracking_number TEXT UNIQUE NOT NULL,

  -- Parcel type: 'send' or 'receive'
  type TEXT NOT NULL CHECK (type IN ('send', 'receive')),

  -- Parcel characteristics
  parcel_type TEXT NOT NULL CHECK (parcel_type IN ('light', 'medium', 'ultra_heavy')),
  weight DECIMAL(10,2), -- in kg
  description TEXT NOT NULL,
  parcel_count INTEGER NOT NULL DEFAULT 1,

  -- Delivery options
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('grouped', 'express')),
  waiting_hours INTEGER, -- For grouped delivery (2-24 hours)

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Just created, awaiting confirmation
    'confirmed',    -- Confirmed by system
    'picked_up',    -- Driver picked up the parcel
    'in_transit',   -- On the way to destination
    'delivered',    -- Successfully delivered
    'cancelled'     -- Cancelled by user or system
  )),

  -- Pricing
  estimated_cost DECIMAL(12,2), -- Estimated cost before confirmation
  final_cost DECIMAL(12,2),     -- Final cost after delivery
  savings_amount DECIMAL(12,2), -- Amount saved with grouped delivery
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,

  -- Driver assignment (null until assigned)
  driver_id TEXT REFERENCES users(id),
  assigned_at TIMESTAMPTZ,

  -- Delivery tracking
  pickup_completed_at TIMESTAMPTZ,
  delivery_started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: Parcel Addresses
-- Multiple pickup/delivery addresses for each parcel
CREATE TABLE IF NOT EXISTS parcel_addresses (
  id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,

  -- Address type: 'pickup' or 'delivery'
  type TEXT NOT NULL CHECK (type IN ('pickup', 'delivery')),

  -- Address details
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Contact information
  contact_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,

  -- Delivery status for this address
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Order for multiple addresses (1, 2, 3...)
  order_index INTEGER NOT NULL DEFAULT 1,

  -- Notes from driver or user
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: Parcel Timeline
-- History of status changes for tracking
CREATE TABLE IF NOT EXISTS parcel_timeline (
  id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,

  -- Status at this point in time
  status TEXT NOT NULL,

  -- Description/note for this timeline entry
  description TEXT,

  -- Location when status changed
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Who triggered this status change
  triggered_by TEXT REFERENCES users(id), -- user_id of driver or system

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parcels_user_id ON parcels(user_id);
CREATE INDEX IF NOT EXISTS idx_parcels_tracking_number ON parcels(tracking_number);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_driver_id ON parcels(driver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_type ON parcels(type);
CREATE INDEX IF NOT EXISTS idx_parcels_created_at ON parcels(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parcel_addresses_parcel_id ON parcel_addresses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_addresses_type ON parcel_addresses(type);

CREATE INDEX IF NOT EXISTS idx_parcel_timeline_parcel_id ON parcel_timeline(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_timeline_created_at ON parcel_timeline(created_at DESC);

-- Function to generate tracking number
-- Format: KOL-YYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  sequence_part TEXT;
  tracking_num TEXT;
  exists_count INTEGER;
BEGIN
  -- Get date part (YYMMDD)
  date_part := TO_CHAR(NOW(), 'YYMMDD');

  -- Get count of parcels created today
  SELECT COUNT(*) INTO exists_count
  FROM parcels
  WHERE tracking_number LIKE 'KOL-' || date_part || '-%';

  -- Generate sequence part (4 digits, padded with zeros)
  sequence_part := LPAD((exists_count + 1)::TEXT, 4, '0');

  -- Combine to create tracking number
  tracking_num := 'KOL-' || date_part || '-' || sequence_part;

  RETURN tracking_num;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically add timeline entry on parcel status change
CREATE OR REPLACE FUNCTION add_parcel_timeline_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add timeline if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO parcel_timeline (id, parcel_id, status, description, created_at)
    VALUES (
      gen_random_uuid()::TEXT,
      NEW.id,
      NEW.status,
      CASE NEW.status
        WHEN 'pending' THEN 'Colis créé, en attente de confirmation'
        WHEN 'confirmed' THEN 'Colis confirmé, en attente d''affectation'
        WHEN 'picked_up' THEN 'Colis récupéré par le livreur'
        WHEN 'in_transit' THEN 'Colis en cours de livraison'
        WHEN 'delivered' THEN 'Colis livré avec succès'
        WHEN 'cancelled' THEN 'Colis annulé'
        ELSE 'Statut mis à jour'
      END,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically add timeline entry
CREATE TRIGGER trigger_add_parcel_timeline
  AFTER INSERT OR UPDATE OF status ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION add_parcel_timeline_on_status_change();

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_parcels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update 'updated_at'
CREATE TRIGGER trigger_update_parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION update_parcels_updated_at();

-- Comments for documentation
COMMENT ON TABLE parcels IS 'Main table for all parcel deliveries (send and receive)';
COMMENT ON TABLE parcel_addresses IS 'Multiple pickup/delivery addresses for each parcel';
COMMENT ON TABLE parcel_timeline IS 'History of status changes for tracking purposes';

COMMENT ON COLUMN parcels.type IS 'send = user sends parcel, receive = user receives parcel';
COMMENT ON COLUMN parcels.parcel_type IS 'light (0-5kg), medium (5-15kg), ultra_heavy (15kg+)';
COMMENT ON COLUMN parcels.delivery_type IS 'grouped = economical with wait time, express = fast delivery';
COMMENT ON COLUMN parcels.waiting_hours IS 'Hours to wait before delivery for grouped (2-24), null for express';
COMMENT ON COLUMN parcels.savings_amount IS 'Amount saved by choosing grouped instead of express';
