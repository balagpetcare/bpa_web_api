-- Migration: Location composite unique constraints + venue name index
-- Purpose: Prevent duplicate location names within the same parent,
--          and add a name index on venues for search performance.

-- Divisions: unique name per country
CREATE UNIQUE INDEX "divisions_name_country_id_key" ON "divisions"("name", "country_id");

-- Districts: unique name per division
CREATE UNIQUE INDEX "districts_name_division_id_key" ON "districts"("name", "division_id");

-- City Corporations: unique name per district
CREATE UNIQUE INDEX "city_corporations_name_district_id_key" ON "city_corporations"("name", "district_id");

-- Zones: unique name per city corporation
CREATE UNIQUE INDEX "zones_name_city_corporation_id_key" ON "zones"("name", "city_corporation_id");

-- Venues: unique name per zone
CREATE UNIQUE INDEX "venues_name_zone_id_key" ON "venues"("name", "zone_id");

-- Venues: name index for search performance
CREATE INDEX "venues_name_idx" ON "venues"("name");
