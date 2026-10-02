#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://genzstudy.in}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; exit 1; }

request() {
  local method="$1"
  local path="$2"
  local outfile="$3"
  shift 3
  curl -sS --location --max-time 45 -X "$method" "$BASE_URL$path" -o "$outfile" -w "%{http_code}" "$@"
}

expect_status() {
  local label="$1"
  local method="$2"
  local path="$3"
  local expected="$4"
  shift 4
  local body="$TMP_DIR/body-$(echo "$label" | tr ' /' '__')"
  local status
  status="$(request "$method" "$path" "$body" "$@")"
  if [[ "$status" != "$expected" ]]; then
    echo "Unexpected HTTP $status for $method $path"
    head -c 800 "$body" || true
    echo
    fail "$label"
  fi
  pass "$label (HTTP $status)"
  LAST_BODY="$body"
}

echo "Production smoke test: $BASE_URL"

expect_status "Homepage" GET "/" 200
grep -qi "Gen-z AI" "$LAST_BODY" || fail "Homepage branding"
pass "Homepage branding"

expect_status "Privacy page" GET "/privacy" 200
expect_status "Terms page" GET "/terms" 200
expect_status "Refund page" GET "/refund" 200
expect_status "Reviewer login page" GET "/reviewer-login" 200
grep -qi "reviewer" "$LAST_BODY" || fail "Reviewer login content"
pass "Reviewer login content"

expect_status "Payment config" GET "/api/payments/config" 200
node - "$LAST_BODY" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (data.live !== true || data.ready !== true) {
  console.error(data);
  process.exit(1);
}
const plans = Array.isArray(data.plans) ? data.plans : [];
const student = plans.find((p) => p.id === "student");
const plus = plans.find((p) => p.id === "student_plus");
if (!student || student.amount !== 9900 || !plus || plus.amount !== 19900) {
  console.error(plans);
  process.exit(1);
}
NODE
pass "Payment config live + ₹99/₹199 plans"

expect_status "Progress auth guard" GET "/api/progress" 401
expect_status "Revision auth guard" GET "/api/revision" 401
expect_status "Study sources auth guard" GET "/api/sources" 401
expect_status "Practice guest status" GET "/api/practice" 200
node - "$LAST_BODY" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (data.signedIn !== false || data.performance !== null) process.exit(1);
NODE
pass "Practice guest response"

expect_status "Sample PDF" GET "/api/sample-pdf" 200
head -c 4 "$LAST_BODY" | grep -q "%PDF" || fail "Sample PDF signature"
cp "$LAST_BODY" "$TMP_DIR/sample.pdf"
pass "Sample PDF signature"

cat > "$TMP_DIR/chat.json" <<'JSON'
{"messages":[{"role":"user","content":"Production smoke test: what is 2 + 2? Answer in one short sentence."}],"language":"English","mode":"chat","studentContext":"General"}
JSON
expect_status "AI chat" POST "/api/chat" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/chat.json"
[[ "$(wc -c < "$LAST_BODY")" -gt 2 ]] || fail "AI chat non-empty response"
pass "AI chat non-empty response"

cat > "$TMP_DIR/photo.json" <<'JSON'
{"imageDataUrl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAACACAIAAABr1yBdAAAC1ElEQVR4nO3ZsUojYRiG0TFuKRiwsbFUBmyUKNhoOju7gNjZSUC9Aq9Fb8BSLKwsLKxtNGAtEggIqTVbLCziyhI3kVnynlNNMvORr3n4YTI1GAwKSFWregGokgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiVRnA6enp5ubmysrK1dXVd4zc3NxsbGw0Go2Li4vRNmVyDSrS7Xa3trZeX1/v7+/LsvyOkdXV1U6n8/T0tLi4OPK+TKbKToBer3d4eFir1RYWFnq93p8P1Ov1r458cHx8vLS0NDc31+/3x7Izk+dHVT9clmVZlkVRnJ+f7+zsjDLS6XQODg5+f7y+vv51sb+/XxTF3d3d+vr62PZmwlR7AD0+Pi4vL3e73fdfttvtZrM5PT3dbDbb7fYwI39xcnJyeXk5nnWZOFUG0O/3G43G7e3tp3dnZ2eHHHl4eGi+82Fkd3f37e1tPBszcaYGg0FVJ0+r1Wq1Wnt7e58+UK/XX15evjTyqefn5/n5+VFWZYJVFsDZ2dnR0dHa2lpRFDMzM8O8qfyHkaIotre3h3/NSprKAoD/gX+CiSYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIgmgCIJgCiCYBoPwGpgiIF7xc4lgAAAABJRU5ErkJggg==","prompt":"Production smoke test: answer 2 + 2 briefly. The tiny image is only a test attachment.","language":"English","mode":"explain","studentContext":"General"}
JSON
expect_status "Photo Solve" POST "/api/photo-solve" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/photo.json"
node - "$LAST_BODY" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!data.reply || String(data.reply).trim().length < 2) {
  console.error(data);
  process.exit(1);
}
NODE
pass "Photo Solve reply"

node - "$TMP_DIR/sample.pdf" "$TMP_DIR/pdf.json" <<'NODE'
const fs = require("fs");
const input = fs.readFileSync(process.argv[2]);
const payload = {
  pdfDataUrl: "data:application/pdf;base64," + input.toString("base64"),
  prompt: "Production smoke test: summarize this PDF in one short sentence.",
  language: "English",
  mode: "notes",
  studentContext: "General"
};
fs.writeFileSync(process.argv[3], JSON.stringify(payload));
NODE
expect_status "PDF Study" POST "/api/pdf-study" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/pdf.json"
node - "$LAST_BODY" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!data.reply || String(data.reply).trim().length < 2) {
  console.error(data);
  process.exit(1);
}
NODE
pass "PDF Study reply"

cat > "$TMP_DIR/practice.json" <<'JSON'
{"action":"generate","sourceQuestion":"Solve 2x + 3 = 11","sourceAnswer":"Subtract 3 to get 2x=8, then divide by 2, so x=4.","studentContext":"Class 8","language":"English","subject":"Mathematics","topic":"Linear equations","difficulty":"easy"}
JSON
expect_status "Adaptive practice generation" POST "/api/practice" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/practice.json"
node - "$LAST_BODY" "$TMP_DIR/practice-grade.json" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!data.ok || !Array.isArray(data.questions) || data.questions.length !== 3) {
  console.error(data);
  process.exit(1);
}
const q = data.questions[0];
fs.writeFileSync(process.argv[3], JSON.stringify({
  action: "grade",
  question: q.question,
  studentAnswer: q.expectedAnswer,
  expectedAnswer: q.expectedAnswer,
  subject: data.subject,
  topic: data.topic,
  difficulty: q.difficulty,
  sourceType: "practice"
}));
NODE
pass "Adaptive practice 3-question pack"

expect_status "Adaptive practice grading" POST "/api/practice" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/practice-grade.json"
node - "$LAST_BODY" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!data.ok || typeof data.score !== "number") {
  console.error(data);
  process.exit(1);
}
NODE
pass "Adaptive practice grading response"

cat > "$TMP_DIR/quiz.json" <<'JSON'
{"action":"generate_quiz","subject":"Science","topic":"Photosynthesis","studentContext":"Class 7","language":"English","difficulty":"easy"}
JSON
expect_status "Adaptive quiz generation" POST "/api/practice" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/quiz.json"
node - "$LAST_BODY" "$TMP_DIR/quiz-grade.json" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!data.ok || !Array.isArray(data.questions) || data.questions.length !== 5) {
  console.error(data);
  process.exit(1);
}
const q = data.questions[0];
fs.writeFileSync(process.argv[3], JSON.stringify({
  action: "grade_quiz",
  subject: data.subject,
  topic: data.topic,
  question: q.question,
  options: q.options,
  selectedIndex: q.correctIndex,
  correctIndex: q.correctIndex,
  explanation: q.explanation,
  difficulty: q.difficulty
}));
NODE
pass "Adaptive quiz 5-question pack"

expect_status "Adaptive quiz grading" POST "/api/practice" 200 -H "Content-Type: application/json" --data-binary @"$TMP_DIR/quiz-grade.json"
node - "$LAST_BODY" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!data.ok || data.correct !== true || data.score !== 100) {
  console.error(data);
  process.exit(1);
}
NODE
pass "Adaptive quiz grading"

echo
echo "All production smoke checks passed."
