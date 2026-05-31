output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API endpoint."
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "VPC ID used by the platform."
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs used for workloads."
  value       = module.vpc.private_subnets
}

output "ecr_repository_urls" {
  description = "Container registry URLs for platform services."
  value       = { for name, repo in aws_ecr_repository.services : name => repo.repository_url }
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.postgres.address
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "msk_bootstrap_brokers_sasl_iam" {
  description = "IAM-authenticated MSK bootstrap brokers."
  value       = aws_msk_cluster.platform.bootstrap_brokers_sasl_iam
}

output "media_cdn_domain_name" {
  description = "CloudFront domain serving media assets."
  value       = aws_cloudfront_distribution.media.domain_name
}

output "route53_zone_id" {
  description = "Hosted zone ID used for DNS records."
  value       = local.effective_zone_id
}

output "application_secret_arn" {
  description = "Secrets Manager ARN for runtime configuration."
  value       = aws_secretsmanager_secret.platform.arn
}

output "service_account_role_arn" {
  description = "IAM role ARN for Kubernetes service accounts."
  value       = aws_iam_role.service_account.arn
}
