-- Rebrand: Loov/Loovis → OverBrain
-- Renames network ID, display names, and tracker label.

-- 1. Rename org network
UPDATE org_networks SET id = 'overbrain-network', name = 'OverBrain' WHERE id = 'loov-network';

-- 2. Update branch FK references
UPDATE dim_branches SET network_id = 'overbrain-network' WHERE network_id = 'loov-network';

-- 3. Rename tracker display label
UPDATE adapter_registry SET name = 'OverBrain Tracker' WHERE id = 'tracker' AND name = 'Loovis Tracker';
