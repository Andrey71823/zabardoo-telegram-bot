#!/bin/bash

# bazaarGuru Telegram Bot Deployment Script
# This script handles deployment to staging and production environments

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
bazaarGuru Deployment Script

Usage: $0 [OPTIONS] ENVIRONMENT

ENVIRONMENTS:
    staging     Deploy to staging environment
    production  Deploy to production environment

OPTIONS:
    -h, --help              Show this help message
    -v, --version VERSION   Deploy specific version/tag
    -r, --rollback         Rollback to previous version
    -s, --skip-tests       Skip running tests before deployment
    -f, --force            Force deployment without confirmation
    -b, --backup           Create backup before deployment
    --dry-run              Show what would be deployed without actually deploying

EXAMPLES:
    $0 staging                          # Deploy latest to staging
    $0 production -v v1.2.3            # Deploy specific version to production
    $0 production --rollback            # Rollback production to previous version
    $0 staging --dry-run                # Show what would be deployed to staging

EOF
}

# Parse command line arguments
ENVIRONMENT=""
VERSION="latest"
ROLLBACK=false
SKIP_TESTS=false
FORCE=false
BACKUP=false
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
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -b|--backup)
            BACKUP=true
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
        DEPLOY_HOST="${STAGING_HOST:-staging.bazaarGuru.com}"
        DEPLOY_USER="${STAGING_USER:-deploy}"
        DEPLOY_PATH="${STAGING_PATH:-/opt/bazaarGuru}"
        DOCKER_REGISTRY="${STAGING_REGISTRY:-ghcr.io/bazaarGuru}"
        ;;
    production)
        DEPLOY_HOST="${PRODUCTION_HOST:-bazaarGuru.com}"
        DEPLOY_USER="${PRODUCTION_USER:-deploy}"
        DEPLOY_PATH="${PRODUCTION_PATH:-/opt/bazaarGuru}"
        DOCKER_REGISTRY="${PRODUCTION_REGISTRY:-ghcr.io/bazaarGuru}"
        ;;
esac

log_info "Deployment Configuration:"
log_info "  Environment: $ENVIRONMENT"
log_info "  Version: $VERSION"
log_info "  Host: $DEPLOY_HOST"
log_info "  User: $DEPLOY_USER"
log_info "  Path: $DEPLOY_PATH"
log_info "  Registry: $DOCKER_REGISTRY"

# Dry run mode
if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN MODE - No actual deployment will occur"
    log_info "Would deploy bazaarGuru/telegram-bot:$VERSION to $ENVIRONMENT"
    exit 0
fi

# Confirmation for production
if [[ "$ENVIRONMENT" == "production" && "$FORCE" != true ]]; then
    echo
    log_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if we can connect to the deployment host
if ! ssh -o ConnectTimeout=10 "$DEPLOY_USER@$DEPLOY_HOST" "echo 'Connection test successful'" > /dev/null 2>&1; then
    log_error "Cannot connect to deployment host $DEPLOY_HOST"
    exit 1
fi

# Check if Docker is available on the host
if ! ssh "$DEPLOY_USER@$DEPLOY_HOST" "docker --version" > /dev/null 2>&1; then
    log_error "Docker is not available on the deployment host"
    exit 1
fi

# Run tests unless skipped
if [[ "$SKIP_TESTS" != true && "$ROLLBACK" != true ]]; then
    log_info "Running tests before deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Run linting
    log_info "Running linting..."
    npm run lint
    
    # Run unit tests
    log_info "Running unit tests..."
    npm run test:unit
    
    # Run integration tests for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Running integration tests..."
        npm run test:integration
    fi
    
    log_success "All tests passed"
fi

# Create backup if requested or if production
if [[ "$BACKUP" == true || "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating backup..."
    
    BACKUP_NAME="bazaarGuru_backup_${ENVIRONMENT}_${TIMESTAMP}"
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        cd $DEPLOY_PATH
        
        # Create backup directory
        mkdir -p backups
        
        # Backup database
        docker-compose exec -T postgres pg_dump -U \$POSTGRES_USER \$POSTGRES_DB > backups/${BACKUP_NAME}.sql
        
        # Backup application data
        tar -czf backups/${BACKUP_NAME}_data.tar.gz uploads/ logs/ || true
        
        # Keep only last 10 backups
        cd backups
        ls -t *.sql | tail -n +11 | xargs rm -f || true
        ls -t *_data.tar.gz | tail -n +11 | xargs rm -f || true
EOF
    
    log_success "Backup created: $BACKUP_NAME"
fi

# Handle rollback
if [[ "$ROLLBACK" == true ]]; then
    log_info "Rolling back to previous version..."
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        cd $DEPLOY_PATH
        
        # Get previous version from backup
        PREVIOUS_VERSION=\$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep bazaarGuru/telegram-bot | grep -v latest | head -n 1 | cut -d: -f2)
        
        if [[ -z "\$PREVIOUS_VERSION" ]]; then
            echo "No previous version found for rollback"
            exit 1
        fi
        
        echo "Rolling back to version: \$PREVIOUS_VERSION"
        
        # Update docker-compose to use previous version
        sed -i "s|image: bazaarGuru/telegram-bot:.*|image: bazaarGuru/telegram-bot:\$PREVIOUS_VERSION|g" docker-compose.prod.yml
        
        # Restart services
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d
        
        echo "Rollback completed"
EOF
    
    log_success "Rollback completed"
    exit 0
fi

# Main deployment
log_info "Starting deployment to $ENVIRONMENT..."

# Build and push Docker image (if not using existing version)
if [[ "$VERSION" == "latest" ]]; then
    log_info "Building Docker image..."
    
    cd "$PROJECT_ROOT"
    
    # Build image
    docker build -t "bazaarGuru/telegram-bot:$VERSION" .
    
    # Tag with timestamp for backup
    docker tag "bazaarGuru/telegram-bot:$VERSION" "bazaarGuru/telegram-bot:$TIMESTAMP"
    
    # Push to registry
    docker push "bazaarGuru/telegram-bot:$VERSION"
    docker push "bazaarGuru/telegram-bot:$TIMESTAMP"
    
    log_success "Docker image built and pushed"
fi

# Deploy to server
log_info "Deploying to server..."

# Copy deployment files
scp "$PROJECT_ROOT/docker-compose.prod.yml" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
scp "$PROJECT_ROOT/.env.$ENVIRONMENT" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/.env"

# Copy additional configuration files
if [[ -d "$PROJECT_ROOT/nginx" ]]; then
    scp -r "$PROJECT_ROOT/nginx" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
fi

if [[ -d "$PROJECT_ROOT/monitoring" ]]; then
    scp -r "$PROJECT_ROOT/monitoring" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
fi

# Execute deployment on server
ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
    cd $DEPLOY_PATH
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    # Run database migrations
    docker-compose -f docker-compose.prod.yml run --rm app npm run db:migrate
    
    # Start services with zero-downtime deployment
    docker-compose -f docker-compose.prod.yml up -d --remove-orphans
    
    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "Health check passed"
    else
        echo "Health check failed"
        exit 1
    fi
    
    # Clean up old images
    docker image prune -f
EOF

# Post-deployment verification
log_info "Running post-deployment verification..."

# Wait for deployment to stabilize
sleep 10

# Check if the application is responding
if curl -f "https://$DEPLOY_HOST/api/health" > /dev/null 2>&1; then
    log_success "Application is responding correctly"
else
    log_error "Application health check failed"
    exit 1
fi

# Run smoke tests
if [[ -f "$PROJECT_ROOT/scripts/smoke-tests.sh" ]]; then
    log_info "Running smoke tests..."
    bash "$PROJECT_ROOT/scripts/smoke-tests.sh" "https://$DEPLOY_HOST"
fi

# Send deployment notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 Deployment completed: bazaarGuru/telegram-bot:$VERSION to $ENVIRONMENT\"}" \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
fi

# Log deployment
echo "$TIMESTAMP,$ENVIRONMENT,$VERSION,success" >> "$PROJECT_ROOT/deployment.log"

log_success "Deployment completed successfully!"
log_info "Version $VERSION is now running on $ENVIRONMENT"
log_info "Application URL: https://$DEPLOY_HOST"

# Show deployment summary
echo
log_info "Deployment Summary:"
log_info "  Environment: $ENVIRONMENT"
log_info "  Version: $VERSION"
log_info "  Timestamp: $TIMESTAMP"
log_info "  Host: $DEPLOY_HOST"
log_info "  Status: SUCCESS"