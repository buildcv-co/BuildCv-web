#!/usr/bin/env bash
# scripts/constitution-check.sh — Automated audit against BuildCv Constitution v1.0.0
# Returns: JSON-ish report of compliance per article (I-IX)
# Exits: 0 if all pass, 1 if any CRITICAL violation

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")/..")"

CONSTITUTION="BuildCv-api/.specify/memory/constitution.md"

# Colors
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi

CRITICAL=false
CRITICAL_COUNT=0
WARNINGS=0
PASSES=0

heading() { printf "\n${BLUE}═══ %s ═══${NC}\n" "$1"; }
ok()      { printf "  ${GREEN}✓${NC} %s\n" "$1"; PASSES=$((PASSES+1)); }
warn()    { printf "  ${YELLOW}⚠${NC} %s\n" "$1"; WARNINGS=$((WARNINGS+1)); }
fail()    { printf "  ${RED}✗ CRITICAL${NC} %s\n" "$1"; CRITICAL=true; CRITICAL_COUNT=$((CRITICAL_COUNT+1)); }

# Verify constitution exists
if [ ! -f "$CONSTITUTION" ]; then
  fail "Constitution not found at $CONSTITUTION"
  exit 1
fi

VERSION=$(grep -oE 'Versión\*\*: [0-9.]+' "$CONSTITUTION" | head -1 | sed 's/.*: //')
[ -z "$VERSION" ] && VERSION=$(grep -oE 'Versión: [0-9.]+' "$CONSTITUTION" | head -1 | awk '{print $2}')
echo "Constitution v$VERSION (BuildCv) — auto-audit"
echo "Working dir: $(pwd)"

# =============================================================
# Art. I — Cero invención (IA)
# =============================================================
heading "Art. I — Cero invención (IA adaptation)"

# If M1-IA not implemented yet, this is informational
if grep -rq "IAiClient\|Claude.*API\|OpenAI\|Anthropic" BuildCv-api/src --include="*.cs" 2>/dev/null; then
  if grep -rq "CrossEntityValidator\|EntityInvention" BuildCv-api/src --include="*.cs" 2>/dev/null; then
    ok "IA client + CrossEntityValidator found (Art. I post-validation active)"
  else
    fail "Art. I: AI client exists but no CrossEntityValidator found"
  fi
else
  ok "No AI client yet (M1-IA) — Art. I not applicable to v0"
fi

# =============================================================
# Art. II — Puntaje determinista y explicable
# =============================================================
heading "Art. II — Puntaje determinista"

if [ -f "BuildCv-api/src/BuildCv.Domain/Scoring/ScoringEngine.cs" ]; then
  ok "ScoringEngine exists in Domain"
  # Verify it has EngineVersion
  if grep -q "EngineVersion" BuildCv-api/src/BuildCv.Domain/Scoring/ScoreResult.cs 2>/dev/null; then
    ok "EngineVersion sealed in ScoreResult"
  else
    fail "Art. II: EngineVersion not sealed in ScoreResult"
  fi
else
  warn "ScoringEngine not yet implemented"
fi

# Verify no LLM in the score path
if grep -rq "CalculateScore\|ComputeScore" BuildCv-api/src --include="*.cs" 2>/dev/null; then
  if grep -rq "ChatClient\|AnthropicClient\|OpenAIClient" BuildCv-api/src/BuildCv.Domain --include="*.cs" 2>/dev/null; then
    fail "Art. II: LLM client found in Domain (scoring path) — CRITICAL VIOLATION"
  else
    ok "No LLM client in Domain (scoring is pure C#)"
  fi
fi

# =============================================================
# Art. III — Privacidad primero
# =============================================================
heading "Art. III — Privacidad"

# Check for any persistence
if grep -rq "DbContext\|EntityFramework\|SaveChanges" BuildCv-api/src --include="*.cs" 2>/dev/null; then
  fail "Art. III: persistence layer found (v0 must not persist CV/job)"
else
  ok "No persistence layer (v0 mandate respected)"
fi

# Check for any telemetry to third parties
if grep -rq "GoogleAnalytics\|Mixpanel\|Sentry\|PostHog\|applicationinsights" BuildCv-web --include="*.ts" --include="*.tsx" 2>/dev/null; then
  fail "Art. III: third-party telemetry found in web"
else
  ok "No third-party telemetry in web"
fi

# Check for CV logging (Art. III MUST NOT log CV content)
if grep -rE 'LogInformation.*\{Cv\}|LogInformation.*\{Job\}|console\.log.*cvText|console\.log.*jobText' \
  BuildCv-api/src BuildCv-web/app BuildCv-web/components BuildCv-web/lib \
  --include="*.cs" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".disabled" | grep -q .; then
  fail "Art. III: PII (CV/job) found in logs/console"
else
  ok "No CV/job content in logs"
fi

# Check for localStorage with CV
if grep -rE 'localStorage.*cv|localStorage\.setItem.*cvText|localStorage.*jobText' \
  BuildCv-web --include="*.ts" --include="*.tsx" 2>/dev/null | grep -q .; then
  fail "Art. III: CV/job found in localStorage"
else
  ok "No CV/job in localStorage"
fi

# =============================================================
# Art. IV — Encuadre honesto
# =============================================================
heading "Art. IV — Encuadre honesto"

# Check for forbidden phrases in copy (excluding negation contexts)
FORBIDDEN_HITS=$(grep -rEn "ATS oficial|empleo garantizado|garantiza que|puntaje oficial" \
  BuildCv-web/lib BuildCv-web/app BuildCv-web/components \
  --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v ".disabled" \
  | grep -v "node_modules" \
  | grep -vE "no es|ni |No es" \
  | wc -l)

if [ "$FORBIDDEN_HITS" -gt 0 ]; then
  fail "Art. IV: forbidden phrases found ($FORBIDDEN_HITS hits)"
  grep -rEn "ATS oficial|empleo garantizado|garantiza que|puntaje oficial" \
    BuildCv-web/lib BuildCv-web/app BuildCv-web/components \
    --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
else
  ok "No forbidden phrases in copy"
fi

# Check that the honest framing is present
if grep -rq "coincidencia con la vacante\|coincidencia y legibilidad" BuildCv-web/lib/copy --include="*.ts" 2>/dev/null; then
  ok "Honest framing present in copy"
else
  warn "Honest framing not found in lib/copy/es.ts"
fi

# =============================================================
# Art. V — Entrada como dato (prompt-injection defense)
# =============================================================
heading "Art. V — Entrada como dato"

# XSS check in web (exclude node_modules, tests, and comments documenting absence)
# El check busca uso real de dangerouslySetInnerHTML, no menciones en tests/comentarios.
DANGEROUSLY_HITS=$(grep -rE "dangerouslySetInnerHTML" BuildCv-web \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=coverage \
  --exclude="*.test.tsx" --exclude="*.test.ts" 2>/dev/null \
  | grep -vE "^\s*(/\*|\*|//|export const NUNCA|USE THIS|dangerouslySetInnerHTML.*(nunca|NUNCA|prohibido|prohibited|defense))" \
  | grep -E "dangerouslySetInnerHTML" \
  | grep -vE "nunca|NUNCA|prohibido|prohibited" \
  || true)
if [ -n "$DANGEROUSLY_HITS" ]; then
  HIT_COUNT=$(echo "$DANGEROUSLY_HITS" | wc -l)
  fail "Art. V: dangerouslySetInnerHTML used in $HIT_COUNT location(s) — XSS + prompt-injection risk"
  echo "$DANGEROUSLY_HITS" | head -5
else
  ok "No dangerouslySetInnerHTML in web (XSS-safe, tests/comments excluded)"
fi

# Check for topes de tamaño
if grep -q "MaximumLength" BuildCv-api/src/BuildCv.Application/Features/Scoring/ScoreCvValidator.cs 2>/dev/null; then
  ok "Input size limits in validator (Art. V)"
else
  warn "No MaximumLength in ScoreCvValidator (size limits missing)"
fi

# Nonce blocks (M1)
if grep -rq "IAiClient\|Adapt" BuildCv-api/src --include="*.cs" 2>/dev/null; then
  if ! grep -rq "nonce\|DATA nonce" BuildCv-api/src --include="*.cs" 2>/dev/null; then
    fail "Art. V: AI flow exists but no nonce blocks for prompt-injection defense"
  fi
fi

# =============================================================
# Art. VI — Clean Architecture (.NET)
# =============================================================
heading "Art. VI — Clean Architecture"

# Domain purity (no packages, no project refs)
if [ -d "BuildCv-api/src/BuildCv.Domain" ]; then
  PKG_REFS=$(cd BuildCv-api && dotnet list src/BuildCv.Domain package 2>/dev/null | grep -E '^\s*>' | grep -v 'There are no' | wc -l | tr -d ' ')
  PROJ_REFS=$(cd BuildCv-api && dotnet list src/BuildCv.Domain reference 2>/dev/null | grep -E '^\s*>' | grep -v 'There are no' | wc -l | tr -d ' ')
  if [ "$PKG_REFS" = "0" ] && [ "$PROJ_REFS" = "0" ]; then
    ok "Domain is PURE (0 packages, 0 project refs)"
  else
    fail "Art. VI: Domain has $PKG_REFS packages and $PROJ_REFS project refs — must be 0"
  fi
else
  warn "BuildCv-api/src/BuildCv.Domain not found"
fi

# Frontend BFF check
if grep -rq "BACKEND_URL" BuildCv-web/lib/api 2>/dev/null; then
  ok "BFF pattern: BACKEND_URL abstracted in lib/api/"
else
  warn "No BACKEND_URL abstraction in lib/api/"
fi

# Direct backend access from browser (check for NEXT_PUBLIC_BACKEND_URL or fetch to absolute URLs)
if grep -rE "NEXT_PUBLIC_BACKEND_URL|fetch\(['\"]http://localhost:5080" BuildCv-web/components --include="*.tsx" 2>/dev/null | grep -q .; then
  fail "Art. VI: browser is talking directly to backend (NEXT_PUBLIC_BACKEND_URL or absolute URL in components/)"
else
  ok "Browser does NOT talk directly to backend"
fi

# =============================================================
# Art. VII — v0 sin fricción
# =============================================================
heading "Art. VII — v0 sin fricción"

# No auth in v0
if grep -rEq "AddAuthentication|AddAuthorization|JwtBearer|UseAuthentication" BuildCv-api/src/BuildCv.Api --include="*.cs" 2>/dev/null; then
  fail "Art. VII: auth middleware found (v0 must be no-auth)"
else
  ok "No auth middleware (v0 mandate)"
fi

# Rate limit exists
if grep -q "AddRateLimiter\|RequireRateLimiting" BuildCv-api/src/BuildCv.Api --include="*.cs" -r 2>/dev/null; then
  ok "Rate limiting implemented"
else
  warn "No rate limiting configured"
fi

# =============================================================
# Art. VIII — TDD
# =============================================================
heading "Art. VIII — TDD"

# Test projects exist
TEST_COUNT=$(find BuildCv-api/tests -name "*.csproj" 2>/dev/null | wc -l)
if [ "$TEST_COUNT" -ge 1 ]; then
  ok "Test projects present ($TEST_COUNT)"
else
  fail "Art. VIII: no test projects found"
fi

# No [Skip] in tests
SKIP_HITS=$(grep -rE "\[Skip\(|\[Skip\]|Fact\(DisplayName.*Skip" BuildCv-api/tests --include="*.cs" 2>/dev/null | wc -l)
if [ "$SKIP_HITS" -gt 0 ]; then
  fail "Art. VIII: $SKIP_HITS [Skip] attributes in tests (Constitution: 0 supresiones)"
else
  ok "No [Skip] in tests (0 supresiones)"
fi

# Test count
TEST_FILES=$(find BuildCv-api/tests -name "*Tests.cs" -not -path "*/obj/*" -not -path "*/bin/*" 2>/dev/null | wc -l)
echo "  ℹ Test files: $TEST_FILES"

# =============================================================
# Art. IX — Habeas Data (v1 gate)
# =============================================================
heading "Art. IX — Habeas Data (v1 gate)"

if [ -d "BuildCv-api/src/BuildCv.Domain/Payments" ] || [ -d "BuildCv-api/src/BuildCv.Infrastructure/Payments" ] 2>/dev/null; then
  warn "Payments layer detected — verify Art. IX compliance (ZDR gate, server-side payment confirmation)"
else
  ok "v0: no payments — Art. IX not applicable"
fi

# =============================================================
# Final summary
# =============================================================
echo ""
printf "${BLUE}════════════════════════════════════════════${NC}\n"
printf "${BLUE}CONSTITUTION AUDIT — v%s${NC}\n" "$VERSION"
printf "${BLUE}════════════════════════════════════════════${NC}\n"
printf "Passes:    ${GREEN}%d${NC}\n" "$PASSES"
printf "Warnings:  ${YELLOW}%d${NC}\n" "$WARNINGS"
printf "Critical:  ${RED}%d${NC}\n" "$CRITICAL_COUNT"
echo ""

if [ "$CRITICAL" = true ]; then
  printf "%sFAIL: CONSTITUTION VIOLATIONS FOUND%s\n" "$RED" "$NC"
  printf "Fix all CRITICAL items before merging. Each one cites the article.\n"
  exit 1
else
  if [ "$WARNINGS" -gt 0 ]; then
    printf "%sWARN: NO CRITICAL VIOLATIONS but %d warnings%s\n" "$YELLOW" "$WARNINGS" "$NC"
  else
    printf "%sOK: ALL CLEAR, Constitution satisfied%s\n" "$GREEN" "$NC"
  fi
  exit 0
fi

# Final exit to make sure shell sees end of file
exit $?
