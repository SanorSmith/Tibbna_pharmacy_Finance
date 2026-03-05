#!/bin/bash

# Upload template_procedure_v1 to EHRBase
# Make sure EHRBASE_URL, EHRBASE_USER, and EHRBASE_PASSWORD are set in your .env

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

TEMPLATE_FILE="lib/openehr/templates/template_procedure_v1.opt"
EHRBASE_URL="${EHRBASE_URL:-https://base.tibbna.com}"
EHRBASE_USER="${EHRBASE_USER}"
EHRBASE_PASSWORD="${EHRBASE_PASSWORD}"

echo "Uploading template to EHRBase..."
echo "URL: $EHRBASE_URL/ehrbase/rest/openehr/v1/definition/template/adl1.4"

curl -X POST \
  "$EHRBASE_URL/ehrbase/rest/openehr/v1/definition/template/adl1.4" \
  -H "Content-Type: application/xml" \
  -H "Authorization: Basic $(echo -n "$EHRBASE_USER:$EHRBASE_PASSWORD" | base64)" \
  -d @"$TEMPLATE_FILE" \
  -v

echo ""
echo "Template upload complete!"
