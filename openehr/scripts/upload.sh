curl -X POST http://164.92.228.152/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "Authorization: Basic $(echo -n 'user:password' | base64)" \
  -H "Content-Type: application/xml" \
  --data-binary @openehr/templates/clinical_encounter_v1.opt
