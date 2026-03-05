curl -X POST https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Content-Type: application/xml" \
  --data-binary @template_clinical_encounter_v2.opt

curl -X POST https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Content-Type: application/xml" \
  --data-binary @template_radiology_report_v1.opt

curl -X POST https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Content-Type: application/xml" \
  --data-binary @template_care_plan_v1.opt

curl -X POST https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Content-Type: application/xml" \
  --data-binary @template_laboratory_report_v2.opt

curl -X POST https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Content-Type: application/xml" \
  --data-binary @template_referral_v1.opt
