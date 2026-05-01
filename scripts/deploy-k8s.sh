#!/bin/bash

# DokanX Kubernetes Deployment Script
# This script deploys the complete DokanX platform to Kubernetes

set -e

echo "🚀 Starting DokanX Kubernetes deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Not connected to a Kubernetes cluster"
    exit 1
fi

print_status "Connected to Kubernetes cluster"

# Navigate to the kubernetes directory
cd "$(dirname "$0")/../infrastructure/kubernetes"

print_status "Creating DokanX namespace..."
kubectl apply -f namespace.yml

print_status "Deploying MongoDB..."
kubectl apply -f mongodb.yml

print_status "Deploying Redis..."
kubectl apply -f redis.yml

print_status "Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app=dokanx-mongodb --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-redis --timeout=300s -n dokanx

print_status "Deploying backend API..."
kubectl apply -f backend.yml
kubectl apply -f backend-workers.yml
kubectl apply -f workload-policies.yml

print_status "Deploying storefront..."
kubectl apply -f storefront.yml

print_status "Deploying merchant dashboard..."
kubectl apply -f merchant-dashboard.yml

print_status "Deploying admin panel..."
kubectl apply -f admin-panel.yml

print_status "Deploying developer portal..."
kubectl apply -f developer-portal.yml

print_status "Waiting for applications to be ready..."
kubectl wait --for=condition=ready pod -l app=dokanx-backend --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-backend-worker --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-backend-scheduler --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-storefront --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-merchant-dashboard --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-admin-panel --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=dokanx-developer-portal --timeout=300s -n dokanx

print_status "Deploying monitoring stack..."

print_status "Creating ConfigMaps..."
kubectl apply -f prometheus-config.yml
kubectl apply -f grafana-config.yml
kubectl apply -f loki-config.yml
kubectl apply -f promtail-config.yml

print_status "Deploying Prometheus..."
kubectl apply -f prometheus.yml

print_status "Deploying Grafana..."
kubectl apply -f grafana.yml

print_status "Deploying Loki..."
kubectl apply -f loki.yml

print_status "Deploying Promtail..."
kubectl apply -f promtail.yml

print_status "Waiting for monitoring stack to be ready..."
kubectl wait --for=condition=ready pod -l app=prometheus --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=grafana --timeout=300s -n dokanx
kubectl wait --for=condition=ready pod -l app=loki --timeout=300s -n dokanx

print_status "Deploying Ingress..."
kubectl apply -f ingress.yml

print_status "🎉 DokanX deployment completed successfully!"
print_status ""
print_status "Service URLs:"
print_status "  - Storefront: https://dokanx.com"
print_status "  - API: https://api.dokanx.com"
print_status "  - Merchant Dashboard: https://merchant.dokanx.com"
print_status "  - Admin Panel: https://admin.dokanx.com"
print_status "  - Developer Portal: https://dev.dokanx.com"
print_status ""
print_status "Monitoring URLs:"
print_status "  - Prometheus: http://prometheus.dokanx.svc.cluster.local:9090"
print_status "  - Grafana: http://grafana.dokanx.svc.cluster.local:3000 (admin/admin123)"
print_status "  - Loki: http://loki.dokanx.svc.cluster.local:3100"
print_status ""
print_status "To check deployment status:"
print_status "  kubectl get pods -n dokanx"
print_status "  kubectl get services -n dokanx"
print_status "  kubectl get ingress -n dokanx"
print_status "  kubectl get hpa,pdb -n dokanx"
