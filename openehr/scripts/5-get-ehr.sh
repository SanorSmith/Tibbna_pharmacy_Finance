curl -X GET https://base.tibbna.com/ehrbase/rest/openehr/v1/ehr/60fb6d3f-3538-47e6-ab17-91890ce21f75 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Accept: application/json"


curl -X POST "https://base.tibbna.com/ehrbase/rest/openehr/v1/query/aql" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "SELECT e/ehr_id/value AS ehr_id, e/ehr_status/subject/external_ref/id/value AS subject_id, e/time_created/value AS created_time FROM EHR e"
  }' | jq '.rows'
