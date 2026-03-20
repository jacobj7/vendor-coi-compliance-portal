import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        category_id UUID REFERENCES vendor_categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        compliance_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS submission_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        message TEXT,
        expires_at TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        submission_request_id UUID REFERENCES submission_requests(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        certificate_type VARCHAR(100) NOT NULL,
        insurer_name VARCHAR(255),
        policy_number VARCHAR(255),
        coverage_type VARCHAR(100),
        coverage_amount NUMERIC(15, 2),
        coverage_start_date DATE,
        coverage_end_date DATE,
        file_url TEXT,
        file_name VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_categories_organization_id ON vendor_categories(organization_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_organization_id ON vendors(organization_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_category_id ON vendors(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_compliance_status ON vendors(compliance_status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submission_requests_vendor_id ON submission_requests(vendor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submission_requests_token ON submission_requests(token)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submission_requests_organization_id ON submission_requests(organization_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_vendor_id ON certificates(vendor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_organization_id ON certificates(organization_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_coverage_end_date ON certificates(coverage_end_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
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
  console.error("Unhandled migration error:", error);
  process.exit(1);
});
