-- =====================================================
-- MODÈLES DE BASE DE DONNÉES - PHASE MVP
-- =====================================================

-- Table des utilisateurs (interface unique)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image_url VARCHAR(500),
    date_of_birth DATE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    
    -- Préférences utilisateur
    preferred_language VARCHAR(10) DEFAULT 'fr',
    notification_preferences JSONB DEFAULT '{"push": true, "sms": true, "email": false}',
    
    -- Géolocalisation par défaut
    default_address TEXT,
    default_latitude DECIMAL(10,8),
    default_longitude DECIMAL(11,8),
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des livreurs (extension du profil utilisateur)
CREATE TABLE delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- KYC et vérification
    id_card_number VARCHAR(50),
    id_card_image_url VARCHAR(500),
    selfie_with_id_url VARCHAR(500),
    address_proof_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    
    -- Capacité et équipement
    vehicle_type VARCHAR(50), -- moto, vélo, voiture, à_pied
    max_weight_kg DECIMAL(5,2) DEFAULT 10.00,
    max_volume_liters DECIMAL(5,2) DEFAULT 50.00,
    has_cooling_box BOOLEAN DEFAULT FALSE,
    
    -- Système de garantie
    security_deposit_amount DECIMAL(10,2) DEFAULT 0.00,
    security_deposit_status VARCHAR(20) DEFAULT 'none', -- none, pending, active, withdrawn
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    
    -- Score et réputation
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    reliability_score INTEGER DEFAULT 100, -- Score d'équité (0-100)
    
    -- Quota et limitation
    daily_deliveries_count INTEGER DEFAULT 0,
    weekly_deliveries_count INTEGER DEFAULT 0,
    monthly_deliveries_count INTEGER DEFAULT 0,
    last_delivery_date DATE,
    
    -- Statut opérationnel
    is_online BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    current_location_lat DECIMAL(10,8),
    current_location_lng DECIMAL(11,8),
    last_location_update TIMESTAMP,
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, banned
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des demandes de livraison
CREATE TABLE delivery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id),
    
    -- Adresses
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10,8) NOT NULL,
    pickup_longitude DECIMAL(11,8) NOT NULL,
    pickup_contact_name VARCHAR(100),
    pickup_contact_phone VARCHAR(20),
    pickup_instructions TEXT,
    
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10,8) NOT NULL,
    delivery_longitude DECIMAL(11,8) NOT NULL,
    delivery_contact_name VARCHAR(100),
    delivery_contact_phone VARCHAR(20),
    delivery_instructions TEXT,
    
    -- Détails du colis/commande
    item_type VARCHAR(50) NOT NULL, -- repas, colis, courses, médicaments
    item_description TEXT,
    estimated_weight_kg DECIMAL(5,2),
    estimated_volume_liters DECIMAL(5,2),
    requires_cooling BOOLEAN DEFAULT FALSE,
    fragile BOOLEAN DEFAULT FALSE,
    
    -- Timing et priorité
    delivery_priority VARCHAR(20) DEFAULT 'grouped', -- express, grouped
    requested_pickup_time TIMESTAMP,
    requested_delivery_time TIMESTAMP NOT NULL,
    max_delivery_time TIMESTAMP, -- heure limite absolue
    
    -- Tarification
    base_price DECIMAL(8,2) NOT NULL,
    distance_km DECIMAL(6,2),
    estimated_duration_minutes INTEGER,
    
    -- Paiement
    payment_method VARCHAR(30) NOT NULL, -- cash, mobile_money, card
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    commission_amount DECIMAL(8,2),
    
    -- Statut
    status VARCHAR(30) DEFAULT 'pending', 
    -- pending, grouped, assigned, pickup_in_progress, in_transit, delivered, cancelled, failed
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des regroupements de livraisons
CREATE TABLE delivery_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Attribution
    assigned_driver_id UUID REFERENCES delivery_drivers(id),
    assignment_method VARCHAR(20), -- cascade, broadcast
    
    -- Optimisation du trajet
    total_distance_km DECIMAL(8,2),
    estimated_duration_minutes INTEGER,
    optimized_route JSONB, -- Séquence des arrêts avec coordonnées
    
    -- Timing
    planned_start_time TIMESTAMP,
    actual_start_time TIMESTAMP,
    planned_completion_time TIMESTAMP,
    actual_completion_time TIMESTAMP,
    
    -- Financier
    total_amount DECIMAL(10,2),
    total_commission DECIMAL(10,2),
    driver_earnings DECIMAL(10,2),
    
    -- Statut
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, assigned, in_progress, completed, cancelled
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison entre demandes et groupes
CREATE TABLE delivery_group_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES delivery_groups(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
    
    -- Ordre dans la tournée
    sequence_order INTEGER NOT NULL,
    
    -- Statut spécifique de cet item
    pickup_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    pickup_time TIMESTAMP,
    delivery_time TIMESTAMP,
    
    -- Preuves de livraison
    pickup_proof_url VARCHAR(500),
    delivery_proof_url VARCHAR(500),
    recipient_signature_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des transactions financières
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Références
    request_id UUID REFERENCES delivery_requests(id),
    group_id UUID REFERENCES delivery_groups(id),
    driver_id UUID REFERENCES delivery_drivers(id),
    user_id UUID REFERENCES users(id),
    
    -- Détails transaction
    transaction_type VARCHAR(30) NOT NULL, 
    -- payment, commission, driver_earning, security_deposit, withdrawal
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'XOF',
    
    -- Méthode de paiement
    payment_method VARCHAR(30), -- cash, mobile_money, card
    payment_provider VARCHAR(50), -- orange_money, mtn_money, moov_money, stripe
    external_transaction_id VARCHAR(100),
    
    -- Statut
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Métadonnées
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des évaluations
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Références
    request_id UUID NOT NULL REFERENCES delivery_requests(id),
    rater_id UUID NOT NULL REFERENCES users(id),
    rated_driver_id UUID NOT NULL REFERENCES delivery_drivers(id),
    
    -- Évaluation
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- Critères spécifiques
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Contenu
    type VARCHAR(50) NOT NULL, -- delivery_assigned, pickup_ready, delivered, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Métadonnées
    related_entity_type VARCHAR(50), -- delivery_request, delivery_group
    related_entity_id UUID,
    
    -- Statut
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tokens d'authentification
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    token_type VARCHAR(20) NOT NULL, -- otp, reset_password, email_verification
    token_value VARCHAR(10) NOT NULL,
    
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour les requêtes fréquentes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_drivers_user_id ON delivery_drivers(user_id);
CREATE INDEX idx_drivers_status ON delivery_drivers(status);
CREATE INDEX idx_drivers_location ON delivery_drivers(current_location_lat, current_location_lng);
CREATE INDEX idx_drivers_online ON delivery_drivers(is_online, is_available);

CREATE INDEX idx_requests_requester ON delivery_requests(requester_id);
CREATE INDEX idx_requests_status ON delivery_requests(status);
CREATE INDEX idx_requests_item_type ON delivery_requests(item_type);
CREATE INDEX idx_requests_delivery_time ON delivery_requests(requested_delivery_time);
CREATE INDEX idx_requests_location_pickup ON delivery_requests(pickup_latitude, pickup_longitude);
CREATE INDEX idx_requests_location_delivery ON delivery_requests(delivery_latitude, delivery_longitude);

CREATE INDEX idx_groups_driver ON delivery_groups(assigned_driver_id);
CREATE INDEX idx_groups_status ON delivery_groups(status);
CREATE INDEX idx_groups_start_time ON delivery_groups(planned_start_time);

CREATE INDEX idx_group_items_group ON delivery_group_items(group_id);
CREATE INDEX idx_group_items_request ON delivery_group_items(request_id);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_driver ON transactions(driver_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer la distance entre deux points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lng1 DECIMAL, 
    lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        6371 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) * 
            cos(radians(lng2) - radians(lng1)) + 
            sin(radians(lat1)) * sin(radians(lat2))
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les tables principales
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON delivery_drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON delivery_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON delivery_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
