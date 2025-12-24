#!/bin/bash

# Upload template_surgical_procedure_v1 to EHRBase
# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

TEMPLATE_FILE="openehr/templates/template_surgical_procedure_v1.opt"
EHRBASE_URL="${EHRBASE_URL:-https://base.tibbna.com}"
EHRBASE_USER="${EHRBASE_USER}"
EHRBASE_PASSWORD="${EHRBASE_PASSWORD}"
EHRBASE_API_KEY="${EHRBASE_API_KEY}"

echo "Uploading surgical procedure template to EHRBase..."
echo "URL: $EHRBASE_URL/ehrbase/rest/openehr/v1/definition/template/adl1.4"

curl -X POST \
  "$EHRBASE_URL/ehrbase/rest/openehr/v1/definition/template/adl1.4" \
  -H "Content-Type: application/xml" \
  -H "X-API-Key: $EHRBASE_API_KEY" \
  -H "Authorization: Basic $(echo -n "$EHRBASE_USER:$EHRBASE_PASSWORD" | base64)" \
  --data-binary @"$TEMPLATE_FILE" \
  -v

echo ""
echo "Template upload complete!"
