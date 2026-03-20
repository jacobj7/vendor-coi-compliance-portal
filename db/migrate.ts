import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS coordinators (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES vendor_categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        contact_name VARCHAR(255),
        invite_token VARCHAR(255) UNIQUE,
        compliance_status VARCHAR(50) DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 'expired')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates_of_insurance (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        insurer_name VARCHAR(255),
        policy_number VARCHAR(255),
        coverage_type VARCHAR(255),
        coverage_limit NUMERIC(15, 2),
        effective_date DATE,
        expiration_date DATE,
        status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired')),
        extracted_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by INTEGER REFERENCES coordinators(id) ON DELETE SET NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_requirements (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES vendor_categories(id) ON DELETE CASCADE,
        coverage_type VARCHAR(255) NOT NULL,
        min_limit NUMERIC(15, 2),
        required BOOLEAN DEFAULT TRUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expiration_alerts (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        coi_id INTEGER NOT NULL REFERENCES certificates_of_insurance(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('30_days', '14_days', '7_days', '1_day', 'expired')),
        days_until_expiry INTEGER,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        email_sent_to VARCHAR(255)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        coordinator_id INTEGER REFERENCES coordinators(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_category_id ON vendors(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_compliance_status ON vendors(compliance_status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_invite_token ON vendors(invite_token)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_coi_vendor_id ON certificates_of_insurance(vendor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_coi_status ON certificates_of_insurance(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_coi_expiration_date ON certificates_of_insurance(expiration_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_category_id ON compliance_requirements(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expiration_alerts_vendor_id ON expiration_alerts(vendor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expiration_alerts_coi_id ON expiration_alerts(coi_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_coordinator_id ON audit_log(coordinator_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)
    `);

    await client.query("COMMIT");

    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Fatal migration error:", error);
  process.exit(1);
});
