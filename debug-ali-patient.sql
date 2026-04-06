-- Check ALI id 2 Azziz id 2 Smith patient data
SELECT 
    patientid,
    firstname,
    middlename,
    lastname,
    workspaceid,
    ehrid,
    nationalid,
    createdat
FROM patients
WHERE (firstname ILIKE '%ALI%' OR firstname ILIKE '%Azziz%')
   AND (lastname ILIKE '%Smith%' OR lastname ILIKE '%id%')
ORDER BY createdat DESC;

-- Test if this EHR ID exists in OpenEHR
-- You can test this by running: 
-- GET https://your-ehrbase-url/ehrbase/rest/openehr/v1/ehr/d79d318e-fb29-4462-9752-79f623c0f52e
