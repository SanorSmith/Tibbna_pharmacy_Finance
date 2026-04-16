import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the non-medical database (Neon DB)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection for non-medical patient data
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// Generate patient number function
function generatePatientNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `P-${year}-${random}`;
}

// Generate openEHR ID using standard UUID format
function generateOpenEHRId(): string {
  return crypto.randomUUID();
}

// Phone number normalization function
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('00964')) {
    // 00964 770 3171017 -> 9647703171017
    return digits.substring(2); // Remove 00
  } else if (digits.startsWith('964')) {
    // 9647703171017 -> 9647703171017 (already normalized)
    return digits;
  } else if (digits.startsWith('07')) {
    // 07703171017 -> 9647703171017
    return '964' + digits.substring(1);
  } else if (digits.startsWith('7') && digits.length === 10) {
    // 7703171017 -> 9647703171017
    return '964' + digits;
  }
  
  // Return as-is if no pattern matches
  return digits;
}

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search') || '';
    const governorate = searchParams.get('governorate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log('Fetching patients from non-medical database...');
    console.log('Search term:', searchTerm);
    console.log('Governorate filter:', governorate);
    console.log('Page:', page, 'Limit:', limit);

    // Build the base query with age calculation and joins to related tables
    let query = `
      SELECT 
        p.patientid as id,
        p.ehrid as patient_number,
        p.firstname as first_name_ar,
        p.firstname as first_name_en,
        p.middlename as middle_name,
        p.lastname as last_name_ar,
        p.lastname as last_name_en,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname as full_name_ar,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname as full_name_en,
        p.dateofbirth::date as date_of_birth,
        EXTRACT(YEAR FROM AGE(p.dateofbirth::date)) as age,
        p.gender,
        p.bloodgroup as blood_group,
        p.nationalid as national_id,
        p.phone,
        p.phone as mobile,
        p.email,
        p.address,
        p.address as governorate,
        NULL as district,
        NULL as neighborhood,
        ec.contactname as emergency_contact,
        ec.contactphone as emergency_phone,
        NULL as emergency_contact_relationship_ar,
        med.medicalhistory as medical_history,
        0 as total_balance,
        true as is_active,
        p.createdat as created_at,
        p.updatedat as updated_at,
        NULL as insurance_state,
        ins.insurancenumber as insurance_number,
        ins.insurancecompany as insurance_company,
        NULL as next_appointment,
        med.allergies,
        med.chronicdiseases as chronic_diseases,
        med.currentmedications as current_medications
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add search filters
    if (searchTerm) {
      // Normalize the search term for phone number matching
      const normalizedSearch = normalizePhoneNumber(searchTerm);
      
      // Check if search term looks like a phone number (mostly digits)
      const isPhoneSearch = /^\+?[0-9\s\-\(\)]+$/.test(searchTerm.replace(/\s/g, ''));
      
      if (isPhoneSearch) {
        // Phone number search - use phone matching logic
        query += ` AND (
          p.phone ILIKE $${paramIndex} OR 
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 1} OR
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 2} OR
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 3} OR
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 4}
        )`;
        
        params.push(
          `%${searchTerm}%`,           // Original search term
          `%${normalizedSearch}%`,     // Normalized format (9647703171017)
          `%+${normalizedSearch}%`,    // With + prefix (+9647703171017)
          `%00${normalizedSearch}%`,  // With 00 prefix (009647703171017)
          `%0${normalizedSearch.substring(3)}%` // Local format (07703171017)
        );
        paramIndex += 5;
      } else {
        // Name search - prioritize full name matches, then individual parts
        const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (searchWords.length === 1) {
          // Single word search - match first name, last name, or full name
          query += ` AND (
            p.firstname ILIKE $${paramIndex} OR 
            p.lastname ILIKE $${paramIndex} OR 
            p.middlename ILIKE $${paramIndex} OR
            (p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname) ILIKE $${paramIndex} OR
            p.ehrid ILIKE $${paramIndex} OR 
            p.nationalid ILIKE $${paramIndex} OR 
            p.email ILIKE $${paramIndex}
          )`;
          params.push(`%${searchTerm}%`);
          paramIndex += 1;
        } else {
          // Multiple words search - prioritize exact sequence matches
          query += ` AND (
            (p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname) ILIKE $${paramIndex} OR
            (p.firstname || ' ' || p.lastname) ILIKE $${paramIndex} OR
            (p.lastname || ' ' || p.firstname) ILIKE $${paramIndex} OR
            (p.firstname ILIKE $${paramIndex + 1} AND p.lastname ILIKE $${paramIndex + 2}) OR
            (p.firstname ILIKE $${paramIndex + 2} AND p.lastname ILIKE $${paramIndex + 1}) OR
            p.ehrid ILIKE $${paramIndex} OR 
            p.nationalid ILIKE $${paramIndex} OR 
            p.email ILIKE $${paramIndex}
          )`;
          
          params.push(
            `%${searchTerm}%`,                    // Full sequence search
            `%${searchWords[0]}%`,                // First word
            `%${searchWords[searchWords.length - 1]}%`  // Last word
          );
          paramIndex += 3;
        }
      }
    }

    if (governorate) {
      // Since governorate doesn't exist in the actual table, we'll skip this filter
      // but keep the parameter for compatibility
      console.log('Governorate filter not supported - column does not exist in table');
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('Executing query:', query);
    console.log('Parameters:', params);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM patients
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    if (searchTerm) {
      // Normalize the search term for phone number matching
      const normalizedSearch = normalizePhoneNumber(searchTerm);
      
      // Check if search term looks like a phone number (mostly digits)
      const isPhoneSearch = /^\+?[0-9\s\-\(\)]+$/.test(searchTerm.replace(/\s/g, ''));
      
      if (isPhoneSearch) {
        // Phone number search - use phone matching logic
        countQuery += ` AND (
          phone ILIKE $${countParamIndex} OR 
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 1} OR
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 2} OR
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 3} OR
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 4}
        )`;
        
        countParams.push(
          `%${searchTerm}%`,           // Original search term
          `%${normalizedSearch}%`,     // Normalized format (9647703171017)
          `%+${normalizedSearch}%`,    // With + prefix (+9647703171017)
          `%00${normalizedSearch}%`,  // With 00 prefix (009647703171017)
          `%0${normalizedSearch.substring(3)}%` // Local format (07703171017)
        );
        countParamIndex += 5;
      } else {
        // Name search - prioritize full name matches, then individual parts
        const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (searchWords.length === 1) {
          // Single word search - match first name, last name, or full name
          countQuery += ` AND (
            firstname ILIKE $${countParamIndex} OR 
            lastname ILIKE $${countParamIndex} OR 
            middlename ILIKE $${countParamIndex} OR
            (firstname || ' ' || COALESCE(middlename || ' ', '') || lastname) ILIKE $${countParamIndex} OR
            ehrid ILIKE $${countParamIndex} OR 
            nationalid ILIKE $${countParamIndex} OR 
            email ILIKE $${countParamIndex}
          )`;
          countParams.push(`%${searchTerm}%`);
          countParamIndex += 1;
        } else {
          // Multiple words search - prioritize exact sequence matches
          countQuery += ` AND (
            (firstname || ' ' || COALESCE(middlename || ' ', '') || lastname) ILIKE $${countParamIndex} OR
            (firstname || ' ' || lastname) ILIKE $${countParamIndex} OR
            (lastname || ' ' || firstname) ILIKE $${countParamIndex} OR
            (firstname ILIKE $${countParamIndex + 1} AND lastname ILIKE $${countParamIndex + 2}) OR
            (firstname ILIKE $${countParamIndex + 2} AND lastname ILIKE $${countParamIndex + 1}) OR
            ehrid ILIKE $${countParamIndex} OR 
            nationalid ILIKE $${countParamIndex} OR 
            email ILIKE $${countParamIndex}
          )`;
          
          countParams.push(
            `%${searchTerm}%`,                    // Full sequence search
            `%${searchWords[0]}%`,                // First word
            `%${searchWords[searchWords.length - 1]}%`  // Last word
          );
          countParamIndex += 3;
        }
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalPatients = parseInt(countResult.rows[0].total);

    console.log(`Found ${result.rows.length} patients out of ${totalPatients} total`);

    // Transform the data to match the expected format
    const patients = result.rows.map(row => ({
      id: row.id,
      patientid: row.id,
      patient_id: row.id,
      patientNumber: row.patient_number,
      patient_number: row.patient_number,
      firstNameAr: row.first_name_ar,
      first_name_ar: row.first_name_ar,
      firstNameEn: row.first_name_en,
      first_name_en: row.first_name_en,
      middleName: row.middle_name,
      middle_name: row.middle_name,
      lastNameAr: row.last_name_ar,
      last_name_ar: row.last_name_ar,
      lastNameEn: row.last_name_en,
      last_name_en: row.last_name_en,
      fullNameAr: row.full_name_ar,
      full_name_ar: row.full_name_ar,
      fullNameEn: row.full_name_en,
      full_name_en: row.full_name_en,
      dateOfBirth: row.date_of_birth,
      date_of_birth: row.date_of_birth,
      dateofbirth: row.date_of_birth,
      age: parseInt(row.age) || 0,
      gender: row.gender,
      bloodGroup: row.blood_group,
      blood_group: row.blood_group,
      bloodgroup: row.blood_group,
      nationalId: row.national_id,
      national_id: row.national_id,
      nationalid: row.national_id,
      phone: row.phone,
      mobile: row.mobile,
      email: row.email,
      address: row.address,
      governorate: row.governorate,
      district: row.district,
      neighborhood: row.neighborhood,
      // Emergency contact fields - both formats
      emergencyContactNameAr: row.emergency_contact,
      emergency_contact: row.emergency_contact,
      emergencyContactPhone: row.emergency_phone,
      emergency_phone: row.emergency_phone,
      emergency_contact_phone: row.emergency_phone,
      emergencyContactRelationshipAr: row.emergency_contact_relationship_ar,
      // Medical information fields
      allergies: row.allergies,
      chronic_diseases: row.chronic_diseases,
      chronicDiseases: row.chronic_diseases,
      current_medications: row.current_medications,
      currentMedications: row.current_medications,
      medicalHistory: row.medical_history,
      medical_history: row.medical_history,
      // Insurance fields
      totalBalance: parseFloat(row.total_balance) || 0,
      total_balance: parseFloat(row.total_balance) || 0,
      isActive: row.is_active,
      is_active: row.is_active,
      insuranceState: row.insurance_state,
      insurance_state: row.insurance_state,
      insuranceNumber: row.insurance_number,
      insurance_number: row.insurance_number,
      insuranceCompany: row.insurance_company,
      insurance_company: row.insurance_company,
      nextAppointment: row.next_appointment,
      createdAt: row.created_at,
      createdat: row.created_at,
      updatedAt: row.updated_at,
      updatedat: row.updated_at
    }));

    return NextResponse.json(patients);

  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch patients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Creating new patient:', body);

    // Generate openEHR ID using standard UUID format
    const patientNumber = body.patientNumber || generateOpenEHRId();

    // Start a transaction to ensure all inserts succeed or fail together
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Insert into patients table
      const patientQuery = `
        INSERT INTO patients (
          patientid,
          ehrid,
          firstname,
          middlename,
          lastname,
          dateofbirth,
          gender,
          bloodgroup,
          nationalid,
          phone,
          email,
          address,
          workspaceid,
          createdat
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          NULL,
          NOW()
        ) RETURNING *
      `;

      const patientParams = [
        patientNumber,
        body.first_name_ar || body.first_name_en || body.firstname,
        body.middle_name || body.middlename || null,
        body.last_name_ar || body.last_name_en || body.lastname,
        body.date_of_birth || body.dateofbirth,
        body.gender,
        body.blood_group || body.bloodgroup || null,
        body.national_id || body.nationalid || null,
        body.phone,
        body.email || null,
        body.governorate || body.address
      ];

      console.log('Executing patient insert query:', patientQuery);
      console.log('Parameters:', patientParams);

      const patientResult = await client.query(patientQuery, patientParams);
      const newPatient = patientResult.rows[0];
      const patientId = newPatient.patientid;

      console.log('Patient created successfully with ID:', patientId);

      // 2. Insert emergency contact if provided
      if (body.emergency_contact || body.emergency_phone || body.emergency_contact_phone) {
        const emergencyQuery = `
          INSERT INTO patient_emergency_contacts (
            patientid,
            contactname,
            contactphone,
            createdat,
            updatedat
          ) VALUES ($1, $2, $3, NOW(), NOW())
        `;
        
        await client.query(emergencyQuery, [
          patientId,
          body.emergency_contact || null,
          body.emergency_phone || body.emergency_contact_phone || null
        ]);
        
        console.log('Emergency contact saved');
      }

      // 3. Insert insurance information if provided
      if (body.insurance_company || body.insurance_number || body.insurancecompany || body.insurancenumber) {
        const insuranceQuery = `
          INSERT INTO patient_insurance_information (
            patientid,
            insurancecompany,
            insurancenumber,
            createdat,
            updatedat
          ) VALUES ($1, $2, $3, NOW(), NOW())
        `;
        
        await client.query(insuranceQuery, [
          patientId,
          body.insurance_company || body.insurancecompany || null,
          body.insurance_number || body.insurancenumber || null
        ]);
        
        console.log('Insurance information saved');
      }

      // 4. Insert medical information if provided
      console.log('Checking medical fields:');
      console.log('- allergies:', body.allergies);
      console.log('- chronic_diseases:', body.chronic_diseases);
      console.log('- current_medications:', body.current_medications);
      console.log('- medical_history:', body.medical_history);
      
      const shouldInsertMedical = body.allergies || body.chronic_diseases || body.current_medications || body.medical_history;
      console.log('Should insert medical info:', shouldInsertMedical);
      
      if (shouldInsertMedical) {
        const medicalHistoryValue = (body.medical_history && body.medical_history.trim() !== '') ? body.medical_history : null;
        
        console.log('Medical history value type:', typeof body.medical_history);
        console.log('Medical history raw value:', body.medical_history);
        console.log('Medical history final value:', medicalHistoryValue);
        
        const medicalQuery = `
          INSERT INTO patient_medical_information (
            patientid,
            allergies,
            chronicdiseases,
            currentmedications,
            medicalhistory,
            createdat,
            updatedat
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `;
        
        try {
          await client.query(medicalQuery, [
            patientId,
            body.allergies || null,
            body.chronic_diseases || null,
            body.current_medications || null,
            medicalHistoryValue
          ]);
          
          console.log('✅ Medical information saved successfully with history:', medicalHistoryValue);
        } catch (medicalError) {
          console.error('❌ Error inserting medical information:', medicalError);
          throw medicalError;
        }
      } else {
        console.log('⚠️ No medical information to insert');
      }

      // Commit the transaction
      await client.query('COMMIT');

      // Transform the response data to match the expected format
      const responsePatient = {
        id: newPatient.patientid,
        patientid: newPatient.patientid,
        patient_number: newPatient.ehrid,
        patientNumber: newPatient.ehrid,
        first_name_ar: newPatient.firstname,
        firstname: newPatient.firstname,
        first_name_en: newPatient.firstname,
        middle_name: newPatient.middlename,
        middlename: newPatient.middlename,
        last_name_ar: newPatient.lastname,
        lastname: newPatient.lastname,
        last_name_en: newPatient.lastname,
        full_name_ar: `${newPatient.firstname} ${newPatient.middlename || ''} ${newPatient.lastname}`.trim(),
        full_name_en: `${newPatient.firstname} ${newPatient.middlename || ''} ${newPatient.lastname}`.trim(),
        date_of_birth: newPatient.dateofbirth,
        dateofbirth: newPatient.dateofbirth,
        gender: newPatient.gender,
        blood_group: newPatient.bloodgroup,
        bloodgroup: newPatient.bloodgroup,
        national_id: newPatient.nationalid,
        nationalid: newPatient.nationalid,
        phone: newPatient.phone,
        email: newPatient.email,
        address: newPatient.address,
        governorate: newPatient.address,
        created_at: newPatient.createdat,
        createdat: newPatient.createdat
      };

      return NextResponse.json({
        success: true,
        patient: responsePatient,
        data: responsePatient,
        message: 'Patient and all related information created successfully'
      });

    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }

  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create patient',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required for update' },
        { status: 400 }
      );
    }

    console.log('Updating patient:', id, updateData);

    // Build the update query dynamically
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    // Map the fields to database columns (only existing columns, no duplicates)
    const fieldMapping: Record<string, string> = {
      first_name_ar: 'firstname',
      middle_name: 'middlename',
      last_name_ar: 'lastname',
      date_of_birth: 'dateofbirth',
      gender: 'gender',
      blood_group: 'bloodgroup',
      national_id: 'nationalid',
      phone: 'phone',
      email: 'email',
      governorate: 'address' // Map governorate to address column
    };

    // Separate different types of fields
    const insuranceFields: Record<string, any> = {};
    const emergencyFields: Record<string, any> = {};
    const medicalFields: Record<string, any> = {};
    const regularFields: Record<string, any> = {};
    const processedColumns = new Set<string>(); // Track which columns we've already set
    
    for (const [field, value] of Object.entries(updateData)) {
      if (field.includes('insurance') || field.includes('appointment')) {
        insuranceFields[field] = value;
      } else if (field.includes('emergency')) {
        emergencyFields[field] = value;
      } else if (['allergies', 'chronic_diseases', 'current_medications', 'medical_history'].includes(field)) {
        medicalFields[field] = value;
      } else if (fieldMapping[field]) {
        const dbColumn = fieldMapping[field];
        // Only add if we haven't already set this column
        if (!processedColumns.has(dbColumn)) {
          updateFields.push(`${dbColumn} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
          processedColumns.add(dbColumn);
        }
      }
    }

    // Add updatedat timestamp
    updateFields.push(`updatedat = NOW()`);
    
    // Add the WHERE condition parameter
    params.push(id);

    const query = `
      UPDATE patients 
      SET ${updateFields.join(', ')}
      WHERE patientid = $${paramIndex}
      RETURNING *
    `;

    console.log('Executing update query:', query);
    console.log('Parameters:', params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const updatedPatient = result.rows[0];

    // Handle emergency contact fields
    if (Object.keys(emergencyFields).length > 0) {
      try {
        const client = await pool.connect();
        
        // Check if emergency contact record exists
        const existingRecord = await client.query(
          'SELECT emergencycontactid FROM patient_emergency_contacts WHERE patientid = $1',
          [id]
        );
        
        if (existingRecord.rows.length > 0) {
          // Update existing record
          const updateQuery = `
            UPDATE patient_emergency_contacts 
            SET contactname = $1, contactphone = $2, updatedat = NOW()
            WHERE patientid = $3
          `;
          await client.query(updateQuery, [
            emergencyFields.emergency_contact || null,
            emergencyFields.emergency_phone || emergencyFields.emergency_contact_phone || null,
            id
          ]);
        } else {
          // Insert new record
          const insertQuery = `
            INSERT INTO patient_emergency_contacts (patientid, contactname, contactphone, createdat, updatedat)
            VALUES ($1, $2, $3, NOW(), NOW())
          `;
          await client.query(insertQuery, [
            id,
            emergencyFields.emergency_contact || null,
            emergencyFields.emergency_phone || emergencyFields.emergency_contact_phone || null
          ]);
        }
        
        client.release();
        console.log('Emergency contact data updated:', emergencyFields);
        
      } catch (emergencyError) {
        console.error('Error updating emergency contact data:', emergencyError);
      }
    }

    // Handle medical information fields
    if (Object.keys(medicalFields).length > 0) {
      try {
        const client = await pool.connect();
        
        // Check if medical information record exists
        const existingRecord = await client.query(
          'SELECT medicalinfoid FROM patient_medical_information WHERE patientid = $1',
          [id]
        );
        
        if (existingRecord.rows.length > 0) {
          // Update existing record
          const updateQuery = `
            UPDATE patient_medical_information 
            SET allergies = $1, chronicdiseases = $2, currentmedications = $3, medicalhistory = $4, updatedat = NOW()
            WHERE patientid = $5
          `;
          await client.query(updateQuery, [
            medicalFields.allergies || null,
            medicalFields.chronic_diseases || null,
            medicalFields.current_medications || null,
            (medicalFields.medical_history && medicalFields.medical_history.trim() !== '') ? medicalFields.medical_history : null,
            id
          ]);
        } else {
          // Insert new record
          const insertQuery = `
            INSERT INTO patient_medical_information (patientid, allergies, chronicdiseases, currentmedications, medicalhistory, createdat, updatedat)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `;
          await client.query(insertQuery, [
            id,
            medicalFields.allergies || null,
            medicalFields.chronic_diseases || null,
            medicalFields.current_medications || null,
            (medicalFields.medical_history && medicalFields.medical_history.trim() !== '') ? medicalFields.medical_history : null
          ]);
        }
        
        client.release();
        console.log('Medical information data updated:', medicalFields);
        
      } catch (medicalError) {
        console.error('Error updating medical information data:', medicalError);
      }
    }

    // Transform the response data
    const responsePatient = {
      id: updatedPatient.patientid,
      patientid: updatedPatient.patientid,
      patient_number: updatedPatient.ehrid,
      first_name_ar: updatedPatient.firstname,
      first_name_en: updatedPatient.firstname,
      middle_name: updatedPatient.middlename,
      last_name_ar: updatedPatient.lastname,
      last_name_en: updatedPatient.lastname,
      full_name_ar: `${updatedPatient.firstname} ${updatedPatient.middlename || ''} ${updatedPatient.lastname}`.trim(),
      full_name_en: `${updatedPatient.firstname} ${updatedPatient.middlename || ''} ${updatedPatient.lastname}`.trim(),
      date_of_birth: updatedPatient.dateofbirth,
      gender: updatedPatient.gender,
      blood_group: updatedPatient.bloodgroup,
      national_id: updatedPatient.nationalid,
      phone: updatedPatient.phone,
      email: updatedPatient.email,
      governorate: updatedPatient.address,
      created_at: updatedPatient.createdat
    };

    return NextResponse.json({
      success: true,
      patient: responsePatient,
      data: responsePatient,
      message: 'Patient updated successfully'
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update patient',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required for deletion' },
        { status: 400 }
      );
    }

    console.log('Deleting patient:', id);

    const query = 'DELETE FROM patients WHERE patientid = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('Patient deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete patient',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
