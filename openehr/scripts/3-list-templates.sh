curl -X GET https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)"

curl -X GET http://localhost:8080/ehrbase/rest/openehr/v1/definition/template/adl1.4 \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)"
