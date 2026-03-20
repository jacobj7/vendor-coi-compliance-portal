import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        required_coverage_types JSONB NOT NULL DEFAULT '[]',
        min_coverage_amounts JSONB NOT NULL DEFAULT '{}'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        category_id UUID REFERENCES vendor_categories(id) ON DELETE SET NULL,
        invite_token VARCHAR(255) UNIQUE,
        compliance_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        extracted_data JSONB,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expiration_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        alert_type VARCHAR(100) NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_category_id ON vendors(category_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_compliance_status ON vendors(compliance_status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_vendor_id ON submissions(vendor_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON submissions(reviewed_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expiration_alerts_submission_id ON expiration_alerts(submission_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type_entity_id ON audit_log(entity_type, entity_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
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

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
