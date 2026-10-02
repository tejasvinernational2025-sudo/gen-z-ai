#!/usr/bin/env bash
set -u
BASE="https://genzstudy.in"
BODY='{"action":"generate_quiz","subject":"Science","topic":"Cellular respiration","studentContext":"Tamil Nadu Board (DGE Tamil Nadu) | Class 10 | Telugu Medium","language":"తెలుగు — Telugu","difficulty":"easy"}'
status=$(curl -sS --max-time 45 -o response.json -w "%{http_code}" -X POST "$BASE/api/practice" -H "Content-Type: application/json" --data "$BODY")
echo "HTTP $status"
cat response.json
echo
test "$status" = "200"
