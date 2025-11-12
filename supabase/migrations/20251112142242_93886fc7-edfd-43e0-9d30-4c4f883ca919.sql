-- =====================================================
-- PHASE 1: COMPLETE DATABASE SCHEMA FOR ADMIN BACKEND
-- =====================================================

-- 1. CREATE APP ROLE ENUM
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- 2. CREATE PROFILES TABLE
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_type text NOT NULL DEFAULT 'patient' CHECK (user_type IN ('patient', 'doctor', 'admin')),
  first_name text NOT NULL,
  last_name text,
  phone_number text NOT NULL,
  phone_verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all profiles"
ON profiles FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. CREATE USER ROLES TABLE (SECURITY CRITICAL)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies
CREATE POLICY "Admins can manage all roles"
ON user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all roles"
ON user_roles FOR ALL
USING (true)
WITH CHECK (true);

-- 4. AUTO-ASSIGN ADMIN ROLE TO +917993448425
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number = '+917993448425' THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role auto-assigned to user: %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_assign_admin
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_assign_admin_role();

-- 5. CREATE DEMO LINKS TABLE
CREATE TABLE demo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  client_name text NOT NULL,
  feature_tier text NOT NULL CHECK (feature_tier IN ('basic', 'enhanced', 'premium')),
  max_reports integer NOT NULL DEFAULT 10,
  reports_used integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  payment_enabled boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  last_used_at timestamptz,
  notes text
);

CREATE INDEX idx_demo_links_token ON demo_links(token);
CREATE INDEX idx_demo_links_active ON demo_links(active);
CREATE INDEX idx_demo_links_created_by ON demo_links(created_by);

-- Enable RLS
ALTER TABLE demo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all demo links"
ON demo_links FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active demo links by token"
ON demo_links FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Service role can manage demo links"
ON demo_links FOR ALL
USING (true)
WITH CHECK (true);

-- 6. CREATE LAB CONFIGURATIONS TABLE
CREATE TABLE lab_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text UNIQUE NOT NULL,
  lab_name text NOT NULL,
  feature_tier text NOT NULL CHECK (feature_tier IN ('basic', 'enhanced', 'premium')),
  allowed_domains text[],
  webhook_url text,
  rate_limit_per_minute integer DEFAULT 60,
  payment_enabled boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_lab_api_key ON lab_configurations(api_key);
CREATE INDEX idx_lab_active ON lab_configurations(active);

-- Enable RLS
ALTER TABLE lab_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all lab configs"
ON lab_configurations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage lab configs"
ON lab_configurations FOR ALL
USING (true)
WITH CHECK (true);

-- 7. CREATE PAYMENT SETTINGS TABLE
CREATE TABLE payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_required boolean NOT NULL DEFAULT false,
  razorpay_enabled boolean NOT NULL DEFAULT false,
  basic_tier_price_inr integer NOT NULL DEFAULT 50,
  premium_tier_price_inr integer NOT NULL DEFAULT 100,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO payment_settings (payment_required, razorpay_enabled)
VALUES (false, false);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment settings"
ON payment_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can update payment settings"
ON payment_settings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage payment settings"
ON payment_settings FOR ALL
USING (true)
WITH CHECK (true);

-- 8. CREATE PAYMENT TRANSACTIONS TABLE
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text UNIQUE,
  razorpay_signature text,
  amount_inr integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'success', 'failed', 'refunded')),
  feature_tier text NOT NULL CHECK (feature_tier IN ('basic', 'enhanced', 'premium')),
  user_id uuid REFERENCES auth.users(id),
  demo_link_id uuid REFERENCES demo_links(id),
  pdf_analysis_id text REFERENCES pdf_analyses(id),
  payment_method text,
  error_code text,
  error_description text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  metadata jsonb
);

CREATE INDEX idx_payment_razorpay_order ON payment_transactions(razorpay_order_id);
CREATE INDEX idx_payment_status ON payment_transactions(status);
CREATE INDEX idx_payment_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_demo_link ON payment_transactions(demo_link_id);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON payment_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all payments"
ON payment_transactions FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view all payments"
ON payment_transactions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 9. MODIFY PDF_ANALYSES TABLE
ALTER TABLE pdf_analyses
ADD COLUMN demo_link_id uuid REFERENCES demo_links(id),
ADD COLUMN demo_session_id text,
ADD COLUMN lab_config_id uuid REFERENCES lab_configurations(id),
ADD COLUMN feature_tier text CHECK (feature_tier IN ('basic', 'enhanced', 'premium')),
ADD COLUMN payment_transaction_id uuid REFERENCES payment_transactions(id),
ADD COLUMN payment_verified boolean DEFAULT false;

CREATE INDEX idx_pdf_analyses_demo_link ON pdf_analyses(demo_link_id);
CREATE INDEX idx_pdf_analyses_demo_session ON pdf_analyses(demo_session_id);
CREATE INDEX idx_pdf_analyses_lab_config ON pdf_analyses(lab_config_id);
CREATE INDEX idx_pdf_analyses_payment ON pdf_analyses(payment_transaction_id);

-- Update RLS to allow demo link access
CREATE POLICY "Demo users can insert with demo link"
ON pdf_analyses FOR INSERT
TO anon
WITH CHECK (demo_link_id IS NOT NULL);

CREATE POLICY "Demo users can view their demo analyses"
ON pdf_analyses FOR SELECT
TO anon
USING (demo_session_id IS NOT NULL AND user_id LIKE 'demo-%');

CREATE POLICY "Service role can manage all analyses"
ON pdf_analyses FOR ALL
USING (true)
WITH CHECK (true);

-- 10. CREATE UPDATED_AT TRIGGER FOR PROFILES
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();