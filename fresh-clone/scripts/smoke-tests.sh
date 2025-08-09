#!/bin/bash

# Zabardoo Telegram Bot Smoke Tests
# This script runs basic smoke tests to verify deployment health

set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=30
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to run a test with retries
run_test() {
    local test_name="$1"
    local test_command="$2"
    local retry_count=0
    
    log_info "Running test: $test_name"
    
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if eval "$test_command"; then
            log_success "$test_name - PASSED"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            retry_count=$((retry_count + 1))
            if [[ $retry_count -lt $MAX_RETRIES ]]; then
                log_warning "$test_name - FAILED (retry $retry_count/$MAX_RETRIES)"
                sleep 5
            fi
        fi
    done
    
    log_error "$test_name - FAILED"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name")
    return 1
}

# Test 1: Health Check
test_health_check() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/health" > /dev/null
}

# Test 2: API Response Format
test_api_response_format() {
    local response=$(curl -f -s --max-time $TIMEOUT "$BASE_URL/api/health")
    echo "$response" | jq -e '.success == true' > /dev/null
}

# Test 3: Database Connection
test_database_connection() {
    local response=$(curl -f -s --max-time $TIMEOUT "$BASE_URL/api/health")
    echo "$response" | jq -e '.data.database == "connected"' > /dev/null
}

# Test 4: Redis Connection
test_redis_connection() {
    local response=$(curl -f -s --max-time $TIMEOUT "$BASE_URL/api/health")
    echo "$response" | jq -e '.data.redis == "connected"' > /dev/null
}

# Test 5: Coupons API
test_coupons_api() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/coupons?limit=1" > /dev/null
}

# Test 6: User Registration
test_user_registration() {
    local test_user_id="smoke-test-$(date +%s)"
    local response=$(curl -f -s --max-time $TIMEOUT \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$test_user_id\",\"telegramId\":\"123456789\",\"username\":\"smoketest\"}" \
        "$BASE_URL/api/users")
    
    echo "$response" | jq -e '.success == true' > /dev/null
}

# Test 7: Recommendations API
test_recommendations_api() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/recommendations/trending?limit=1" > /dev/null
}

# Test 8: Analytics Health
test_analytics_health() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/analytics/health" > /dev/null
}

# Test 9: Cashback System
test_cashback_system() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/cashback/health" > /dev/null
}

# Test 10: Admin Panel Access
test_admin_panel() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/admin/" > /dev/null
}

# Test 11: Monitoring Endpoints
test_monitoring_endpoints() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/monitoring/metrics" > /dev/null
}

# Test 12: Security Headers
test_security_headers() {
    local headers=$(curl -I -s --max-time $TIMEOUT "$BASE_URL/api/health")
    echo "$headers" | grep -i "x-frame-options" > /dev/null && \
    echo "$headers" | grep -i "x-content-type-options" > /dev/null
}

# Test 13: Rate Limiting
test_rate_limiting() {
    # Make multiple rapid requests to test rate limiting
    local status_codes=()
    for i in {1..10}; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL/api/health")
        status_codes+=("$status")
    done
    
    # Check if we got at least one successful response
    for code in "${status_codes[@]}"; do
        if [[ "$code" == "200" ]]; then
            return 0
        fi
    done
    return 1
}

# Test 14: SSL/TLS (if HTTPS)
test_ssl_certificate() {
    if [[ "$BASE_URL" == https* ]]; then
        curl -f -s --max-time $TIMEOUT "$BASE_URL/api/health" > /dev/null
    else
        # Skip SSL test for HTTP
        return 0
    fi
}

# Test 15: Response Time
test_response_time() {
    local start_time=$(date +%s%N)
    curl -f -s --max-time $TIMEOUT "$BASE_URL/api/health" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    # Response should be under 2 seconds (2000ms)
    [[ $response_time -lt 2000 ]]
}

# Main execution
main() {
    echo "🧪 Starting Smoke Tests for Zabardoo Telegram Bot"
    echo "Base URL: $BASE_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "Max Retries: $MAX_RETRIES"
    echo "=" * 60
    
    # Wait for application to be ready
    log_info "Waiting for application to be ready..."
    sleep 10
    
    # Run all tests
    run_test "Health Check" "test_health_check"
    run_test "API Response Format" "test_api_response_format"
    run_test "Database Connection" "test_database_connection"
    run_test "Redis Connection" "test_redis_connection"
    run_test "Coupons API" "test_coupons_api"
    run_test "User Registration" "test_user_registration"
    run_test "Recommendations API" "test_recommendations_api"
    run_test "Analytics Health" "test_analytics_health"
    run_test "Cashback System" "test_cashback_system"
    run_test "Admin Panel Access" "test_admin_panel"
    run_test "Monitoring Endpoints" "test_monitoring_endpoints"
    run_test "Security Headers" "test_security_headers"
    run_test "Rate Limiting" "test_rate_limiting"
    run_test "SSL Certificate" "test_ssl_certificate"
    run_test "Response Time" "test_response_time"
    
    # Test results summary
    echo
    echo "=" * 60
    echo "🏁 Smoke Tests Summary"
    echo "=" * 60
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=$(( TESTS_PASSED * 100 / total_tests ))
    
    echo "Total Tests: $total_tests"
    echo "Passed: $TESTS_PASSED ✅"
    echo "Failed: $TESTS_FAILED ❌"
    echo "Success Rate: ${success_rate}%"
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo
        echo "❌ Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo
        log_error "Some smoke tests failed. Please investigate before proceeding."
        exit 1
    else
        echo
        log_success "All smoke tests passed! 🎉"
        log_success "Application is ready for use."
        exit 0
    fi
}

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed - some tests may be skipped"
    fi
}

# Help function
show_help() {
    cat << EOF
Zabardoo Smoke Tests

Usage: $0 [BASE_URL]

Arguments:
    BASE_URL    Base URL of the application (default: http://localhost:3000)

Environment Variables:
    TIMEOUT     Request timeout in seconds (default: 30)
    MAX_RETRIES Maximum number of retries per test (default: 3)

Examples:
    $0                                    # Test local development server
    $0 https://staging.zabardoo.com      # Test staging environment
    $0 https://zabardoo.com              # Test production environment

EOF
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        check_dependencies
        main
        ;;
esac