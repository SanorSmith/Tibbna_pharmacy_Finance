#!/bin/bash

echo "Testing actual API call for sample..."
echo ""

# Test the actual API endpoint
curl -s "http://localhost:3000/api/d/fa9fb036-a7eb-49af-890c-54406dad139d/accession-samples/b5822be2-9f4c-429f-ab1a-093583abd9e2" \
  -H "Cookie: $(cat ~/.iqmed-session-cookie 2>/dev/null || echo '')" | jq '.'

echo ""
echo "Note: If you see 'Unauthorized', you need to be logged in to the app"
