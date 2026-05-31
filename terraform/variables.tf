variable "project_name" {
  description = "Base project name used for AWS resources."
  type        = string
  default     = "drive"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "development"
}

variable "aws_region" {
  description = "AWS region for the platform."
  type        = string
  default     = "us-east-1"
}

variable "cluster_version" {
  description = "EKS control plane version."
  type        = string
  default     = "1.31"
}

variable "vpc_cidr" {
  description = "CIDR block for the shared VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones used across the platform."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks used for load balancers and NAT gateways."
  type        = list(string)
  default     = ["10.40.0.0/24", "10.40.1.0/24", "10.40.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks used for workloads and data services."
  type        = list(string)
  default     = ["10.40.10.0/24", "10.40.11.0/24", "10.40.12.0/24"]
}

variable "db_username" {
  description = "Primary RDS username."
  type        = string
  default     = "drive"
}

variable "db_password" {
  description = "Primary RDS password."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret stored in AWS Secrets Manager."
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret stored in AWS Secrets Manager."
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Initial RDS allocated storage in gigabytes."
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum autoscaled RDS storage in gigabytes."
  type        = number
  default     = 300
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL."
  type        = string
  default     = "db.t4g.medium"
}

variable "redis_node_type" {
  description = "ElastiCache node type for Redis."
  type        = string
  default     = "cache.t4g.small"
}

variable "redis_replica_count" {
  description = "Number of cache clusters in the replication group."
  type        = number
  default     = 2
}

variable "kafka_instance_type" {
  description = "MSK broker instance type."
  type        = string
  default     = "kafka.t3.small"
}

variable "kafka_volume_size" {
  description = "MSK broker EBS volume size in gigabytes."
  type        = number
  default     = 100
}

variable "domain_name" {
  description = "Base Route53 domain for public application endpoints."
  type        = string
  default     = ""
}

variable "create_route53_zone" {
  description = "Whether Terraform should create a hosted zone for domain_name."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Existing Route53 hosted zone ID when create_route53_zone is false."
  type        = string
  default     = ""
}

variable "ingress_lb_dns_name" {
  description = "ALB or NLB DNS name created by the ingress controller for Route53 aliases."
  type        = string
  default     = ""
}

variable "ingress_lb_zone_id" {
  description = "Hosted zone ID for the ingress load balancer."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront and ingress TLS."
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address subscribed to infrastructure alerts."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional resource tags."
  type        = map(string)
  default     = {}
}
