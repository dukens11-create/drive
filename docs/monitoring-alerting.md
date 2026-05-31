# Monitoring and Alerting

## Monitoring overview
Track:
- API latency (p50/p95/p99)
- Error rate by endpoint and status code
- Queue depth and job failure counts
- CPU, memory, and container restarts

## Dashboards
- API service health dashboard
- Domain dashboards: rides, payments, support, safety
- Deployment/CI status dashboard

## Alert configuration
- Critical: sustained 5xx error rate, payment failures, auth outage.
- Warning: elevated latency, queue backlog growth.
- Route alerts to on-call channel; require acknowledgment workflow.
