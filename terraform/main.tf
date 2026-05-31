locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "dukens11-create/drive"
    },
    var.tags,
  )
  ecr_repositories = toset([
    "api",
    "admin",
    "passenger-web",
    "restaurant-dashboard",
    "driver-mobile",
    "passenger-mobile",
  ])
  s3_buckets = {
    app_files = "app-files"
    logs      = "logs"
    backups   = "backups"
    media     = "media"
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.10.0"

  name = local.name_prefix
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  public_subnets  = var.public_subnet_cidrs
  private_subnets = var.private_subnet_cidrs

  enable_nat_gateway     = true
  one_nat_gateway_per_az = true
  single_nat_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.13.1"

  cluster_name    = local.name_prefix
  cluster_version = var.cluster_version

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_addons = {
    coredns      = {}
    "kube-proxy" = {}
    vpc-cni      = {}
  }

  eks_managed_node_groups = {
    general = {
      min_size       = 2
      max_size       = 6
      desired_size   = 3
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      labels = {
        workload = "general"
      }
    }
    spot = {
      min_size       = 0
      max_size       = 4
      desired_size   = 1
      instance_types = ["t3.large"]
      capacity_type  = "SPOT"
      labels = {
        workload = "burst"
      }
    }
  }
}

resource "aws_ecr_repository" "services" {
  for_each = local.ecr_repositories

  name                 = "${local.name_prefix}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app"
  description = "Application workloads running inside EKS"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-postgres"
  description = "PostgreSQL access from platform workloads"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "cache" {
  name        = "${local.name_prefix}-redis"
  description = "Redis access from platform workloads"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "streaming" {
  name        = "${local.name_prefix}-streaming"
  description = "Kafka access from platform workloads"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 9092
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "postgres" {
  name       = "${local.name_prefix}-postgres"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${local.name_prefix}-postgres"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
}

resource "aws_db_instance" "postgres" {
  identifier                      = "${local.name_prefix}-postgres"
  engine                          = "postgres"
  engine_version                  = "16.3"
  instance_class                  = var.db_instance_class
  allocated_storage               = var.db_allocated_storage
  max_allocated_storage           = var.db_max_allocated_storage
  db_subnet_group_name            = aws_db_subnet_group.postgres.name
  parameter_group_name            = aws_db_parameter_group.postgres.name
  vpc_security_group_ids          = [aws_security_group.database.id]
  username                        = var.db_username
  password                        = var.db_password
  db_name                         = var.project_name
  backup_retention_period         = 7
  backup_window                   = "03:00-04:00"
  maintenance_window              = "sun:05:00-sun:06:00"
  multi_az                        = true
  storage_encrypted               = true
  deletion_protection             = var.environment == "production"
  skip_final_snapshot             = var.environment != "production"
  final_snapshot_identifier       = var.environment == "production" ? "${local.name_prefix}-final" : null
  performance_insights_enabled    = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  publicly_accessible             = false
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = "${local.name_prefix}-redis"
  family = "redis7"

  parameter {
    name  = "activedefrag"
    value = "yes"
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${local.name_prefix}-redis"
  description                = "Drive Redis cluster for caching and queues"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_replica_count
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.cache.id]
  automatic_failover_enabled = var.redis_replica_count > 1
  multi_az_enabled           = var.redis_replica_count > 1
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  snapshot_retention_limit   = 7
}

resource "aws_msk_cluster" "platform" {
  cluster_name           = "${local.name_prefix}-msk"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = length(var.availability_zones)

  broker_node_group_info {
    instance_type   = var.kafka_instance_type
    client_subnets  = module.vpc.private_subnets
    security_groups = [aws_security_group.streaming.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.kafka_volume_size
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      iam = true
    }
  }
}

resource "aws_s3_bucket" "platform" {
  for_each = local.s3_buckets

  bucket        = "${local.name_prefix}-${each.value}"
  force_destroy = var.environment != "production"
}

resource "aws_s3_bucket_versioning" "platform" {
  for_each = aws_s3_bucket.platform

  bucket = each.value.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "platform" {
  for_each = aws_s3_bucket.platform

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "platform" {
  for_each = aws_s3_bucket.platform

  bucket = each.value.id

  rule {
    id     = "transition-${each.key}"
    status = "Enabled"

    filter {}

    transition {
      days          = each.key == "backups" ? 30 : 60
      storage_class = each.key == "backups" ? "GLACIER" : "INTELLIGENT_TIERING"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${local.name_prefix}-media"
  description                       = "Origin access control for media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "media" {
  enabled = true
  aliases = var.domain_name == "" ? [] : ["media.${var.domain_name}"]

  origin {
    domain_name              = aws_s3_bucket.platform["media"].bucket_regional_domain_name
    origin_id                = "media-bucket"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  default_cache_behavior {
    target_origin_id       = "media-bucket"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == ""
    acm_certificate_arn            = var.acm_certificate_arn == "" ? null : var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn == "" ? null : "sni-only"
    minimum_protocol_version       = var.acm_certificate_arn == "" ? null : "TLSv1.2_2021"
  }
}

resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.platform["media"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = ["s3:GetObject"]
        Resource  = ["${aws_s3_bucket.platform["media"].arn}/*"]
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.media.arn
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/drive/${local.name_prefix}/application"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/drive/${local.name_prefix}/audit"
  retention_in_days = 90
}

resource "aws_cloudwatch_log_group" "platform" {
  name              = "/aws/drive/${local.name_prefix}/platform"
  retention_in_days = 30
}

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_event_rule" "backup_verification" {
  name                = "${local.name_prefix}-backup-verification"
  description         = "Daily backup verification reminder for the Drive platform"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "alerts" {
  rule      = aws_cloudwatch_event_rule.backup_verification.name
  target_id = "sns"
  arn       = aws_sns_topic.alerts.arn
}

resource "aws_route53_zone" "platform" {
  count = var.create_route53_zone && var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

locals {
  effective_zone_id = var.route53_zone_id != "" ? var.route53_zone_id : (var.create_route53_zone && var.domain_name != "" ? aws_route53_zone.platform[0].zone_id : null)
}

resource "aws_route53_record" "platform_apps" {
  for_each = local.effective_zone_id != null && var.ingress_lb_dns_name != "" && var.ingress_lb_zone_id != "" && var.domain_name != "" ? toset(["api", "admin", "web"]) : toset([])

  zone_id = local.effective_zone_id
  name    = "${each.key}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.ingress_lb_dns_name
    zone_id                = var.ingress_lb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_secretsmanager_secret" "platform" {
  name                    = "${local.name_prefix}/application"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "platform" {
  secret_id = aws_secretsmanager_secret.platform.id
  secret_string = jsonencode({
    database_url            = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.project_name}"
    redis_primary_endpoint  = aws_elasticache_replication_group.redis.primary_endpoint_address
    kafka_bootstrap_brokers = aws_msk_cluster.platform.bootstrap_brokers_sasl_iam
    jwt_secret              = var.jwt_secret
    stripe_webhook_secret   = var.stripe_webhook_secret
  })
}

data "aws_iam_policy_document" "service_account_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:drive-${var.environment}:drive-platform"]
    }
  }
}

resource "aws_iam_role" "service_account" {
  name               = "${local.name_prefix}-service-account"
  assume_role_policy = data.aws_iam_policy_document.service_account_assume_role.json
}

resource "aws_iam_policy" "service_account" {
  name = "${local.name_prefix}-service-account"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt"
        ]
        Resource = [aws_secretsmanager_secret.platform.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = flatten([
          for bucket in aws_s3_bucket.platform : [bucket.arn, "${bucket.arn}/*"]
        ])
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.application.arn,
          "${aws_cloudwatch_log_group.application.arn}:*",
          aws_cloudwatch_log_group.audit.arn,
          "${aws_cloudwatch_log_group.audit.arn}:*",
          aws_cloudwatch_log_group.platform.arn,
          "${aws_cloudwatch_log_group.platform.arn}:*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "service_account" {
  role       = aws_iam_role.service_account.name
  policy_arn = aws_iam_policy.service_account.arn
}
