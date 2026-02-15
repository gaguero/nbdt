-- Nayara Ordering System — Schema v3
-- Tour Name Normalization System

CREATE TABLE IF NOT EXISTS tour_name_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name TEXT UNIQUE NOT NULL,
    suggested_product_id UUID REFERENCES tour_products(id) ON DELETE SET NULL,
    confirmed_product_id UUID REFERENCES tour_products(id) ON DELETE SET NULL,
    confidence_score DECIMAL(3,2),
    is_ignored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_name_mappings_original ON tour_name_mappings(original_name);
CREATE INDEX IF NOT EXISTS idx_tour_name_mappings_confirmed ON tour_name_mappings(confirmed_product_id) WHERE confirmed_product_id IS NOT NULL;

CREATE TRIGGER update_tour_name_mappings_updated_at BEFORE UPDATE ON tour_name_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
