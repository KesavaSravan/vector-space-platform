import os
import json
import pandas as pd
import numpy as np

incidents = [
    # Cluster 0: VPN & Remote Access Issues
    {
        "Number": "INC0010001",
        "Short description": "GlobalProtect VPN connection drops every 15 minutes for remote users",
        "Description": "Multiple remote workers in EMEA region report VPN tunnels disconnecting intermittently during video conferences and file transfers.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Network",
        "Subcategory": "VPN",
        "Assignment group": "Network Support Tier 2",
        "Configuration item": "vpn-gateway-emea-01",
        "Resolution notes": "Increased IPSec DPD (Dead Peer Detection) timeout from 30s to 120s on Palo Alto gateway and updated client profile.",
        "Caller": "Elena Rostova",
        "Created": "2026-08-01 08:15:00",
        "Resolved": "2026-08-01 11:30:00"
    },
    {
        "Number": "INC0010002",
        "Short description": "Unable to authenticate to Cisco AnyConnect VPN with MFA push",
        "Description": "Users attempting to sign into Corporate VPN receive Okta MFA push timeout error.",
        "Priority": "1 - Critical",
        "State": "Resolved",
        "Category": "Security",
        "Subcategory": "Authentication",
        "Assignment group": "Identity & Access Management",
        "Configuration item": "okta-radius-agent-02",
        "Resolution notes": "Restarted stale Okta RADIUS agent service on proxy host and verified sync with primary Okta tenant.",
        "Caller": "Marcus Vance",
        "Created": "2026-08-02 09:00:00",
        "Resolved": "2026-08-02 09:45:00"
    },
    {
        "Number": "INC0010003",
        "Short description": "High packet loss and latency on VPN Tunnel to AWS US-East-1",
        "Description": "Site-to-site IPsec VPN tunnel between on-prem datacenter and AWS VPC showing 25% packet loss.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Network",
        "Subcategory": "Cloud Networking",
        "Assignment group": "Cloud Ops & Infrastructure",
        "Configuration item": "aws-vpn-conn-09a8",
        "Resolution notes": "Failover to secondary BGP tunnel initiated. ISP resolved transit routing congestion in Ashburn datacenter.",
        "Caller": "David Chen",
        "Created": "2026-08-03 14:20:00",
        "Resolved": "2026-08-03 16:10:00"
    },
    {
        "Number": "INC0010004",
        "Short description": "VPN split tunneling policy not routing internal dev domains",
        "Description": "Developers on MacOS VPN client unable to access internal .corp.internal URLs while connected.",
        "Priority": "3 - Moderate",
        "State": "Resolved",
        "Category": "Network",
        "Subcategory": "VPN",
        "Assignment group": "Network Support Tier 2",
        "Configuration item": "globalprotect-portal",
        "Resolution notes": "Updated split tunnel DNS routing table to include wildcard *.dev.corp.internal domain.",
        "Caller": "Sarah Jenkins",
        "Created": "2026-08-04 10:05:00",
        "Resolved": "2026-08-04 11:50:00"
    },

    # Cluster 1: Database & SQL Performance / Locks
    {
        "Number": "INC0010010",
        "Short description": "PostgreSQL production database connection pool exhausted (max_connections reached)",
        "Description": "Payment checkout microservice throwing 500 Internal Server Errors due to FATAL: remaining connection slots are reserved for non-replication superuser connections.",
        "Priority": "1 - Critical",
        "State": "Resolved",
        "Category": "Database",
        "Subcategory": "PostgreSQL",
        "Assignment group": "Database Administrators (DBA)",
        "Configuration item": "pg-primary-checkout-cluster",
        "Resolution notes": "Killed leaked idle-in-transaction connections from cart-cleanup worker and tuned PgBouncer max_client_conn from 1000 to 2500.",
        "Caller": "System Alert - Datadog",
        "Created": "2026-08-05 16:30:00",
        "Resolved": "2026-08-05 17:15:00"
    },
    {
        "Number": "INC0010011",
        "Short description": "Deadlock detected on MySQL orders table during flash sale",
        "Description": "High volume of concurrent updates on orders and inventory tables causing deadlock exceptions in checkout service.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Database",
        "Subcategory": "MySQL",
        "Assignment group": "Database Administrators (DBA)",
        "Configuration item": "aurora-mysql-cluster-prod",
        "Resolution notes": "Optimized transaction lock ordering in inventory decrement query and added composite index on (order_id, sku_id).",
        "Caller": "Priya Sharma",
        "Created": "2026-08-06 12:10:00",
        "Resolved": "2026-08-06 14:00:00"
    },
    {
        "Number": "INC0010012",
        "Short description": "Oracle ERP Database query timeout on end-of-month financial ledger batch",
        "Description": "General ledger reconciliation batch job timed out after 3 hours. Financial controllers unable to close monthly books.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Database",
        "Subcategory": "Oracle",
        "Assignment group": "ERP Systems Team",
        "Configuration item": "oracle-erp-fin-db01",
        "Resolution notes": "Gathered stale table statistics on GL_BALANCES table and rebuilt fragmented bitmap index.",
        "Caller": "Robert Sterling",
        "Created": "2026-08-07 07:45:00",
        "Resolved": "2026-08-07 10:30:00"
    },
    {
        "Number": "INC0010013",
        "Short description": "MongoDB replica set secondary node lagged by 45 minutes",
        "Description": "Analytics read-replica node fell behind primary oplog due to large batch purge operation on audit_logs collection.",
        "Priority": "3 - Moderate",
        "State": "Resolved",
        "Category": "Database",
        "Subcategory": "MongoDB",
        "Assignment group": "Database Administrators (DBA)",
        "Configuration item": "mongo-analytics-replica-02",
        "Resolution notes": "Temporarily throttled background purge script. Replica caught up with oplog within 20 minutes.",
        "Caller": "Kavita Rao",
        "Created": "2026-08-08 15:00:00",
        "Resolved": "2026-08-08 15:45:00"
    },

    # Cluster 2: Kubernetes & Container OOM / CrashLoopBackOff
    {
        "Number": "INC0010020",
        "Short description": "Kubernetes auth-service pod CrashLoopBackOff due to OOMKilled (Exit Code 137)",
        "Description": "Auth service container memory spiked past 2Gi limit during peak morning SSO logins, triggering Linux OOM killer.",
        "Priority": "1 - Critical",
        "State": "Resolved",
        "Category": "Cloud Platform",
        "Subcategory": "Kubernetes",
        "Assignment group": "SRE & Cloud Platform",
        "Configuration item": "k8s-prod-cluster-us-east",
        "Resolution notes": "Identified memory leak in JWT caching routine. Patched v2.4.1 deployment and increased memory limit to 4Gi with HPA.",
        "Caller": "System Alert - Prometheus",
        "Created": "2026-08-09 08:20:00",
        "Resolved": "2026-08-09 09:10:00"
    },
    {
        "Number": "INC0010021",
        "Short description": "EKS worker nodes DiskPressure condition causing Pod evictions",
        "Description": "Multiple worker nodes in node group k8s-workers-c5 reported /var/lib/docker ephemeral storage at 92% capacity.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Cloud Platform",
        "Subcategory": "Kubernetes",
        "Assignment group": "SRE & Cloud Platform",
        "Configuration item": "eks-nodegroup-c5-large",
        "Resolution notes": "Configured automated kubelet image garbage collection threshold (imageGCHighThresholdPercent: 80) and purged dangling container logs.",
        "Caller": "Alex Mercer",
        "Created": "2026-08-10 11:15:00",
        "Resolved": "2026-08-10 12:45:00"
    },
    {
        "Number": "INC0010022",
        "Short description": "Ingress-nginx controller 504 Gateway Timeout for billing webhook endpoints",
        "Description": "Stripe webhook incoming requests timing out at ingress controller. Downstream billing worker pods unresponsive.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Cloud Platform",
        "Subcategory": "Kubernetes Ingress",
        "Assignment group": "SRE & Cloud Platform",
        "Configuration item": "k8s-ingress-nginx-prod",
        "Resolution notes": "Scaled billing-worker deployment from 3 to 10 replicas and increased proxy-read-timeout annotation to 60s.",
        "Caller": "Billing Ops Team",
        "Created": "2026-08-11 14:00:00",
        "Resolved": "2026-08-11 15:15:00"
    },

    # Cluster 3: Email, Exchange & Office 365
    {
        "Number": "INC0010030",
        "Short description": "Exchange Online outbound emails delayed by 45 minutes in mail queue",
        "Description": "Users across all departments experiencing severe delays sending emails to external customer domains.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Enterprise Apps",
        "Subcategory": "Email & Office 365",
        "Assignment group": "Workplace IT & Collaboration",
        "Configuration item": "m365-exchange-online-tenant",
        "Resolution notes": "Microsoft tenant advisory EX683921 mitigated. Outbound routing connectors cleared backlog automatically.",
        "Caller": "Lisa Ray",
        "Created": "2026-08-12 10:30:00",
        "Resolved": "2026-08-12 12:00:00"
    },
    {
        "Number": "INC0010031",
        "Short description": "Outlook desktop client keeps prompting for password repeatedly",
        "Description": "Finance team members report Outlook 365 client repeatedly popping up Modern Auth credential dialog.",
        "Priority": "3 - Moderate",
        "State": "Resolved",
        "Category": "Enterprise Apps",
        "Subcategory": "Email & Office 365",
        "Assignment group": "Service Desk Tier 1",
        "Configuration item": "m365-outlook-client",
        "Resolution notes": "Cleared corrupted Windows Credential Manager cached tokens and re-registered Azure AD device PRT.",
        "Caller": "Thomas Brown",
        "Created": "2026-08-13 09:15:00",
        "Resolved": "2026-08-13 10:00:00"
    },
    {
        "Number": "INC0010032",
        "Short description": "Shared mailbox 'invoices@company.com' exceeded 50GB storage quota",
        "Description": "Accounts Payable team unable to receive new vendor invoices due to mailbox full NDR bounce messages.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Enterprise Apps",
        "Subcategory": "Email & Office 365",
        "Assignment group": "Workplace IT & Collaboration",
        "Configuration item": "shared-mbx-invoices",
        "Resolution notes": "Assigned Exchange Online Plan 2 license with auto-expanding online archive and enabled retention policy.",
        "Caller": "Sandra Martinez",
        "Created": "2026-08-14 13:40:00",
        "Resolved": "2026-08-14 14:30:00"
    },

    # Cluster 4: Security Alerts & SSL Certificates
    {
        "Number": "INC0010040",
        "Short description": "SSL/TLS Certificate expired for customer portal api.company.com",
        "Description": "Customers getting NET::ERR_CERT_DATE_INVALID security warnings on mobile and web checkout.",
        "Priority": "1 - Critical",
        "State": "Resolved",
        "Category": "Security",
        "Subcategory": "Certificates",
        "Assignment group": "InfoSec & Security Operations",
        "Configuration item": "cert-api-company-com",
        "Resolution notes": "Emergency ACM certificate re-issued and bound to CloudFront distribution and ALB listener.",
        "Caller": "Customer Support Lead",
        "Created": "2026-08-15 06:10:00",
        "Resolved": "2026-08-15 06:45:00"
    },
    {
        "Number": "INC0010041",
        "Short description": "Multiple failed SSH root login attempts from untrusted foreign IP range",
        "Description": "CrowdStrike Falcon detected brute-force SSH attempt against public bastion jump host (over 2,500 attempts in 10 mins).",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Security",
        "Subcategory": "Threat Detection",
        "Assignment group": "Security Operations Center (SOC)",
        "Configuration item": "bastion-host-dmz-01",
        "Resolution notes": "Blocked source CIDR block on AWS Security Group and AWS WAF rate-limiting rule. Rotated SSH host key.",
        "Caller": "SOC Tier 2 Analyst",
        "Created": "2026-08-16 02:20:00",
        "Resolved": "2026-08-16 03:00:00"
    },
    {
        "Number": "INC0010042",
        "Short description": "Critical vulnerability CVE-2026-4428 detected in production OpenSSL package",
        "Description": "Prisma Cloud container scanning flagged remote code execution vulnerability in base alpine container images.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Security",
        "Subcategory": "Vulnerability Mgmt",
        "Assignment group": "InfoSec & Security Operations",
        "Configuration item": "container-base-images",
        "Resolution notes": "Updated base Dockerfile to alpine:3.20.2 containing patched OpenSSL 3.3.1-r1 and redeployed all microservices.",
        "Caller": "Security Scanner Bot",
        "Created": "2026-08-17 11:00:00",
        "Resolved": "2026-08-17 15:30:00"
    },

    # Cluster 5: Storage, Backup & Disaster Recovery
    {
        "Number": "INC0010050",
        "Short description": "Automated daily snapshot backup failed for PostgreSQL RDS cluster",
        "Description": "AWS Backup job returned status FAILED: Insufficient IAM permissions for KMS key kms-prod-backup-key.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Infrastructure",
        "Subcategory": "Backups",
        "Assignment group": "Cloud Ops & Infrastructure",
        "Configuration item": "aws-backup-vault-prod",
        "Resolution notes": "Updated KMS key policy statement to grant DescribeKey and GenerateDataKey permissions to AWSBackupDefaultServiceRole.",
        "Caller": "CloudWatch Events",
        "Created": "2026-08-18 04:00:00",
        "Resolved": "2026-08-18 07:30:00"
    },
    {
        "Number": "INC0010051",
        "Short description": "NFS shared volume /mnt/shared_data mounted read-only on worker servers",
        "Description": "Application workers throwing [Errno 30] Read-only file system when generating PDF report exports.",
        "Priority": "2 - High",
        "State": "Resolved",
        "Category": "Infrastructure",
        "Subcategory": "Storage",
        "Assignment group": "Systems Engineering",
        "Configuration item": "netapp-nfs-export-01",
        "Resolution notes": "Resolved underlying NetApp storage controller failover state and remounted NFS exports with rw,hard,intr options.",
        "Caller": "Daniel Craig",
        "Created": "2026-08-19 13:10:00",
        "Resolved": "2026-08-19 14:40:00"
    },

    # Cluster 6: ServiceNow Platform & Integrations
    {
        "Number": "INC0010060",
        "Short description": "ServiceNow MID Server down - discovery and LDAP sync stopped",
        "Description": "Production MID server host 'mid-srv-prod-01' unreachable. Active Directory user provisioning failing.",
        "Priority": "1 - Critical",
        "State": "Resolved",
        "Category": "Enterprise Apps",
        "Subcategory": "ServiceNow Platform",
        "Assignment group": "ServiceNow Platform Admins",
        "Configuration item": "mid-srv-prod-01",
        "Resolution notes": "Renewed expired MID server mutual TLS client certificate in wrapper-override.conf and restarted JVM service.",
        "Caller": "SNOW Admin",
        "Created": "2026-08-20 08:00:00",
        "Resolved": "2026-08-20 08:50:00"
    },
    {
        "Number": "INC0010061",
        "Short description": "Jira to ServiceNow bi-directional webhook sync failing with 401 Unauthorized",
        "Description": "Incidents created in ServiceNow are not creating corresponding Bug issues in Jira Engineering project.",
        "Priority": "3 - Moderate",
        "State": "Resolved",
        "Category": "Enterprise Apps",
        "Subcategory": "ServiceNow Integrations",
        "Assignment group": "ServiceNow Platform Admins",
        "Configuration item": "snow-jira-integration-hub",
        "Resolution notes": "Regenerated expired Jira API service account token and updated Integration Hub connection alias credential.",
        "Caller": "Rachel Green",
        "Created": "2026-08-21 10:20:00",
        "Resolved": "2026-08-21 11:35:00"
    }
]

# Expand to 80 rich realistic incident items for full dataset representation
expanded_incidents = []
categories = [
    ("Network", "VPN", "Network Support Tier 2", "vpn-gw-"),
    ("Database", "PostgreSQL", "Database Administrators (DBA)", "pg-db-"),
    ("Database", "MySQL", "Database Administrators (DBA)", "mysql-prod-"),
    ("Cloud Platform", "Kubernetes", "SRE & Cloud Platform", "k8s-pod-"),
    ("Enterprise Apps", "Email & Office 365", "Workplace IT & Collaboration", "o365-tenant-"),
    ("Security", "Threat Detection", "Security Operations Center (SOC)", "security-waf-"),
    ("Infrastructure", "Storage", "Systems Engineering", "nfs-storage-"),
    ("Enterprise Apps", "ServiceNow Platform", "ServiceNow Platform Admins", "snow-mid-")
]

for i in range(len(incidents)):
    expanded_incidents.append(incidents[i])

base_id = 10070
for i in range(60):
    cat, subcat, grp, ci_prefix = categories[i % len(categories)]
    p_num = (i % 4) + 1
    p_label = f"{p_num} - {'Critical' if p_num==1 else 'High' if p_num==2 else 'Moderate' if p_num==3 else 'Low'}"
    inc_num = f"INC00{base_id + i}"
    
    if cat == "Network":
        sd = f"High packet drop rate on gateway interface {ci_prefix}{i:02d}"
        desc = f"Interface gigabitethernet0/0/{i%4} experiencing CRC errors and buffer overruns during peak business hours."
        res = f"Replaced faulty SFP+ optical transceiver module and cleaned fiber optic patch cable."
    elif cat == "Database":
        sd = f"Slow query execution on table transactions_{2026}_{i:02d} exceeding SLA"
        desc = f"API query duration exceeded 12,000ms. CPU utilization reached 98% on database instance {ci_prefix}{i:02d}."
        res = f"Added missing index on column (customer_id, created_at) and tuned work_mem parameter."
    elif cat == "Cloud Platform":
        sd = f"Pod autoscaling failed for deployment order-processor-{i:02d}"
        desc = f"Horizontal Pod Autoscaler unable to fetch custom metrics from Prometheus adapter on cluster {ci_prefix}{i:02d}."
        res = f"Upgraded Prometheus k8s adapter Helm chart and fixed RBAC ClusterRoleBinding for custom.metrics.k8s.io API."
    elif cat == "Enterprise Apps":
        sd = f"Single Sign-On (SSO) login failure for user group Operations-Tier{i%3+1}"
        desc = f"SAML assertion failed signature verification on ServiceNow login endpoint."
        res = f"Updated Azure AD IdP Federation Metadata XML certificate in Single Sign-On Multi-Provider configuration."
    elif cat == "Security":
        sd = f"WAF Rate Limit rule triggered by IP 198.51.100.{i+10} targeting login API"
        desc = f"Over 8,000 requests per minute detected against /api/v1/auth/login. Potential credential stuffing attack."
        res = f"Applied IP rate limit rule on CloudFront WAF and enabled CAPTCHA challenge for suspect ASN."
    else:
        sd = f"Storage volume /data/{i:02d} disk utilization reached 94%"
        desc = f"Application logs and temp files filling up root partition on server {ci_prefix}{i:02d}."
        res = f"Expanded EBS volume size from 200GB to 500GB online using growpart and xfs_growfs."

    expanded_incidents.append({
        "Number": inc_num,
        "Short description": sd,
        "Description": desc,
        "Priority": p_label,
        "State": "Resolved",
        "Category": cat,
        "Subcategory": subcat,
        "Assignment group": grp,
        "Configuration item": f"{ci_prefix}{i:02d}",
        "Resolution notes": res,
        "Caller": f"Engineer_{i+1}",
        "Created": f"2026-08-{10 + (i%18):02d} 09:00:00",
        "Resolved": f"2026-08-{10 + (i%18):02d} 11:30:00"
    })

df = pd.DataFrame(expanded_incidents)

# Output paths
out_csv = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/servicenow_incidents_sample.csv"
out_xlsx = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/servicenow_incidents_sample.xlsx"

df.to_csv(out_csv, index=False)
df.to_excel(out_xlsx, index=False)

print(f"Generated {len(df)} ServiceNow sample incidents in CSV & Excel format.")
