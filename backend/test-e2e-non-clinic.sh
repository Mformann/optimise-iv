#!/bin/bash
# End-to-End API Test: Non-Clinic Workflow
# Tests: Happy path (safe review, normal vitals), Risky path, Abnormal vitals path

set -e
BASE="http://localhost:3000/api"
PASS=0
FAIL=0
TOTAL=0

# Helper functions
assert_eq() {
  TOTAL=$((TOTAL + 1))
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  [PASS] $label (got: $actual)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected '$expected', got '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_empty() {
  TOTAL=$((TOTAL + 1))
  local label="$1" actual="$2"
  if [ -n "$actual" ] && [ "$actual" != "null" ]; then
    echo "  [PASS] $label (got: $actual)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected non-empty, got '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

json_field() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d$2)" 2>/dev/null || echo ""
}

echo "============================================"
echo "  NON-CLINIC WORKFLOW E2E TEST"
echo "============================================"
echo ""

# ─── Step 0: Login as admin and doctor ───
echo "--- Step 0: Login ---"
RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"admin123"}')
ADMIN_TOKEN=$(json_field "$RESP" "['data']['token']")
ADMIN_ID=$(json_field "$RESP" "['data']['user']['id']")
assert_not_empty "Admin login token" "$ADMIN_TOKEN"

RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinic.com","password":"doctor123"}')
DOCTOR_TOKEN=$(json_field "$RESP" "['data']['token']")
DOCTOR_ID=$(json_field "$RESP" "['data']['user']['id']")
assert_not_empty "Doctor login token" "$DOCTOR_TOKEN"
assert_not_empty "Doctor ID" "$DOCTOR_ID"

echo ""

# ─── Step 1: Create nurse user ───
echo "--- Step 1: Create nurse user ---"
RESP=$(curl -s -X POST "$BASE/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Nurse Jane","email":"nurse@clinic.com","password":"nurse123","role":"nurse","phone":"555-0001"}')
# Nurse may already exist from a previous run; extract ID or login to get it
NURSE_ID=$(json_field "$RESP" "['data']['id']")

# Login as nurse (works whether nurse was just created or already existed)
RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nurse@clinic.com","password":"nurse123"}')
NURSE_TOKEN=$(json_field "$RESP" "['data']['token']")
NURSE_ID=$(json_field "$RESP" "['data']['user']['id']")
assert_not_empty "Nurse ID" "$NURSE_ID"
assert_not_empty "Nurse login token" "$NURSE_TOKEN"

echo ""

# ─── Step 2: Create non-clinic location ───
echo "--- Step 2: Create non-clinic location ---"
RESP=$(curl -s -X POST "$BASE/clinics" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Gym Wellness Center","address":"123 Fitness Ave","city":"Dubai","phone":"555-GYM1","location_type":"non_clinic"}')
NC_CLINIC_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Non-clinic location created" "$NC_CLINIC_ID"

echo ""

# ─── Step 3: Create partner linked to non-clinic ───
echo "--- Step 3: Create partner ---"
RESP=$(curl -s -X POST "$BASE/partners" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"name\":\"FitGym Partner\",\"contact_person\":\"John Gym\",\"contact_phone\":\"555-0002\",\"contact_email\":\"gym@partner.com\",\"commission_type\":\"percentage\",\"commission_value\":10,\"venue_type\":\"gym\",\"clinic_id\":\"$NC_CLINIC_ID\"}")
PARTNER_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Partner created" "$PARTNER_ID"

echo ""

# ════════════════════════════════════════════
# HAPPY PATH: Safe review → Normal vitals
# ════════════════════════════════════════════
echo "============================================"
echo "  HAPPY PATH: Safe Review + Normal Vitals"
echo "============================================"
echo ""

# ─── Step 4: Log inquiry ───
echo "--- Step 4: Create inquiry ---"
RESP=$(curl -s -X POST "$BASE/inquiries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"partner_id\":\"$PARTNER_ID\",\"clinic_id\":\"$NC_CLINIC_ID\",\"client_name\":\"Alice Happy\",\"client_phone\":\"555-1001\",\"client_email\":\"alice@test.com\",\"source\":\"whatsapp\",\"interest_notes\":\"Interested in IV drip\"}")
INQUIRY_ID=$(json_field "$RESP" "['data']['id']")
INQ_STATUS=$(json_field "$RESP" "['data']['status']")
assert_not_empty "Inquiry created" "$INQUIRY_ID"
assert_eq "Inquiry status = new" "new" "$INQ_STATUS"

echo ""

# ─── Step 5: Mark contacted ───
echo "--- Step 5: Mark inquiry contacted ---"
RESP=$(curl -s -X POST "$BASE/inquiries/$INQUIRY_ID/contact" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
INQ_STATUS=$(json_field "$RESP" "['data']['status']")
CONTACTED_BY=$(json_field "$RESP" "['data']['contacted_by']")
assert_eq "Inquiry status = contacted" "contacted" "$INQ_STATUS"
assert_not_empty "contacted_by set" "$CONTACTED_BY"

echo ""

# ─── Step 6: Convert inquiry to appointment ───
echo "--- Step 6: Convert inquiry to appointment ---"
RESP=$(curl -s -X POST "$BASE/inquiries/$INQUIRY_ID/convert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"doctor_id\":\"$DOCTOR_ID\",\"scheduled_date\":\"2026-02-20\",\"scheduled_time\":\"10:00\",\"type\":\"drip\"}")
APPT_ID=$(json_field "$RESP" "['data']['appointment']['id']")
PATIENT_ID=$(json_field "$RESP" "['data']['patient_id']")
INQ_STATUS=$(json_field "$RESP" "['data']['inquiry']['status']")
assert_not_empty "Appointment created" "$APPT_ID"
assert_not_empty "Patient created" "$PATIENT_ID"
assert_eq "Inquiry status = converted" "converted" "$INQ_STATUS"

# Verify appointment status
RESP=$(curl -s "$BASE/appointments/$APPT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
IS_NC=$(json_field "$RESP" "['data']['is_non_clinic']")
assert_eq "Appointment status = pending_precheck" "pending_precheck" "$APPT_STATUS"
assert_eq "is_non_clinic = 1" "1" "$IS_NC"

echo ""

# ─── Step 7: Fill & submit pre-check form ───
echo "--- Step 7: Pre-check form ---"
RESP=$(curl -s -X POST "$BASE/pre-checks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"patient_id\":\"$PATIENT_ID\",\"appointment_id\":\"$APPT_ID\",\"has_allergies\":0,\"allergy_details\":\"\",\"has_chronic_conditions\":0,\"chronic_details\":\"\",\"current_medications\":\"\",\"is_pregnant\":0,\"had_surgery_recently\":0,\"surgery_details\":\"\",\"last_meal_time\":\"2 hours ago\",\"consent_given\":1}")
FORM_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Pre-check form created" "$FORM_ID"

RESP=$(curl -s -X POST "$BASE/pre-checks/$FORM_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
FORM_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Pre-check status = submitted" "submitted" "$FORM_STATUS"

# Verify appointment moved to pending_review
RESP=$(curl -s "$BASE/appointments/$APPT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = pending_review" "pending_review" "$APPT_STATUS"

echo ""

# ─── Step 8A: Doctor reviews — SAFE ───
echo "--- Step 8A: Doctor review — SAFE ---"
RESP=$(curl -s -X POST "$BASE/doctor-reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -d "{\"appointment_id\":\"$APPT_ID\",\"decision\":\"safe\",\"notes\":\"All clear, no risk factors\"}")
REVIEW_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Doctor review created" "$REVIEW_ID"

RESP=$(curl -s "$BASE/appointments/$APPT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = confirmed" "confirmed" "$APPT_STATUS"

echo ""

# ─── Step 9: Mark preparing ───
echo "--- Step 9: Mark preparing ---"
RESP=$(curl -s -X POST "$BASE/appointments/$APPT_ID/preparing" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = preparing" "preparing" "$APPT_STATUS"

echo ""

# ─── Step 10: Assign nurse ───
echo "--- Step 10: Assign nurse ---"
RESP=$(curl -s -X POST "$BASE/appointments/$APPT_ID/assign-nurse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"nurse_id\":\"$NURSE_ID\"}")
ASSIGNED_NURSE=$(json_field "$RESP" "['data']['nurse_id']")
assert_eq "Nurse assigned" "$NURSE_ID" "$ASSIGNED_NURSE"

echo ""

# ─── Step 11: Dispatch ───
echo "--- Step 11: Dispatch ---"
RESP=$(curl -s -X POST "$BASE/appointments/$APPT_ID/dispatch" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = vitals_check (auto-advanced)" "vitals_check" "$APPT_STATUS"

echo ""

# ─── Step 12: Record vitals — NORMAL ───
echo "--- Step 12: Record vitals — NORMAL ---"
RESP=$(curl -s -X POST "$BASE/vitals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -d "{\"appointment_id\":\"$APPT_ID\",\"blood_pressure_systolic\":120,\"blood_pressure_diastolic\":80,\"heart_rate\":72,\"temperature\":36.6,\"oxygen_saturation\":98,\"blood_sugar\":90,\"weight\":70,\"decision\":\"normal\"}")
VITALS_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Vitals recorded" "$VITALS_ID"

RESP=$(curl -s "$BASE/appointments/$APPT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = in_progress" "in_progress" "$APPT_STATUS"

echo ""

# ─── Step 13: Complete appointment ───
echo "--- Step 13: Complete appointment ---"
RESP=$(curl -s -X POST "$BASE/appointments/$APPT_ID/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"completion_notes":"Treatment done successfully","final_price":150}')
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = completed" "completed" "$APPT_STATUS"

echo ""

# ─── Step 14: Host report ───
echo "--- Step 14: Host report ---"
RESP=$(curl -s "$BASE/partners/$PARTNER_ID/host-report" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
INQ_COUNT=$(json_field "$RESP" "['data']['inquiry_count']")
CONV_COUNT=$(json_field "$RESP" "['data']['converted_count']")
COMP_COUNT=$(json_field "$RESP" "['data']['completed_count']")
assert_eq "inquiry_count = 1" "1" "$INQ_COUNT"
assert_eq "converted_count = 1" "1" "$CONV_COUNT"
assert_eq "completed_count = 1" "1" "$COMP_COUNT"

echo ""

# ─── Step 15: Pipeline should be empty ───
echo "--- Step 15: Pipeline check ---"
RESP=$(curl -s "$BASE/appointments/non-clinic/pipeline" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
PIPELINE_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null || echo "?")
assert_eq "Pipeline is empty" "0" "$PIPELINE_LEN"

echo ""

# ════════════════════════════════════════════
# ALTERNATE PATH A: Risky → Doctor Call → Cleared
# ════════════════════════════════════════════
echo "============================================"
echo "  ALTERNATE PATH A: Risky → Call → Cleared"
echo "============================================"
echo ""

# Step A4: New inquiry
echo "--- Step A4: New inquiry ---"
RESP=$(curl -s -X POST "$BASE/inquiries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"partner_id\":\"$PARTNER_ID\",\"clinic_id\":\"$NC_CLINIC_ID\",\"client_name\":\"Bob Risky\",\"client_phone\":\"555-2001\",\"source\":\"phone\"}")
INQ2_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Inquiry 2 created" "$INQ2_ID"

# Step A5: Contact
RESP=$(curl -s -X POST "$BASE/inquiries/$INQ2_ID/contact" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_eq "Inquiry 2 contacted" "contacted" "$(json_field "$RESP" "['data']['status']")"

# Step A6: Convert
RESP=$(curl -s -X POST "$BASE/inquiries/$INQ2_ID/convert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"doctor_id\":\"$DOCTOR_ID\",\"scheduled_date\":\"2026-02-21\",\"scheduled_time\":\"14:00\",\"type\":\"drip\"}")
APPT2_ID=$(json_field "$RESP" "['data']['appointment']['id']")
PATIENT2_ID=$(json_field "$RESP" "['data']['patient_id']")
assert_not_empty "Appointment 2 created" "$APPT2_ID"

# Step A7: Pre-check
RESP=$(curl -s -X POST "$BASE/pre-checks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"patient_id\":\"$PATIENT2_ID\",\"appointment_id\":\"$APPT2_ID\",\"has_allergies\":1,\"allergy_details\":\"Penicillin\",\"has_chronic_conditions\":1,\"chronic_details\":\"High blood pressure\",\"current_medications\":\"Lisinopril\",\"is_pregnant\":0,\"had_surgery_recently\":0,\"consent_given\":1}")
FORM2_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Pre-check 2 created" "$FORM2_ID"

RESP=$(curl -s -X POST "$BASE/pre-checks/$FORM2_ID/submit" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_eq "Pre-check 2 submitted" "submitted" "$(json_field "$RESP" "['data']['status']")"

echo ""

# Step A8: Doctor review — RISKY
echo "--- Step A8: Doctor review — RISKY ---"
RESP=$(curl -s -X POST "$BASE/doctor-reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -d "{\"appointment_id\":\"$APPT2_ID\",\"decision\":\"risky\",\"risk_factors\":\"High BP history, on medication\",\"notes\":\"Need to call patient\"}")
REVIEW2_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Risky review created" "$REVIEW2_ID"

RESP=$(curl -s "$BASE/appointments/$APPT2_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = review_risky" "review_risky" "$APPT_STATUS"

echo ""

# Step A8b: Doctor completes call → cleared
echo "--- Step A8b: Doctor call → cleared ---"
RESP=$(curl -s -X POST "$BASE/doctor-reviews/$REVIEW2_ID/complete-call" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -d '{"call_notes":"Spoke with patient. BP is managed. OK to proceed.","final_decision":"cleared"}')
FINAL_DEC=$(json_field "$RESP" "['data']['final_decision']")
assert_eq "Final decision = cleared" "cleared" "$FINAL_DEC"

RESP=$(curl -s "$BASE/appointments/$APPT2_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = confirmed (after call)" "confirmed" "$APPT_STATUS"

echo ""

# Continue risky path through completion
echo "--- Continue risky path: preparing → dispatch → vitals → complete ---"
curl -s -X POST "$BASE/appointments/$APPT2_ID/preparing" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
curl -s -X POST "$BASE/appointments/$APPT2_ID/assign-nurse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"nurse_id\":\"$NURSE_ID\"}" > /dev/null
RESP=$(curl -s -X POST "$BASE/appointments/$APPT2_ID/dispatch" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Risky path: dispatch → vitals_check" "vitals_check" "$APPT_STATUS"

RESP=$(curl -s -X POST "$BASE/vitals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -d "{\"appointment_id\":\"$APPT2_ID\",\"blood_pressure_systolic\":130,\"blood_pressure_diastolic\":85,\"heart_rate\":78,\"temperature\":36.7,\"oxygen_saturation\":97,\"decision\":\"normal\"}")
assert_not_empty "Vitals 2 recorded" "$(json_field "$RESP" "['data']['id']")"

RESP=$(curl -s -X POST "$BASE/appointments/$APPT2_ID/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"completion_notes":"Risky path completed OK","final_price":200}')
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Risky path completed" "completed" "$APPT_STATUS"

echo ""

# ════════════════════════════════════════════
# ALTERNATE PATH B: Abnormal Vitals
# ════════════════════════════════════════════
echo "============================================"
echo "  ALTERNATE PATH B: Abnormal Vitals"
echo "============================================"
echo ""

# Step B4: New inquiry
echo "--- Step B4: New inquiry ---"
RESP=$(curl -s -X POST "$BASE/inquiries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"partner_id\":\"$PARTNER_ID\",\"clinic_id\":\"$NC_CLINIC_ID\",\"client_name\":\"Carol Abnormal\",\"client_phone\":\"555-3001\",\"source\":\"walk_in\"}")
INQ3_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Inquiry 3 created" "$INQ3_ID"

# Contact + Convert
curl -s -X POST "$BASE/inquiries/$INQ3_ID/contact" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
RESP=$(curl -s -X POST "$BASE/inquiries/$INQ3_ID/convert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"doctor_id\":\"$DOCTOR_ID\",\"scheduled_date\":\"2026-02-22\",\"scheduled_time\":\"11:00\",\"type\":\"drip\"}")
APPT3_ID=$(json_field "$RESP" "['data']['appointment']['id']")
PATIENT3_ID=$(json_field "$RESP" "['data']['patient_id']")
assert_not_empty "Appointment 3 created" "$APPT3_ID"

# Pre-check + submit
RESP=$(curl -s -X POST "$BASE/pre-checks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"patient_id\":\"$PATIENT3_ID\",\"appointment_id\":\"$APPT3_ID\",\"has_allergies\":0,\"has_chronic_conditions\":0,\"is_pregnant\":0,\"had_surgery_recently\":0,\"consent_given\":1}")
FORM3_ID=$(json_field "$RESP" "['data']['id']")
curl -s -X POST "$BASE/pre-checks/$FORM3_ID/submit" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

# Safe review
curl -s -X POST "$BASE/doctor-reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -d "{\"appointment_id\":\"$APPT3_ID\",\"decision\":\"safe\",\"notes\":\"Cleared\"}" > /dev/null

# Prepare + nurse + dispatch
curl -s -X POST "$BASE/appointments/$APPT3_ID/preparing" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
curl -s -X POST "$BASE/appointments/$APPT3_ID/assign-nurse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"nurse_id\":\"$NURSE_ID\"}" > /dev/null
curl -s -X POST "$BASE/appointments/$APPT3_ID/dispatch" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

echo ""

# Step B12: Record abnormal vitals
echo "--- Step B12: Record vitals — ABNORMAL ---"
RESP=$(curl -s -X POST "$BASE/vitals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -d "{\"appointment_id\":\"$APPT3_ID\",\"blood_pressure_systolic\":180,\"blood_pressure_diastolic\":110,\"heart_rate\":110,\"temperature\":38.5,\"oxygen_saturation\":92,\"blood_sugar\":200,\"weight\":85,\"decision\":\"abnormal\",\"abnormal_notes\":\"BP dangerously high, fever present\"}")
VITALS3_ID=$(json_field "$RESP" "['data']['id']")
assert_not_empty "Abnormal vitals recorded" "$VITALS3_ID"

RESP=$(curl -s "$BASE/appointments/$APPT3_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
APPT_STATUS=$(json_field "$RESP" "['data']['status']")
assert_eq "Appointment status = vitals_failed" "vitals_failed" "$APPT_STATUS"

echo ""

# ─── Final: Updated host report ───
echo "--- Final: Updated host report ---"
RESP=$(curl -s "$BASE/partners/$PARTNER_ID/host-report" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
INQ_COUNT=$(json_field "$RESP" "['data']['inquiry_count']")
CONV_COUNT=$(json_field "$RESP" "['data']['converted_count']")
COMP_COUNT=$(json_field "$RESP" "['data']['completed_count']")
assert_eq "Total inquiries = 3" "3" "$INQ_COUNT"
assert_eq "Total converted = 3" "3" "$CONV_COUNT"
assert_eq "Total completed = 2" "2" "$COMP_COUNT"

echo ""
echo "============================================"
echo "  RESULTS: $PASS passed / $FAIL failed / $TOTAL total"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
