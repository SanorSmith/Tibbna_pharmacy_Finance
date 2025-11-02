curl -X POST https://base.tibbna.com/ehrbase/rest/openehr/v1/ehr \
  -H "X-API-Key: BgMxGMZk5isfCWezE5CF" \
  -H "Authorization: Basic $(echo -n 'auto-speed-ranting:KivLWsQgN4f8aiHAvwuq' | base64)" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -H "Accept: application/json" \
  -d '{
        "archetype_node_id": "openEHR-EHR-EHR_STATUS.generic.v1",
        "name": { "value": "EHR Status" },
        "subject": {
          "_type": "PARTY_SELF",
          "external_ref": {
            "id": {
              "_type": "GENERIC_ID",
              "value": "19880101-1272",
              "scheme": "USER_ID"
            },
            "namespace": "HOSPITAL",
            "type": "PERSON"
          }
        },
        "is_queryable": true,
        "is_modifiable": true,
        "_type": "EHR_STATUS"
      }' | jq
