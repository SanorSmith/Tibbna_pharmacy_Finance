curl -X GET  \
  "https://base.tibbna.com/ehrbase/rest/openehr/v1/ehr/60fb6d3f-3538-47e6-ab17-91890ce21f75/composition/367e5056-883c-459d-9963-93294d80a79c::local.ehrbase.org::1?format=FLAT" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Accept: application/json"


curl -X POST "https://base.tibbna.com/ehrbase/rest/openehr/v1/query/aql" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '\''60fb6d3f-3538-47e6-ab17-91890ce21f75'\'' ORDER BY c/context/start_time/value DESC"
  }' | jq '.rows'

curl -X GET  \
  "https://base.tibbna.com/ehrbase/rest/openehr/v1/ehr/60fb6d3f-3538-47e6-ab17-91890ce21f75/composition/f84a65d4-c6d5-4129-9627-3a335cf1081e::local.ehrbase.org::1?format=FLAT" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Accept: application/json"
