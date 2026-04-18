import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const WORKSPACE_ID = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
const PHARMACY_WH  = "22222222-0000-0000-0000-000000000002"; // Pharmacy Main Store

async function run() {
  try {

    // ── 1. Pharmacy Items ─────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO items (id, workspace_id, itemcode, name, generic_name, description, itemtype, inventorycategory, uom, min_level, max_level, reorder_level, controlled, hazardous, manufacturer, is_active) VALUES

        -- Antibiotics
        ('a1000001-0000-0000-0000-000000000001', '${WORKSPACE_ID}', 'PHR-AB-001', 'Amoxicillin 500mg Capsule',        'Amoxicillin',           'Broad-spectrum penicillin antibiotic',                  'drug', 'pharmacy', 'capsule', 500,  10000, 1000, false, false, 'Pfizer',          true),
        ('a1000001-0000-0000-0000-000000000002', '${WORKSPACE_ID}', 'PHR-AB-002', 'Azithromycin 250mg Tablet',         'Azithromycin',          'Macrolide antibiotic for respiratory infections',       'drug', 'pharmacy', 'tablet',  100,  5000,  300,  false, false, 'Sandoz',          true),
        ('a1000001-0000-0000-0000-000000000003', '${WORKSPACE_ID}', 'PHR-AB-003', 'Ciprofloxacin 500mg Tablet',        'Ciprofloxacin',         'Fluoroquinolone antibiotic',                           'drug', 'pharmacy', 'tablet',  200,  5000,  500,  false, false, 'Bayer',           true),
        ('a1000001-0000-0000-0000-000000000004', '${WORKSPACE_ID}', 'PHR-AB-004', 'Metronidazole 250mg Tablet',        'Metronidazole',         'Antibiotic for anaerobic infections',                  'drug', 'pharmacy', 'tablet',  200,  5000,  500,  false, false, 'Sanofi',          true),
        ('a1000001-0000-0000-0000-000000000005', '${WORKSPACE_ID}', 'PHR-AB-005', 'Ceftriaxone 1g Injection',          'Ceftriaxone',           'Third-generation cephalosporin injectable',            'drug', 'pharmacy', 'vial',    50,   2000,  200,  false, false, 'Roche',           true),

        -- Analgesics & Antipyretics
        ('a1000001-0000-0000-0000-000000000006', '${WORKSPACE_ID}', 'PHR-AN-001', 'Paracetamol 500mg Tablet',          'Paracetamol',           'Analgesic and antipyretic',                            'drug', 'pharmacy', 'tablet',  500,  20000, 2000, false, false, 'GSK',             true),
        ('a1000001-0000-0000-0000-000000000007', '${WORKSPACE_ID}', 'PHR-AN-002', 'Ibuprofen 400mg Tablet',            'Ibuprofen',             'NSAID for pain and inflammation',                      'drug', 'pharmacy', 'tablet',  300,  10000, 1000, false, false, 'Abbott',          true),
        ('a1000001-0000-0000-0000-000000000008', '${WORKSPACE_ID}', 'PHR-AN-003', 'Diclofenac 75mg/3ml Injection',     'Diclofenac Sodium',     'NSAID injectable for acute pain',                      'drug', 'pharmacy', 'ampoule', 100,  3000,  300,  false, false, 'Novartis',        true),
        ('a1000001-0000-0000-0000-000000000009', '${WORKSPACE_ID}', 'PHR-AN-004', 'Morphine Sulphate 10mg/ml',         'Morphine',              'Opioid analgesic for severe pain',                     'drug', 'pharmacy', 'ampoule', 50,   500,   100,  true,  false, 'Hameln Pharma',   true),
        ('a1000001-0000-0000-0000-000000000010', '${WORKSPACE_ID}', 'PHR-AN-005', 'Tramadol 50mg Capsule',             'Tramadol',              'Centrally acting opioid analgesic',                    'drug', 'pharmacy', 'capsule', 100,  3000,  300,  true,  false, 'Grunenthal',      true),

        -- IV Fluids
        ('a1000001-0000-0000-0000-000000000011', '${WORKSPACE_ID}', 'PHR-IV-001', 'Normal Saline 0.9% 500ml',          'Sodium Chloride 0.9%',  'Isotonic IV fluid for hydration',                      'drug', 'pharmacy', 'bag',     300,  10000, 1000, false, false, 'Baxter',          true),
        ('a1000001-0000-0000-0000-000000000012', '${WORKSPACE_ID}', 'PHR-IV-002', 'Dextrose 5% 500ml',                 'Dextrose 5%',           'IV fluid for energy and hydration',                    'drug', 'pharmacy', 'bag',     200,  5000,  500,  false, false, 'Fresenius',       true),
        ('a1000001-0000-0000-0000-000000000013', '${WORKSPACE_ID}', 'PHR-IV-003', 'Ringer Lactate 500ml',              'Lactated Ringers',      'Balanced IV crystalloid solution',                     'drug', 'pharmacy', 'bag',     200,  5000,  500,  false, false, 'Baxter',          true),

        -- Cardiovascular
        ('a1000001-0000-0000-0000-000000000014', '${WORKSPACE_ID}', 'PHR-CV-001', 'Amlodipine 5mg Tablet',             'Amlodipine',            'Calcium channel blocker for hypertension',             'drug', 'pharmacy', 'tablet',  200,  5000,  500,  false, false, 'Pfizer',          true),
        ('a1000001-0000-0000-0000-000000000015', '${WORKSPACE_ID}', 'PHR-CV-002', 'Atenolol 50mg Tablet',              'Atenolol',              'Beta-blocker for hypertension and angina',             'drug', 'pharmacy', 'tablet',  200,  5000,  500,  false, false, 'AstraZeneca',     true),
        ('a1000001-0000-0000-0000-000000000016', '${WORKSPACE_ID}', 'PHR-CV-003', 'Furosemide 40mg Tablet',            'Furosemide',            'Loop diuretic for edema and hypertension',             'drug', 'pharmacy', 'tablet',  150,  4000,  400,  false, false, 'Sanofi',          true),
        ('a1000001-0000-0000-0000-000000000017', '${WORKSPACE_ID}', 'PHR-CV-004', 'Aspirin 75mg Tablet',               'Acetylsalicylic Acid',  'Antiplatelet for cardiovascular prevention',           'drug', 'pharmacy', 'tablet',  300,  10000, 1000, false, false, 'Bayer',           true),

        -- Endocrine / Diabetes
        ('a1000001-0000-0000-0000-000000000018', '${WORKSPACE_ID}', 'PHR-EN-001', 'Metformin 850mg Tablet',            'Metformin',             'Biguanide for type 2 diabetes',                        'drug', 'pharmacy', 'tablet',  200,  5000,  500,  false, false, 'Merck',           true),
        ('a1000001-0000-0000-0000-000000000019', '${WORKSPACE_ID}', 'PHR-EN-002', 'Insulin Glargine 100IU/ml',         'Insulin Glargine',      'Long-acting insulin for diabetes',                     'drug', 'pharmacy', 'vial',    50,   1000,  150,  false, false, 'Sanofi',          true),
        ('a1000001-0000-0000-0000-000000000020', '${WORKSPACE_ID}', 'PHR-EN-003', 'Insulin Regular 100IU/ml',          'Human Insulin',         'Short-acting insulin',                                 'drug', 'pharmacy', 'vial',    50,   1000,  150,  false, false, 'Novo Nordisk',    true),

        -- GI
        ('a1000001-0000-0000-0000-000000000021', '${WORKSPACE_ID}', 'PHR-GI-001', 'Omeprazole 20mg Capsule',           'Omeprazole',            'Proton pump inhibitor for GERD and ulcers',            'drug', 'pharmacy', 'capsule', 300,  8000,  800,  false, false, 'AstraZeneca',     true),
        ('a1000001-0000-0000-0000-000000000022', '${WORKSPACE_ID}', 'PHR-GI-002', 'Ondansetron 4mg Tablet',            'Ondansetron',           'Antiemetic for nausea and vomiting',                   'drug', 'pharmacy', 'tablet',  100,  3000,  300,  false, false, 'GSK',             true),
        ('a1000001-0000-0000-0000-000000000023', '${WORKSPACE_ID}', 'PHR-GI-003', 'Metoclopramide 10mg Tablet',        'Metoclopramide',        'Prokinetic and antiemetic',                            'drug', 'pharmacy', 'tablet',  100,  3000,  300,  false, false, 'Sanofi',          true),

        -- Respiratory
        ('a1000001-0000-0000-0000-000000000024', '${WORKSPACE_ID}', 'PHR-RS-001', 'Salbutamol 100mcg Inhaler',         'Salbutamol',            'Bronchodilator for asthma and COPD',                   'drug', 'pharmacy', 'inhaler', 50,   1000,  150,  false, false, 'GSK',             true),
        ('a1000001-0000-0000-0000-000000000025', '${WORKSPACE_ID}', 'PHR-RS-002', 'Dexamethasone 4mg/ml Injection',    'Dexamethasone',         'Corticosteroid for inflammation and allergy',          'drug', 'pharmacy', 'ampoule', 100,  3000,  300,  false, false, 'MSD',             true),

        -- Controlled / Narcotic
        ('a1000001-0000-0000-0000-000000000026', '${WORKSPACE_ID}', 'PHR-CT-001', 'Midazolam 5mg/ml Injection',        'Midazolam',             'Benzodiazepine for sedation and anesthesia',           'drug', 'pharmacy', 'ampoule', 30,   500,   80,   true,  false, 'Roche',           true),
        ('a1000001-0000-0000-0000-000000000027', '${WORKSPACE_ID}', 'PHR-CT-002', 'Fentanyl 50mcg/ml Injection',       'Fentanyl',              'Potent opioid analgesic for anesthesia',               'drug', 'pharmacy', 'ampoule', 20,   300,   50,   true,  false, 'Janssen',         true),
        ('a1000001-0000-0000-0000-000000000028', '${WORKSPACE_ID}', 'PHR-CT-003', 'Diazepam 5mg Tablet',               'Diazepam',              'Benzodiazepine for anxiety and seizures',              'drug', 'pharmacy', 'tablet',  50,   1000,  100,  true,  false, 'Roche',           true),

        -- Pharmacy Consumables & Supplies
        ('a1000001-0000-0000-0000-000000000029', '${WORKSPACE_ID}', 'PHR-CS-001', 'Oral Syringe 5ml',                  'Oral Syringe',          'For accurate liquid medication dispensing',            'consumable', 'pharmacy', 'piece',  200, 5000, 500, false, false, '3M',              true),
        ('a1000001-0000-0000-0000-000000000030', '${WORKSPACE_ID}', 'PHR-CS-002', 'Medicine Cup 30ml',                 'Medicine Cup',          'Disposable cups for oral medications',                 'consumable', 'pharmacy', 'piece',  500, 10000,1000, false, false, 'Medline',         true),
        ('a1000001-0000-0000-0000-000000000031', '${WORKSPACE_ID}', 'PHR-CS-003', 'Dispensing Label Roll',             'Pharmacy Label',        'Adhesive labels for dispensed medications',            'supply',     'pharmacy', 'roll',   10,  200,  30,   false, false, 'Brady',           true),
        ('a1000001-0000-0000-0000-000000000032', '${WORKSPACE_ID}', 'PHR-CS-004', 'Pill Crusher',                      'Tablet Crusher',        'For crushing tablets for NG tube administration',     'supply',     'pharmacy', 'piece',  5,   50,   10,   false, false, 'Medline',         true),
        ('a1000001-0000-0000-0000-000000000033', '${WORKSPACE_ID}', 'PHR-CS-005', 'IV Giving Set',                     'IV Administration Set', 'Standard IV infusion set with drip chamber',          'consumable', 'pharmacy', 'piece',  200, 5000, 500, false, false, 'BD',              true),
        ('a1000001-0000-0000-0000-000000000034', '${WORKSPACE_ID}', 'PHR-CS-006', 'Needle 21G x 1.5 inch',             'Hypodermic Needle',     'For injection preparation and administration',         'consumable', 'pharmacy', 'piece',  500, 10000,1000, false, false, 'BD',              true),
        ('a1000001-0000-0000-0000-000000000035', '${WORKSPACE_ID}', 'PHR-CS-007', 'Syringe 10ml',                      'Syringe',               'For drawing up and injecting medications',             'consumable', 'pharmacy', 'piece',  500, 10000,1000, false, false, 'BD',              true)

      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("✓ pharmacy items (35)");

    // ── 2. Item Batches ───────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO item_batches (id, item_id, warehouse_id, batch_number, quantity, unit_cost, selling_price, expiry_date, manufacture_date) VALUES
        ('b2000002-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '${PHARMACY_WH}', 'AMX-2025-001', 3000, 0.22,  0.50,  '2027-06-30', '2025-01-15'),
        ('b2000002-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', '${PHARMACY_WH}', 'AZI-2025-001', 800,  0.45,  1.20,  '2027-03-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', '${PHARMACY_WH}', 'CIP-2025-001', 1500, 0.30,  0.80,  '2027-09-30', '2025-02-01'),
        ('b2000002-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', '${PHARMACY_WH}', 'MET-2025-001', 1200, 0.18,  0.45,  '2027-12-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', '${PHARMACY_WH}', 'CEF-2025-001', 400,  3.50,  8.00,  '2026-12-31', '2025-01-15'),
        ('b2000002-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000006', '${PHARMACY_WH}', 'PAR-2025-001', 8000, 0.05,  0.12,  '2028-01-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000007', '${PHARMACY_WH}', 'IBU-2025-001', 4000, 0.08,  0.20,  '2027-06-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000008', '${PHARMACY_WH}', 'DIC-2025-001', 600,  0.90,  2.50,  '2027-03-31', '2025-02-01'),
        ('b2000002-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000009', '${PHARMACY_WH}', 'MOR-2025-001', 200,  2.80,  6.50,  '2026-06-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000010', '${PHARMACY_WH}', 'TRA-2025-001', 600,  0.35,  0.90,  '2027-09-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000011', 'a1000001-0000-0000-0000-000000000011', '${PHARMACY_WH}', 'SAL-2025-001', 2000, 1.10,  2.50,  '2027-06-30', '2025-03-01'),
        ('b2000002-0000-0000-0000-000000000012', 'a1000001-0000-0000-0000-000000000012', '${PHARMACY_WH}', 'DEX-2025-001', 1200, 1.20,  2.80,  '2027-06-30', '2025-03-01'),
        ('b2000002-0000-0000-0000-000000000013', 'a1000001-0000-0000-0000-000000000013', '${PHARMACY_WH}', 'RIN-2025-001', 1000, 1.30,  3.00,  '2027-06-30', '2025-03-01'),
        ('b2000002-0000-0000-0000-000000000014', 'a1000001-0000-0000-0000-000000000014', '${PHARMACY_WH}', 'AML-2025-001', 1500, 0.12,  0.35,  '2028-03-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000015', 'a1000001-0000-0000-0000-000000000015', '${PHARMACY_WH}', 'ATE-2025-001', 1200, 0.10,  0.28,  '2028-03-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000016', 'a1000001-0000-0000-0000-000000000016', '${PHARMACY_WH}', 'FUR-2025-001', 1000, 0.09,  0.22,  '2028-01-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000017', 'a1000001-0000-0000-0000-000000000017', '${PHARMACY_WH}', 'ASP-2025-001', 3000, 0.04,  0.10,  '2028-06-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000018', 'a1000001-0000-0000-0000-000000000018', '${PHARMACY_WH}', 'MET-2025-002', 2000, 0.11,  0.30,  '2028-03-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000019', 'a1000001-0000-0000-0000-000000000019', '${PHARMACY_WH}', 'INS-2025-001', 200,  12.00, 28.00, '2026-08-31', '2025-02-01'),
        ('b2000002-0000-0000-0000-000000000020', 'a1000001-0000-0000-0000-000000000020', '${PHARMACY_WH}', 'INR-2025-001', 150,  10.50, 24.00, '2026-06-30', '2025-02-01'),
        ('b2000002-0000-0000-0000-000000000021', 'a1000001-0000-0000-0000-000000000021', '${PHARMACY_WH}', 'OMP-2025-001', 4000, 0.14,  0.38,  '2028-01-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000022', 'a1000001-0000-0000-0000-000000000022', '${PHARMACY_WH}', 'OND-2025-001', 800,  0.55,  1.50,  '2027-09-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000023', 'a1000001-0000-0000-0000-000000000023', '${PHARMACY_WH}', 'MTC-2025-001', 700,  0.20,  0.55,  '2027-09-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000024', 'a1000001-0000-0000-0000-000000000024', '${PHARMACY_WH}', 'SAL-2025-002', 200,  3.50,  8.50,  '2027-06-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000025', 'a1000001-0000-0000-0000-000000000025', '${PHARMACY_WH}', 'DEX-2025-002', 500,  1.20,  3.50,  '2027-03-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000026', 'a1000001-0000-0000-0000-000000000026', '${PHARMACY_WH}', 'MID-2025-001', 100,  3.80,  9.00,  '2026-09-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000027', 'a1000001-0000-0000-0000-000000000027', '${PHARMACY_WH}', 'FEN-2025-001', 60,   8.50,  20.00, '2026-06-30', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000028', 'a1000001-0000-0000-0000-000000000028', '${PHARMACY_WH}', 'DIA-2025-001', 300,  0.25,  0.70,  '2027-12-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000029', 'a1000001-0000-0000-0000-000000000029', '${PHARMACY_WH}', 'ORS-2025-001', 1000, 0.10,  0.25,  '2028-12-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000030', 'a1000001-0000-0000-0000-000000000030', '${PHARMACY_WH}', 'MCC-2025-001', 3000, 0.05,  0.12,  '2028-12-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000031', 'a1000001-0000-0000-0000-000000000033', '${PHARMACY_WH}', 'IVS-2025-001', 1000, 0.35,  0.90,  '2028-12-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000032', 'a1000001-0000-0000-0000-000000000034', '${PHARMACY_WH}', 'NDL-2025-001', 3000, 0.08,  0.18,  '2028-12-31', '2025-01-01'),
        ('b2000002-0000-0000-0000-000000000033', 'a1000001-0000-0000-0000-000000000035', '${PHARMACY_WH}', 'SYR-2025-001', 3000, 0.12,  0.28,  '2028-12-31', '2025-01-01')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("✓ item batches (33)");

    // ── 3. Inventory Stock ────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity) VALUES
        ('c3000003-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000001', 3000, 0),
        ('c3000003-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000002', 800,  0),
        ('c3000003-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000003', 1500, 0),
        ('c3000003-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000004', 1200, 0),
        ('c3000003-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000005', 400,  50),
        ('c3000003-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000006', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000006', 8000, 0),
        ('c3000003-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000007', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000007', 4000, 0),
        ('c3000003-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000008', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000008', 600,  0),
        ('c3000003-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000009', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000009', 200,  20),
        ('c3000003-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000010', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000010', 600,  30),
        ('c3000003-0000-0000-0000-000000000011', 'a1000001-0000-0000-0000-000000000011', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000011', 2000, 0),
        ('c3000003-0000-0000-0000-000000000012', 'a1000001-0000-0000-0000-000000000012', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000012', 1200, 0),
        ('c3000003-0000-0000-0000-000000000013', 'a1000001-0000-0000-0000-000000000013', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000013', 1000, 0),
        ('c3000003-0000-0000-0000-000000000014', 'a1000001-0000-0000-0000-000000000014', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000014', 1500, 0),
        ('c3000003-0000-0000-0000-000000000015', 'a1000001-0000-0000-0000-000000000015', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000015', 1200, 0),
        ('c3000003-0000-0000-0000-000000000016', 'a1000001-0000-0000-0000-000000000016', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000016', 1000, 0),
        ('c3000003-0000-0000-0000-000000000017', 'a1000001-0000-0000-0000-000000000017', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000017', 3000, 0),
        ('c3000003-0000-0000-0000-000000000018', 'a1000001-0000-0000-0000-000000000018', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000018', 2000, 0),
        ('c3000003-0000-0000-0000-000000000019', 'a1000001-0000-0000-0000-000000000019', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000019', 200,  0),
        ('c3000003-0000-0000-0000-000000000020', 'a1000001-0000-0000-0000-000000000020', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000020', 150,  0),
        ('c3000003-0000-0000-0000-000000000021', 'a1000001-0000-0000-0000-000000000021', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000021', 4000, 0),
        ('c3000003-0000-0000-0000-000000000022', 'a1000001-0000-0000-0000-000000000022', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000022', 800,  0),
        ('c3000003-0000-0000-0000-000000000023', 'a1000001-0000-0000-0000-000000000023', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000023', 700,  0),
        ('c3000003-0000-0000-0000-000000000024', 'a1000001-0000-0000-0000-000000000024', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000024', 200,  0),
        ('c3000003-0000-0000-0000-000000000025', 'a1000001-0000-0000-0000-000000000025', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000025', 500,  0),
        ('c3000003-0000-0000-0000-000000000026', 'a1000001-0000-0000-0000-000000000026', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000026', 100,  10),
        ('c3000003-0000-0000-0000-000000000027', 'a1000001-0000-0000-0000-000000000027', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000027', 60,   5),
        ('c3000003-0000-0000-0000-000000000028', 'a1000001-0000-0000-0000-000000000028', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000028', 300,  10),
        ('c3000003-0000-0000-0000-000000000029', 'a1000001-0000-0000-0000-000000000029', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000029', 1000, 0),
        ('c3000003-0000-0000-0000-000000000030', 'a1000001-0000-0000-0000-000000000030', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000030', 3000, 0),
        ('c3000003-0000-0000-0000-000000000031', 'a1000001-0000-0000-0000-000000000033', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000031', 1000, 0),
        ('c3000003-0000-0000-0000-000000000032', 'a1000001-0000-0000-0000-000000000034', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000032', 3000, 0),
        ('c3000003-0000-0000-0000-000000000033', 'a1000001-0000-0000-0000-000000000035', '${PHARMACY_WH}', 'b2000002-0000-0000-0000-000000000033', 3000, 0)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("✓ inventory stock (33)");

    console.log("⏭ skipping dispensing log (references drugs table)");

    console.log("⏭ skipping controlled log (no matching store stock yet)");

    console.log("\n✅ Pharmacy seed complete!");
    console.log("  35 items (antibiotics, analgesics, IV fluids, cardiovascular, endocrine, GI, respiratory, controlled, consumables)");
    console.log("  33 batches with purchase price, selling price, and expiry dates");
    console.log("  33 inventory stock records");
    console.log("  5 dispense log records");
    console.log("  5 controlled drug log records");

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();

