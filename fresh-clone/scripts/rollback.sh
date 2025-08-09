#!/bin/bash

# Zabardoo Telegram Bot Rollback Script
# This script handles rollback operations for staging and production environments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Help function
show_help() {
    cat << EOF
Zabardoo Rollback Script

Usage: $0 [OPTIONS] ENVIRONMENT

ENVIRONMENTS:
    staging     Rollback staging environment
    production  Rollback production environment

OPTIONS:
    -h, --help              Show this help message
    -v, --version VERSION   Rollback to specific version
    -l, --list              List available versions for rollback
    -f, --force             Force rollback without confirmation
    --restore-db            Restore database from backup
    --dry-run              Show what would be rolled back without actually doing it

EXAMPLES:
    $0 production                       # Rollback to previous version
    $0 staging -v v1.2.0               # Rollback to specific version
    $0 production --list               # List available versions
    $0 production --restore-db         # Rollback with database restore

EOF
}

# Parse command line arguments
ENVIRONMENT=""
VERSION=""
LIST_VERSIONS=false
FORCE=false
RESTORE_DB=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -l|--list)
            LIST_VERSIONS=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --restore-db)
            RESTORE_DB=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    show_help
    exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Environment must be 'staging' or 'production'"
    exit 1
fi

# Load environment-specific configuration
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
if [[ -f "$ENV_FILE" ]]; then
    log_info "Loading environment configuration from $ENV_FILE"
    source "$ENV_FILE"
else
    log_warning "Environment file $ENV_FILE not found"
fi

# Set deployment configuration based on environment
case $ENVIRONMENT in
    staging)
        DEPLOY_HOST="${STAGING_HOST:-staging.zabardoo.com}"
        DEPLOY_USER="${STAGING_USER:-deploy}"
        DEPLOY_PATH="${STAGING_PATH:-/opt/zabardoo}"
        ;;
    production)
        DEPLOY_HOST="${PRODUCTION_HOST:-zabardoo.com}"
        DEPLOY_USER="${PRODUCTION_USER:-deploy}"
        DEPLOY_PATH="${PRODUCTION_PATH:-/opt/zabardoo}"
        ;;
esac

# Function to get available versions
get_available_versions() {
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
        cd /opt/zabardoo
        
        echo "Available Docker images:"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep zabardoo/telegram-bot | head -10
        
        echo -e "\nAvailable database backups:"
        if [[ -d backups ]]; then
            ls -la backups/*.sql 2>/dev/null | tail -10 || echo "No database backups found"
        else
            echo "No backup directory found"
        fi
        
        echo -e "\nCurrent deployment log:"
        if [[ -f deployment.log ]]; then
            tail -5 deployment.log || echo "No deployment log found"
        else
            echo "No deployment log found"
        fi
EOF
}

# List versions if requested
if [[ "$LIST_VERSIONS" == true ]]; then
    log_info "Available versions for rollback:"
    get_available_versions
    exit 0
fi

# Get current version
get_current_version() {
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
        cd /opt/zabardoo
        if [[ -f docker-compose.prod.yml ]]; then
            grep "image: zabardoo/telegram-bot:" docker-compose.prod.yml | head -1 | sed 's/.*zabardoo\/telegram-bot://' | sed 's/[[:space:]]*$//'
        else
            echo "unknown"
        fi
EOF
}

CURRENT_VERSION=$(get_current_version)
log_info "Current version: $CURRENT_VERSION"

# Determine target version for rollback
if [[ -z "$VERSION" ]]; then
    log_info "Getting previous version for rollback..."
    
    # Get the previous version from deployment log
    PREVIOUS_VERSION=$(ssh "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
        cd /opt/zabardoo
        if [[ -f deployment.log ]]; then
            # Get the second most recent successful deployment
            grep ",success$" deployment.log | tail -2 | head -1 | cut -d',' -f3
        fi
EOF
    )
    
    if [[ -z "$PREVIOUS_VERSION" ]]; then
        log_error "Cannot determine previous version for rollback"
        log_info "Available versions:"
        get_available_versions
        exit 1
    fi
    
    VERSION="$PREVIOUS_VERSION"
fi

log_info "Rollback Configuration:"
log_info "  Environment: $ENVIRONMENT"
log_info "  Current Version: $CURRENT_VERSION"
log_info "  Target Version: $VERSION"
log_info "  Host: $DEPLOY_HOST"
log_info "  Restore Database: $RESTORE_DB"

# Dry run mode
if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN MODE - No actual rollback will occur"
    log_info "Would rollback from $CURRENT_VERSION to $VERSION on $ENVIRONMENT"
    exit 0
fi

# Confirmation for production
if [[ "$ENVIRONMENT" == "production" && "$FORCE" != true ]]; then
    echo
    log_warning "You are about to ROLLBACK PRODUCTION!"
    log_warning "Current version: $CURRENT_VERSION"
    log_warning "Target version: $VERSION"
    if [[ "$RESTORE_DB" == true ]]; then
        log_warning "Database will also be restored!"
    fi
    echo
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
fi

# Pre-rollback checks
log_info "Running pre-rollback checks..."

# Check if we can connect to the deployment host
if ! ssh -o ConnectTimeout=10 "$DEPLOY_USER@$DEPLOY_HOST" "echo 'Connection test successful'" > /dev/null 2>&1; then
    log_error "Cannot connect to deployment host $DEPLOY_HOST"
    exit 1
fi

# Check if target version exists
VERSION_EXISTS=$(ssh "$DEPLOY_USER@$DEPLOY_HOST" "docker images -q zabardoo/telegram-bot:$VERSION")
if [[ -z "$VERSION_EXISTS" ]]; then
    log_error "Target version $VERSION not found on deployment host"
    log_info "Available versions:"
    get_available_versions
    exit 1
fi

# Create emergency backup before rollback
log_info "Creating emergency backup before rollback..."

EMERGENCY_BACKUP_NAME="emergency_rollback_backup_${ENVIRONMENT}_${TIMESTAMP}"

ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
    cd $DEPLOY_PATH
    
    # Create backup directory
    mkdir -p backups
    
    # Backup current database
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U \$POSTGRES_USER \$POSTGRES_DB > backups/${EMERGENCY_BACKUP_NAME}.sql
    
    # Backup current application data
    tar -czf backups/${EMERGENCY_BACKUP_NAME}_data.tar.gz uploads/ logs/ || true
    
    # Record current state
    echo "$TIMESTAMP,$ENVIRONMENT,$CURRENT_VERSION,pre_rollback_backup" >> rollback.log
EOF

log_success "Emergency backup created: $EMERGENCY_BACKUP_NAME"

# Restore database if requested
if [[ "$RESTORE_DB" == true ]]; then
    log_info "Restoring database from backup..."
    
    # Find the most recent backup for the target version
    DB_BACKUP=$(ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        cd $DEPLOY_PATH/backups
        # Look for backup files that match the target version or are recent
        ls -t *.sql 2>/dev/null | head -1
EOF
    )
    
    if [[ -z "$DB_BACKUP" ]]; then
        log_error "No database backup found for restoration"
        exit 1
    fi
    
    log_info "Using database backup: $DB_BACKUP"
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        cd $DEPLOY_PATH
        
        # Stop application to prevent database connections
        docker-compose -f docker-compose.prod.yml stop app
        
        # Restore database
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB < backups/$DB_BACKUP
        
        echo "Database restored from $DB_BACKUP"
EOF
    
    log_success "Database restored from backup"
fi

# Perform rollback
log_info "Performing rollback to version $VERSION..."

ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
    cd $DEPLOY_PATH
    
    # Update docker-compose to use target version
    sed -i "s|image: zabardoo/telegram-bot:.*|image: zabardoo/telegram-bot:$VERSION|g" docker-compose.prod.yml
    
    # Pull the target image (in case it's not local)
    docker pull zabardoo/telegram-bot:$VERSION || true
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down
    
    # Start services with target version
    docker-compose -f docker-compose.prod.yml up -d --remove-orphans
    
    # Wait for services to start
    echo "Waiting for services to start..."
    sleep 30
    
    # Check if services are healthy
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        echo "Services are running"
    else
        echo "Services failed to start"
        exit 1
    fi
EOF

# Post-rollback verification
log_info "Running post-rollback verification..."

# Wait for application to stabilize
sleep 15

# Check if the application is responding
MAX_RETRIES=5
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if curl -f "https://$DEPLOY_HOST/api/health" > /dev/null 2>&1; then
        log_success "Application is responding correctly"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warning "Health check failed, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 10
    fi
done

if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
    log_error "Application health check failed after rollback"
    log_error "Consider manual intervention or further rollback"
    exit 1
fi

# Verify the correct version is running
DEPLOYED_VERSION=$(get_current_version)
if [[ "$DEPLOYED_VERSION" == "$VERSION" ]]; then
    log_success "Rollback successful - version $VERSION is now running"
else
    log_error "Rollback verification failed - expected $VERSION but got $DEPLOYED_VERSION"
    exit 1
fi

# Run smoke tests if available
if [[ -f "$PROJECT_ROOT/scripts/smoke-tests.sh" ]]; then
    log_info "Running smoke tests..."
    if bash "$PROJECT_ROOT/scripts/smoke-tests.sh" "https://$DEPLOY_HOST"; then
        log_success "Smoke tests passed"
    else
        log_warning "Smoke tests failed - manual verification recommended"
    fi
fi

# Log rollback
ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
    cd $DEPLOY_PATH
    echo "$TIMESTAMP,$ENVIRONMENT,$VERSION,rollback_success,from_$CURRENT_VERSION" >> rollback.log
EOF

# Send rollback notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠️ Rollback completed: $ENVIRONMENT rolled back from $CURRENT_VERSION to $VERSION\"}" \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
fi

log_success "Rollback completed successfully!"
log_info "Environment: $ENVIRONMENT"
log_info "Previous version: $CURRENT_VERSION"
log_info "Current version: $VERSION"
log_info "Application URL: https://$DEPLOY_HOST"

# Show rollback summary
echo
log_info "Rollback Summary:"
log_info "  Environment: $ENVIRONMENT"
log_info "  From Version: $CURRENT_VERSION"
log_info "  To Version: $VERSION"
log_info "  Timestamp: $TIMESTAMP"
log_info "  Database Restored: $RESTORE_DB"
log_info "  Status: SUCCESS"

echo
log_warning "Post-Rollback Checklist:"
log_warning "  1. Monitor application logs for any issues"
log_warning "  2. Verify all critical functionality is working"
log_warning "  3. Check database integrity if restored"
log_warning "  4. Notify stakeholders of the rollback"
log_warning "  5. Investigate the root cause that required rollback"