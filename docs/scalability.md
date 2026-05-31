# Scalability Guide

## Strategies
- Horizontal scale API instances behind load balancer.
- Separate queue workers from API pods.
- Use Redis and managed database tiers with autoscaling.

## Database scaling
- Start with read replicas and partitioning by tenant/region if needed.

## Cache/message queues
- Scale Redis and BullMQ workers based on queue depth and SLA.

## CDN scaling
- Serve static web and media assets via CDN edge caching.
