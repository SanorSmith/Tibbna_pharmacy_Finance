curl -X GET "https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4/template_clinical_encounter_v2/example?format=FLAT" \
  -H "Accept: application/json" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)"

curl -X GET "https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4/template_radiology_report_v1/example?format=FLAT" \
  -H "Accept: application/json" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)"

curl -X GET "https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4/template_care_plan_v1/example?format=FLAT" \
  -H "Accept: application/json" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)"

curl -X GET "https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4/template_laboratory_report_v2/example?format=FLAT" \
  -H "Accept: application/json" \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)"


