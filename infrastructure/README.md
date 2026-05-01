# DokanX Infrastructure Setup

This directory contains the complete infrastructure setup for deploying DokanX to production using Docker and Kubernetes.

## Directory Structure

```
infrastructure/
├── README.md                    # This file
├── docker/                      # Docker configurations
│   ├── docker-compose.yml       # Local development environment
│   ├── backend.Dockerfile       # Backend API container
│   ├── frontend.Dockerfile      # Frontend applications container
│   └── nginx.conf              # Nginx reverse proxy config
├── kubernetes/                  # Kubernetes production deployment
│   ├── namespace.yml           # DokanX namespace
│   ├── mongodb.yml             # MongoDB deployment
│   ├── redis.yml               # Redis deployment
│   ├── backend.yml             # Backend API deployment
│   ├── storefront.yml          # Storefront deployment
│   ├── merchant-dashboard.yml  # Merchant dashboard deployment
│   ├── admin-panel.yml         # Admin panel deployment
│   ├── developer-portal.yml    # Developer portal deployment
│   ├── ingress.yml             # Ingress configuration
│   ├── prometheus.yml          # Prometheus monitoring
│   ├── grafana.yml             # Grafana dashboards
│   ├── loki.yml                # Loki log aggregation
│   ├── promtail.yml            # Promtail log shipping
│   ├── prometheus-config.yml   # Prometheus configuration
│   ├── grafana-config.yml      # Grafana configuration
│   ├── loki-config.yml         # Loki configuration
│   └── promtail-config.yml     # Promtail configuration
└── monitoring/                  # Monitoring configurations
    ├── prometheus.yml          # Prometheus config
    ├── loki-config.yml         # Loki config
    └── promtail-config.yml     # Promtail config
```

## Local Development

### Using Docker Compose

1. **Prerequisites:**
   - Docker Desktop or Docker Engine
   - Docker Compose

2. **Start the development environment:**
   ```bash
   cd infrastructure/docker
   docker-compose up -d
   ```

3. **Access the applications:**
   - Storefront: http://localhost:3000
   - Backend API: http://localhost:3001
   - Merchant Dashboard: http://localhost:3002
   - Admin Panel: http://localhost:3003
   - Developer Portal: http://localhost:3004
   - MongoDB: localhost:27017
   - Redis: localhost:6379

4. **Stop the environment:**
   ```bash
   docker-compose down
   ```

## Production Deployment

### Using Kubernetes

1. **Prerequisites:**
   - Kubernetes cluster (EKS, GKE, AKS, or self-hosted)
   - kubectl configured
   - NGINX Ingress Controller installed
   - cert-manager for SSL certificates (optional)

2. **Deploy to Kubernetes:**
   ```bash
   # Make the deployment script executable
   chmod +x scripts/deploy-k8s.sh

   # Run the deployment
   ./scripts/deploy-k8s.sh
   ```

3. **Access the applications:**
   - Storefront: https://dokanx.com
   - Backend API: https://api.dokanx.com
   - Merchant Dashboard: https://merchant.dokanx.com
   - Admin Panel: https://admin.dokanx.com
   - Developer Portal: https://dev.dokanx.com

### Monitoring Stack

The deployment includes a complete monitoring stack:

- **Prometheus**: Metrics collection and alerting
  - Access: http://prometheus.dokanx.svc.cluster.local:9090
- **Grafana**: Dashboards and visualization
  - Access: http://grafana.dokanx.svc.cluster.local:3000
  - Default credentials: admin/admin123 (change in production!)
- **Loki**: Log aggregation
  - Access: http://loki.dokanx.svc.cluster.local:3100
- **Promtail**: Log shipping from containers

### SSL/TLS Certificates

The ingress configuration includes automatic SSL certificate provisioning using cert-manager and Let's Encrypt. Update the domain names in `ingress.yml` before deployment.

## Environment Variables

### Backend API
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection URL
- `JWT_SECRET`: JWT signing secret
- `NODE_ENV`: Environment (production/development)

### Frontend Applications
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_ENVIRONMENT`: Environment name

## Scaling

### Horizontal Pod Autoscaling

To enable HPA for services:

```bash
kubectl autoscale deployment dokanx-backend --cpu-percent=70 --min=2 --max=10 -n dokanx
kubectl autoscale deployment dokanx-storefront --cpu-percent=70 --min=2 --max=10 -n dokanx
```

### Database Scaling

- MongoDB: Use MongoDB Atlas or configure replica sets
- Redis: Use Redis Cluster for high availability

## Backup and Recovery

### Database Backups

```bash
# MongoDB backup
kubectl exec -n dokanx dokanx-mongodb-0 -- mongodump --out /backup

# Redis backup
kubectl exec -n dokanx dokanx-redis-0 -- redis-cli save
```

### Persistent Volumes

All data is stored on persistent volumes. Configure appropriate storage classes for your cloud provider.

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n dokanx
kubectl describe pod <pod-name> -n dokanx
```

### Check logs
```bash
kubectl logs -f <pod-name> -n dokanx
```

### Check services
```bash
kubectl get services -n dokanx
kubectl get ingress -n dokanx
```

### Monitoring
- Check Grafana dashboards for application metrics
- Use Loki to search application logs
- Prometheus alerts for system issues

## Security Considerations

1. **Change default passwords** in Grafana and databases
2. **Configure network policies** for pod-to-pod communication
3. **Enable RBAC** for Kubernetes access control
4. **Use secrets** for sensitive configuration
5. **Regular security updates** for container images
6. **Enable audit logging** in Kubernetes

## Performance Optimization

1. **Resource limits** are configured for all deployments
2. **Horizontal scaling** based on CPU/memory usage
3. **Database indexing** for optimal query performance
4. **CDN integration** for static assets
5. **Caching strategies** with Redis

## Next Steps

1. Set up CI/CD pipelines with GitHub Actions
2. Configure automated backups
3. Set up alerting and notifications
4. Implement blue-green deployments
5. Add chaos engineering tests
