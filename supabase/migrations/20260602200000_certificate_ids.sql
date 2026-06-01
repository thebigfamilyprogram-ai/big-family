-- Issued certificates — lookup table (cert_id → user_id)
-- Populated when a student opens their diploma for the first time
CREATE TABLE IF NOT EXISTS issued_certificates (
  cert_id   TEXT PRIMARY KEY,
  user_id   UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE issued_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read issued certs for verification"
  ON issued_certificates FOR SELECT USING (true);

CREATE POLICY "Students can register own cert"
  ON issued_certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Certificate verifications log — analytics (who verified, when)
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id     TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verifier_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_cert_verifications_cert_id
  ON certificate_verifications(cert_id);

-- No RLS — analytics data, not sensitive student info
