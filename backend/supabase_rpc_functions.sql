-- ============================================================
-- Supabase RPC Functions — Optimise IV CRM
-- Run this entire script in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

-- ─── Utility: atomic drip stock increment/decrement ────────
CREATE OR REPLACE FUNCTION increment_drip_stock(p_drip_id UUID, p_change INT)
RETURNS VOID AS $$
BEGIN
  UPDATE drips
  SET stock_quantity = stock_quantity + p_change,
      updated_at = NOW()
  WHERE id = p_drip_id;
END;
$$ LANGUAGE plpgsql;

-- ─── Appointment: time-overlap check ───────────────────────
CREATE OR REPLACE FUNCTION check_appointment_overlap(
  p_doctor_id  UUID,
  p_date       DATE,
  p_start_time TIME,
  p_duration_minutes INT,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_end_time TIME := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM appointments
  WHERE doctor_id = p_doctor_id
    AND scheduled_date = p_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (
      (p_start_time >= scheduled_time::TIME
         AND p_start_time < scheduled_time::TIME + (duration_minutes || ' minutes')::INTERVAL)
      OR
      (scheduled_time::TIME >= p_start_time
         AND scheduled_time::TIME < v_end_time)
    );

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ─── Appointment: stats aggregate ──────────────────────────
CREATE OR REPLACE FUNCTION get_appointment_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'total',     COUNT(*),
    'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'no_show',   COUNT(*) FILTER (WHERE status = 'no_show')
  ) INTO v_result
  FROM appointments
  WHERE (p_start_date IS NULL OR scheduled_date >= p_start_date)
    AND (p_end_date   IS NULL OR scheduled_date <= p_end_date);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ─── Doctor Review: pending appointments with no review ────
CREATE OR REPLACE FUNCTION get_pending_review_appointments()
RETURNS TABLE(
  appointment_id UUID,
  patient_name   TEXT,
  clinic_name    TEXT,
  scheduled_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id                                                   AS appointment_id,
    (p.first_name || ' ' || p.last_name)                  AS patient_name,
    c.name                                                 AS clinic_name,
    a.scheduled_date
  FROM appointments a
  INNER JOIN patients p ON a.patient_id = p.id
  INNER JOIN clinics  c ON a.clinic_id  = c.id
  WHERE a.status = 'pending_review'
    AND NOT EXISTS (
      SELECT 1 FROM doctor_reviews dr WHERE dr.appointment_id = a.id
    )
  ORDER BY a.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ─── Inquiry: stats RPCs ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_inquiry_stats_by_partner(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'total',      COUNT(*),
    'new_count',  COUNT(*) FILTER (WHERE status = 'new'),
    'contacted',  COUNT(*) FILTER (WHERE status = 'contacted'),
    'converted',  COUNT(*) FILTER (WHERE status = 'converted'),
    'lost',       COUNT(*) FILTER (WHERE status = 'lost')
  ) INTO v_result
  FROM inquiries
  WHERE partner_id = p_partner_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_inquiry_stats()
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'total',      COUNT(*),
    'new_count',  COUNT(*) FILTER (WHERE status = 'new'),
    'contacted',  COUNT(*) FILTER (WHERE status = 'contacted'),
    'converted',  COUNT(*) FILTER (WHERE status = 'converted'),
    'lost',       COUNT(*) FILTER (WHERE status = 'lost')
  ) INTO v_result
  FROM inquiries;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ─── Partner: commission stats & host report ───────────────
CREATE OR REPLACE FUNCTION get_partner_commission_stats(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'total',   COALESCE(SUM(amount), 0),
    'pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    'paid',    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'),    0)
  ) INTO v_result
  FROM partner_commissions
  WHERE partner_id = p_partner_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_partner_host_report(
  p_partner_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date   TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_inquiry_count    INT;
  v_converted_count  INT;
  v_appt_count       INT;
  v_completed_count  INT;
  v_total_revenue    NUMERIC;
  v_comm_total       NUMERIC;
  v_comm_pending     NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE i.status = 'converted')
  INTO v_inquiry_count, v_converted_count
  FROM inquiries i
  WHERE i.partner_id = p_partner_id
    AND (p_start_date IS NULL OR i.created_at >= p_start_date)
    AND (p_end_date   IS NULL OR i.created_at <= p_end_date);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE a.status = 'completed'),
    COALESCE(SUM(a.final_price) FILTER (WHERE a.status = 'completed'), 0)
  INTO v_appt_count, v_completed_count, v_total_revenue
  FROM appointments a
  INNER JOIN inquiries i ON a.inquiry_id = i.id
  WHERE i.partner_id = p_partner_id
    AND (p_start_date IS NULL OR a.scheduled_date >= p_start_date::DATE)
    AND (p_end_date   IS NULL OR a.scheduled_date <= p_end_date::DATE);

  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)
  INTO v_comm_total, v_comm_pending
  FROM partner_commissions
  WHERE partner_id = p_partner_id;

  RETURN JSON_BUILD_OBJECT(
    'inquiry_count',      v_inquiry_count,
    'converted_count',    v_converted_count,
    'conversion_rate',    CASE WHEN v_inquiry_count > 0 THEN ROUND((v_converted_count::NUMERIC / v_inquiry_count) * 100) ELSE 0 END,
    'appointment_count',  v_appt_count,
    'completed_count',    v_completed_count,
    'total_revenue',      v_total_revenue,
    'total_commission',   v_comm_total,
    'pending_commission', v_comm_pending
  );
END;
$$ LANGUAGE plpgsql;

-- ─── Referral rewards (dual-patient alias JOIN) ────────────
CREATE OR REPLACE FUNCTION get_referral_rewards(p_patient_id UUID DEFAULT NULL)
RETURNS TABLE(
  id                   UUID,
  referrer_patient_id  UUID,
  referred_patient_id  UUID,
  scheme_id            UUID,
  status               TEXT,
  created_at           TIMESTAMPTZ,
  claimed_at           TIMESTAMPTZ,
  referrer_name        TEXT,
  referred_name        TEXT,
  scheme_name          TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rr.id,
    rr.referrer_patient_id,
    rr.referred_patient_id,
    rr.scheme_id,
    rr.status,
    rr.created_at,
    rr.claimed_at,
    (p1.first_name || ' ' || p1.last_name) AS referrer_name,
    (p2.first_name || ' ' || p2.last_name) AS referred_name,
    rs.name                                 AS scheme_name
  FROM referral_rewards rr
  INNER JOIN patients        p1 ON rr.referrer_patient_id = p1.id
  INNER JOIN patients        p2 ON rr.referred_patient_id  = p2.id
  INNER JOIN referral_schemes rs ON rr.scheme_id           = rs.id
  WHERE (p_patient_id IS NULL OR rr.referrer_patient_id = p_patient_id)
  ORDER BY rr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: ensure wallet row exists ──────────────────────
CREATE OR REPLACE FUNCTION ensure_wallet(p_patient_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO patient_wallets (id, patient_id, balance)
  VALUES (gen_random_uuid(), p_patient_id, 0)
  ON CONFLICT (patient_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: add money ─────────────────────────────────────
CREATE OR REPLACE FUNCTION add_money_to_wallet(
  p_patient_id UUID,
  p_amount     NUMERIC,
  p_method     TEXT,
  p_user_id    UUID,
  p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  PERFORM ensure_wallet(p_patient_id);
  UPDATE patient_wallets SET balance = balance + p_amount, updated_at = NOW()
  WHERE patient_id = p_patient_id;

  INSERT INTO wallet_transactions (id, patient_id, type, amount, payment_method, description, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'money_deposit', p_amount, p_method, p_description, p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: spend balance ─────────────────────────────────
CREATE OR REPLACE FUNCTION spend_wallet_balance(
  p_patient_id     UUID,
  p_amount         NUMERIC,
  p_user_id        UUID,
  p_reference_id   UUID,
  p_description    TEXT,
  p_reference_type TEXT DEFAULT 'appointment',
  p_allow_overdraft BOOLEAN DEFAULT FALSE
) RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  PERFORM ensure_wallet(p_patient_id);
  SELECT balance INTO v_current_balance FROM patient_wallets WHERE patient_id = p_patient_id;

  IF NOT p_allow_overdraft AND v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE patient_wallets SET balance = balance - p_amount, updated_at = NOW()
  WHERE patient_id = p_patient_id;

  INSERT INTO wallet_transactions (id, patient_id, type, amount, payment_method, description, reference_id, reference_type, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'money_spent', -p_amount, 'wallet', p_description, p_reference_id, p_reference_type, p_user_id);

  RETURN JSON_BUILD_OBJECT('new_balance', v_current_balance - p_amount);
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: add drip balance (internal helper) ────────────
CREATE OR REPLACE FUNCTION add_drip_balance_internal(
  p_patient_id UUID,
  p_drip_id    UUID,
  p_quantity   INT,
  p_total_cost NUMERIC,
  p_method     TEXT,
  p_user_id    UUID,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO patient_drip_balances (id, patient_id, drip_id, quantity, remaining_quantity, expires_at, created_by)
  VALUES (gen_random_uuid(), p_patient_id, p_drip_id, p_quantity, p_quantity, p_expires_at, p_user_id);

  INSERT INTO wallet_transactions (id, patient_id, type, amount, drip_id, drip_quantity, payment_method, description, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'drip_purchase', p_total_cost, p_drip_id, p_quantity, p_method, 'Offer Redemption', p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: use drip credits (FIFO) ──────────────────────
CREATE OR REPLACE FUNCTION use_drip_credits(
  p_patient_id    UUID,
  p_drip_id       UUID,
  p_quantity      INT,
  p_user_id       UUID,
  p_appointment_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_remaining_to_deduct INT := p_quantity;
  v_batch RECORD;
  v_deduct_from_batch   INT;
  v_new_remaining       INT;
BEGIN
  -- Validate total available
  IF (
    SELECT COALESCE(SUM(remaining_quantity), 0) FROM patient_drip_balances
    WHERE patient_id = p_patient_id AND drip_id = p_drip_id
      AND is_active = TRUE AND remaining_quantity > 0
  ) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient drip balance';
  END IF;

  -- FIFO: oldest expiry first, then oldest purchase
  FOR v_batch IN
    SELECT id, remaining_quantity FROM patient_drip_balances
    WHERE patient_id = p_patient_id AND drip_id = p_drip_id
      AND is_active = TRUE AND remaining_quantity > 0
    ORDER BY expires_at ASC NULLS LAST, added_at ASC
  LOOP
    EXIT WHEN v_remaining_to_deduct <= 0;
    v_deduct_from_batch := LEAST(v_batch.remaining_quantity, v_remaining_to_deduct);
    v_new_remaining     := v_batch.remaining_quantity - v_deduct_from_batch;

    UPDATE patient_drip_balances
    SET remaining_quantity = v_new_remaining,
        is_active = (v_new_remaining > 0)
    WHERE id = v_batch.id;

    v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_from_batch;
  END LOOP;

  INSERT INTO wallet_transactions (id, patient_id, type, amount, drip_id, drip_quantity, payment_method, reference_id, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'drip_usage', 0, p_drip_id, -p_quantity, 'wallet', p_appointment_id, p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: buy drip with wallet balance ─────────────────
CREATE OR REPLACE FUNCTION buy_drip_with_wallet(
  p_patient_id UUID,
  p_drip_id    UUID,
  p_quantity   INT,
  p_total_cost NUMERIC,
  p_user_id    UUID,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID AS $$
DECLARE v_balance NUMERIC;
BEGIN
  PERFORM ensure_wallet(p_patient_id);
  SELECT balance INTO v_balance FROM patient_wallets WHERE patient_id = p_patient_id;
  IF v_balance < p_total_cost THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE patient_wallets SET balance = balance - p_total_cost, updated_at = NOW()
  WHERE patient_id = p_patient_id;

  INSERT INTO wallet_transactions (id, patient_id, type, amount, payment_method, description, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'money_spent', -p_total_cost, 'wallet', 'Bought ' || p_quantity || ' drips', p_user_id);

  INSERT INTO patient_drip_balances (id, patient_id, drip_id, quantity, remaining_quantity, expires_at, created_by)
  VALUES (gen_random_uuid(), p_patient_id, p_drip_id, p_quantity, p_quantity, p_expires_at, p_user_id);

  INSERT INTO wallet_transactions (id, patient_id, type, amount, drip_id, drip_quantity, payment_method, description, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'drip_purchase', 0, p_drip_id, p_quantity, 'wallet', 'Paid via Wallet', p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ─── Wallet: buy drip direct (cash/card) ──────────────────
CREATE OR REPLACE FUNCTION buy_drip_direct(
  p_patient_id UUID,
  p_drip_id    UUID,
  p_quantity   INT,
  p_total_cost NUMERIC,
  p_method     TEXT,
  p_user_id    UUID,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO patient_drip_balances (id, patient_id, drip_id, quantity, remaining_quantity, expires_at, created_by)
  VALUES (gen_random_uuid(), p_patient_id, p_drip_id, p_quantity, p_quantity, p_expires_at, p_user_id);

  INSERT INTO wallet_transactions (id, patient_id, type, amount, drip_id, drip_quantity, payment_method, description, created_by)
  VALUES (gen_random_uuid(), p_patient_id, 'drip_purchase', p_total_cost, p_drip_id, p_quantity, p_method, 'Direct Purchase', p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ─── Offer: redeem ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_offer(
  p_offer_id       UUID,
  p_patient_id     UUID,
  p_user_id        UUID,
  p_payment_method TEXT,
  p_custom_cost    NUMERIC DEFAULT NULL,
  p_appointment_id UUID    DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_offer          RECORD;
  v_actual_cost    NUMERIC;
  v_value_granted  NUMERIC;
  v_drip_id        UUID;
  v_drip_quantity  INT;
  v_redemption_id  UUID := gen_random_uuid();
  v_expires_at     TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF NOT v_offer.is_active THEN RAISE EXCEPTION 'Offer is not active'; END IF;

  v_actual_cost := CASE
    WHEN v_offer.fixed_value = 0 AND p_custom_cost IS NOT NULL THEN p_custom_cost
    ELSE v_offer.cost
  END;

  IF v_offer.type = 'money' THEN
    v_value_granted := CASE
      WHEN v_offer.fixed_value = 0 AND p_custom_cost IS NOT NULL AND v_offer.cost > 0
        THEN (p_custom_cost / v_offer.cost) * COALESCE(v_offer.value, 0)
      ELSE COALESCE(v_offer.value, 0)
    END;
    PERFORM add_money_to_wallet(p_patient_id, v_value_granted, p_payment_method, p_user_id, 'Offer: ' || v_offer.name);

  ELSIF v_offer.type = 'drip' THEN
    v_drip_id       := v_offer.drip_id;
    v_drip_quantity := v_offer.drip_quantity;

    -- Compute expiry from pattern
    IF v_offer.expires_at_pattern LIKE '%day%' THEN
      v_expires_at := NOW() + (regexp_replace(v_offer.expires_at_pattern, '[^0-9]', '', 'g')::INT || ' days')::INTERVAL;
    ELSIF v_offer.expires_at_pattern LIKE '%month%' THEN
      v_expires_at := NOW() + (regexp_replace(v_offer.expires_at_pattern, '[^0-9]', '', 'g')::INT || ' months')::INTERVAL;
    ELSIF v_offer.expires_at_pattern LIKE '%year%' THEN
      v_expires_at := NOW() + (regexp_replace(v_offer.expires_at_pattern, '[^0-9]', '', 'g')::INT || ' years')::INTERVAL;
    END IF;

    PERFORM add_drip_balance_internal(p_patient_id, v_drip_id, v_drip_quantity, v_actual_cost, p_payment_method, p_user_id, v_expires_at);
  END IF;

  INSERT INTO offer_redemptions (id, offer_id, patient_id, appointment_id, cost_paid, payment_method, value_granted, drip_id, drip_quantity, created_by)
  VALUES (v_redemption_id, p_offer_id, p_patient_id, p_appointment_id, v_actual_cost, p_payment_method, v_value_granted, v_drip_id, v_drip_quantity, p_user_id);

  RETURN (SELECT ROW_TO_JSON(r) FROM (SELECT * FROM offer_redemptions WHERE id = v_redemption_id) r);
END;
$$ LANGUAGE plpgsql;

-- ─── Payment: full process_payment transaction ─────────────
-- NOTE: This is a JSON-based RPC that accepts serialized params.
-- The JS layer passes JSON strings for complex objects.
CREATE OR REPLACE FUNCTION process_payment(
  p_patient_id      UUID,
  p_reference_id    UUID,
  p_drips           TEXT,   -- JSON array of {drip_id, quantity, price}
  p_payment         TEXT,   -- JSON: PaymentInfo
  p_user_id         UUID,
  p_reference_type  TEXT DEFAULT 'appointment',
  p_completion_data TEXT DEFAULT NULL,  -- JSON: CompletionData | null
  p_delivery_data   TEXT DEFAULT NULL   -- JSON: DeliveryData | null
) RETURNS JSON AS $$
DECLARE
  v_drips           JSONB  := p_drips::JSONB;
  v_payment         JSONB  := p_payment::JSONB;
  v_completion      JSONB  := CASE WHEN p_completion_data IS NOT NULL THEN p_completion_data::JSONB ELSE NULL END;
  v_delivery        JSONB  := CASE WHEN p_delivery_data   IS NOT NULL THEN p_delivery_data::JSONB   ELSE NULL END;
  v_now             TEXT   := NOW()::TEXT;
  v_drip            JSONB;
  v_cash            NUMERIC := COALESCE((v_payment->>'cash_amount')::NUMERIC, 0);
  v_card            NUMERIC := COALESCE((v_payment->>'card_amount')::NUMERIC, 0);
  v_wallet_spent    NUMERIC := 0;
  v_credits_used    JSONB   := '[]'::JSONB;
  v_breakdown_total NUMERIC := 0;
  v_credit_total    NUMERIC := 0;
BEGIN
  -- 1. Use drip credits
  IF (v_payment->>'use_credits')::BOOLEAN THEN
    FOR v_drip IN SELECT * FROM JSONB_ARRAY_ELEMENTS(v_drips) LOOP
      DECLARE
        v_drip_id   UUID    := (v_drip->>'drip_id')::UUID;
        v_quantity  INT     := (v_drip->>'quantity')::INT;
        v_price     NUMERIC := (v_drip->>'price')::NUMERIC;
        v_avail     INT;
        v_from_cred INT;
      BEGIN
        SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_avail
        FROM patient_drip_balances
        WHERE patient_id = p_patient_id AND drip_id = v_drip_id AND is_active AND remaining_quantity > 0;

        v_from_cred := LEAST(v_quantity, v_avail);
        IF v_from_cred > 0 THEN
          PERFORM use_drip_credits(p_patient_id, v_drip_id, v_from_cred, p_user_id, p_reference_id);
          v_credits_used := v_credits_used || JSONB_BUILD_OBJECT('drip_id', v_drip_id, 'quantity', v_from_cred);
          v_credit_total := v_credit_total + (v_from_cred * v_price);
        END IF;
      END;
    END LOOP;
  END IF;

  -- 2. Wallet / pay-later
  IF (v_payment->>'use_wallet')::BOOLEAN OR (v_payment->>'pay_later')::BOOLEAN THEN
    DECLARE
      v_wallet_amt NUMERIC := CASE
        WHEN (v_payment->>'pay_later')::BOOLEAN
          THEN COALESCE((v_payment->>'wallet_amount')::NUMERIC, 0) - v_cash - v_card
        ELSE COALESCE((v_payment->>'wallet_amount')::NUMERIC, 0)
      END;
      v_desc TEXT := CASE WHEN (v_payment->>'pay_later')::BOOLEAN
        THEN 'Pending payment for ' || p_reference_type
        ELSE 'Payment for ' || p_reference_type END;
    BEGIN
      IF v_wallet_amt > 0 THEN
        PERFORM spend_wallet_balance(p_patient_id, v_wallet_amt, p_user_id, p_reference_id, v_desc, p_reference_type, (v_payment->>'pay_later')::BOOLEAN);
        v_wallet_spent := v_wallet_amt;
      END IF;
    END;
  END IF;

  -- 3. Cash payment log
  IF v_cash > 0 THEN
    INSERT INTO wallet_transactions (id, patient_id, type, amount, payment_method, description, reference_id, reference_type, created_by)
    VALUES (gen_random_uuid(), p_patient_id, 'money_spent', v_cash, 'cash', 'Cash payment for ' || p_reference_type, p_reference_id, p_reference_type, p_user_id);
  END IF;

  -- 4. Card payment log
  IF v_card > 0 THEN
    INSERT INTO wallet_transactions (id, patient_id, type, amount, payment_method, description, reference_id, reference_type, created_by)
    VALUES (gen_random_uuid(), p_patient_id, 'money_spent', v_card, 'card', 'Card payment for ' || p_reference_type, p_reference_id, p_reference_type, p_user_id);
  END IF;

  -- 5. Appointment completion
  IF v_completion IS NOT NULL THEN
    UPDATE appointments
    SET status           = 'completed',
        actual_end_at    = NOW(),
        remarks          = v_completion->>'remarks',
        completion_notes = v_completion->>'completion_notes',
        final_price      = COALESCE((v_completion->>'final_price')::NUMERIC, 0),
        payment_status   = v_completion->>'payment_status',
        updated_at       = NOW()
    WHERE id = p_reference_id;

    IF v_completion->'drips' IS NOT NULL THEN
      FOR v_drip IN SELECT * FROM JSONB_ARRAY_ELEMENTS(v_completion->'drips') LOOP
        INSERT INTO appointment_drips (id, appointment_id, drip_id, quantity, price_at_time, created_at)
        VALUES (gen_random_uuid(), p_reference_id, (v_drip->>'drip_id')::UUID, (v_drip->>'quantity')::INT, (v_drip->>'price')::NUMERIC, NOW());
        PERFORM increment_drip_stock((v_drip->>'drip_id')::UUID, -(v_drip->>'quantity')::INT);
      END LOOP;
    END IF;
  END IF;

  -- 6. Drip order delivery
  IF v_delivery IS NOT NULL THEN
    PERFORM increment_drip_stock((v_delivery->>'dripId')::UUID, -(v_delivery->>'quantity')::INT);
    UPDATE drip_orders
    SET status         = 'delivered',
        delivered_by   = (v_delivery->>'deliveredBy')::UUID,
        delivery_notes = v_delivery->>'deliveryNotes',
        delivered_at   = NOW()
    WHERE id = (v_delivery->>'orderId')::UUID;
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'success',       TRUE,
    'credits_used',  v_credits_used,
    'wallet_spent',  v_wallet_spent,
    'cash_received', v_cash,
    'card_received', v_card,
    'total_paid',    v_credit_total + v_wallet_spent + v_cash + v_card
  );
END;
$$ LANGUAGE plpgsql;
