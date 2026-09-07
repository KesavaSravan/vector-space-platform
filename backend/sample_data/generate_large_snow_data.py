import os
import json
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Seed for reproducible realistic data
random.seed(42)
np.random.seed(42)

# Templates for 12 ITSM domains with realistic ServiceNow metadata patterns
DOMAINS = [
    {
        "category": "Network",
        "subcategory": "VPN & Remote Access",
        "group": "Network Support Tier 2",
        "ci_prefixes": ["vpn-gw-emea-", "vpn-gw-apac-", "vpn-gw-us-", "cisco-anyconnect-cluster-", "paloalto-fw-"],
        "scenarios": [
            ("GlobalProtect VPN tunnel drops intermittently during video calls",
             "Remote workers reporting packet loss and session teardowns on gateway {ci}.",
             "2 - High",
             "Increased IPSec Dead Peer Detection (DPD) timeout from 30s to 120s and tuned MTU size to 1350."),
            ("Unable to authenticate to Cisco AnyConnect VPN via Okta MFA",
             "Users receiving timeout error waiting for Okta Push notification on {ci}.",
             "1 - Critical",
             "Restarted stuck Okta RADIUS agent daemon on proxy host and flushed session cache."),
            ("High packet drop rate on gateway interface for {ci}",
             "CRC alignment errors and buffer overruns detected on interface gigabitethernet0/0/1.",
             "2 - High",
             "Replaced faulty SFP+ 10G optical transceiver module and cleaned LC fiber patch connector."),
            ("VPN split-tunneling policy failing to route internal corporate subnet",
             "Engineers on MacOS client cannot reach internal RFC1918 subnets while connected to {ci}.",
             "3 - Moderate",
             "Pushed updated split-tunnel routing table rule to GlobalProtect portal configuration."),
            ("BGP route flapping on secondary IPsec link to AWS us-east-1",
             "Route instability causing latency spikes between on-prem core router and {ci}.",
             "2 - High",
             "Adjusted BGP hold-time timer to 90s and engaged ISP to clear transit fiber congestion.")
        ]
    },
    {
        "category": "Database",
        "subcategory": "Relational & NoSQL",
        "group": "Database Administrators (DBA)",
        "ci_prefixes": ["pg-primary-prod-", "aurora-mysql-", "oracle-erp-db-", "mongo-analytics-", "redis-cluster-"],
        "scenarios": [
            ("PostgreSQL connection pool exhausted on {ci}",
             "Microservices throwing FATAL: remaining connection slots are reserved for superuser connections.",
             "1 - Critical",
             "Terminated leaked idle-in-transaction client sessions and adjusted PgBouncer pool max_client_conn to 2500."),
            ("Deadlock detected on orders inventory table in {ci}",
             "High-concurrency updates during promotional campaign resulting in transaction rollbacks.",
             "2 - High",
             "Enforced consistent transaction lock ordering in inventory decrement service and created composite index."),
            ("Oracle ERP batch job reconciliation query timeout on {ci}",
             "End-of-month financial settlement batch process hung exceeding 4-hour SLA.",
             "2 - High",
             "Gathered fresh table statistics on GL_LEDGER and rebuilt fragmented partitioned index."),
            ("MongoDB secondary replica node lag exceeding 45 minutes on {ci}",
             "Large batch cleanup on audit_events collection overwhelmed secondary oplog apply thread.",
             "3 - Moderate",
             "Throttled batch deletion worker with sleep interval; replica caught up with oplog within 25 mins."),
            ("Redis cluster memory fragmentation ratio reached 2.8 on {ci}",
             "Cache eviction latency spikes affecting web tier session store.",
             "3 - Moderate",
             "Enabled active defragmentation (activedefrag yes) and scaled Redis node memory limits.")
        ]
    },
    {
        "category": "Cloud Platform",
        "subcategory": "Kubernetes & Containers",
        "group": "SRE & Cloud Platform",
        "ci_prefixes": ["k8s-prod-us-", "k8s-prod-eu-", "eks-cluster-", "gke-workloads-", "aks-core-"],
        "scenarios": [
            ("Pod CrashLoopBackOff due to OOMKilled (Exit Code 137) on {ci}",
             "Auth-service container memory breached 2Gi limit during peak morning traffic spike.",
             "1 - Critical",
             "Identified memory leak in JWT token cache; patched deployment to v2.4.2 and set memory limit to 4Gi."),
            ("Kubernetes worker nodes DiskPressure condition causing pod evictions on {ci}",
             "Ephemeral root volume /var/lib/docker reached 92% capacity on multiple worker instances.",
             "2 - High",
             "Tuned kubelet image garbage collection threshold to 80% and pruned dangling build artifacts."),
            ("Ingress-nginx controller 504 Gateway Timeout on {ci}",
             "Stripe webhook requests timing out at ingress proxy; upstream billing pods saturated.",
             "2 - High",
             "Scaled billing-worker horizontal pod autoscaler from 3 to 12 replicas and increased proxy-read-timeout to 60s."),
            ("CoreDNS pods CPU throttling causing internal DNS resolution latency on {ci}",
             "Cluster-wide microservice inter-communication degraded due to DNS timeouts.",
             "1 - Critical",
             "Deployed NodeLocal DNSCache DaemonSet and increased CoreDNS replica count from 2 to 6."),
            ("ArgoCD GitOps deployment sync error for microservice namespace on {ci}",
             "Out-of-sync CRD definition causing continuous Helm reconciliation failures.",
             "3 - Moderate",
             "Updated CustomResourceDefinition schema version in master repository and triggered hard refresh.")
        ]
    },
    {
        "category": "Enterprise Apps",
        "subcategory": "ServiceNow & Integrations",
        "group": "ServiceNow Platform Admins",
        "ci_prefixes": ["snow-mid-prod-", "snow-jira-hub-", "snow-spoke-sso-", "snow-dev-instance-", "snow-agent-"],
        "scenarios": [
            ("ServiceNow MID Server down - LDAP discovery and orchestration stopped on {ci}",
             "Production MID server host unreachable; Active Directory scheduled sync failed.",
             "1 - Critical",
             "Renewed expired mutual TLS client certificate in wrapper-override.conf and restarted MID daemon."),
            ("Single Sign-On (SSO) SAML assertion signature verification failure on {ci}",
             "Users in Operations and Finance receiving SAML signature validation errors on login page.",
             "1 - Critical",
             "Imported updated Azure AD IdP Federation Metadata XML certificate into Multi-Provider SSO configuration."),
            ("Jira bi-directional Integration Hub webhook failing with 401 Unauthorized on {ci}",
             "Incidents created in ServiceNow failing to synchronize with engineering Jira backlog.",
             "3 - Moderate",
             "Regenerated expired Jira REST API service token and updated connection alias credentials."),
            ("ServiceNow Flow Designer execution timeout on Employee Offboarding workflow on {ci}",
             "Automated offboarding run queue stuck waiting on REST step response.",
             "2 - High",
             "Added 30s timeout and retry policy on external Okta de-provisioning REST step."),
            ("ServiceNow Email Inbound Action failing to parse vendor alert notifications on {ci}",
             "Automated alert emails from SolarWinds not creating Incident records.",
             "3 - Moderate",
             "Fixed regex pattern in inbound email action script to match new vendor subject format.")
        ]
    },
    {
        "category": "Security",
        "subcategory": "Certificates & SOC",
        "group": "InfoSec & Security Operations",
        "ci_prefixes": ["cert-api-prod-", "cert-checkout-", "waf-cloudflare-", "bastion-jump-", "crowdstrike-agent-"],
        "scenarios": [
            ("SSL/TLS certificate expired for customer endpoint {ci}",
             "Web clients receiving NET::ERR_CERT_DATE_INVALID security warnings upon checkout.",
             "1 - Critical",
             "Re-issued DigiCert wildcard SSL certificate, bound to ALB listener and CloudFront distribution."),
            ("Multiple failed SSH root brute-force attempts detected on {ci}",
             "CrowdStrike Falcon alerted on 3,500 failed login attempts within 10 minutes from foreign IP range.",
             "2 - High",
             "Blocked source CIDR block in AWS Security Group, enforced bastion MFA, and rotated host SSH keys."),
            ("Critical vulnerability CVE-2026-4428 detected in OpenSSL base image on {ci}",
             "Prisma Cloud vulnerability scanner flagged high-severity CVSS 9.8 remote execution risk.",
             "2 - High",
             "Updated Docker base image to alpine:3.20.2 containing patched OpenSSL 3.3.1-r1 and redeployed."),
            ("WAF Rate Limit rule triggered by rogue botnet targeting auth endpoint on {ci}",
             "Over 12,000 login requests/min detected from distributed residential proxies.",
             "2 - High",
             "Configured Cloudflare WAF Managed Challenge rule and throttled suspect IP ASNs."),
            ("Privileged IAM Access Key inactive for 90 days flagged by AWS Security Hub on {ci}",
             "Compliance audit policy violation for unrotated programmatic access keys.",
             "4 - Low",
             "Deactivated and deleted stale IAM programmatic access key; confirmed service role migration.")
        ]
    },
    {
        "category": "Enterprise Apps",
        "subcategory": "Email & Office 365",
        "group": "Workplace IT & Collaboration",
        "ci_prefixes": ["o365-exchange-tenant-", "m365-outlook-client-", "shared-mbx-ap-", "teams-routing-", "sharepoint-online-"],
        "scenarios": [
            ("Exchange Online outbound email delivery delayed by 45 minutes on {ci}",
             "Organization-wide delays delivering emails to external business partner domains.",
             "2 - High",
             "Microsoft tenant advisory EX683921 resolved; outbound routing connectors flushed backlogged queues."),
            ("Outlook desktop client repeatedly prompting for user credentials on {ci}",
             "Finance users unable to sync inbox due to recurring Modern Auth dialog loop.",
             "3 - Moderate",
             "Cleared corrupted Windows Credential Manager cached tokens and refreshed Azure AD device PRT."),
            ("Shared mailbox 'invoices@company.com' reached 50GB storage quota on {ci}",
             "Accounts Payable incoming supplier invoices bouncing with 554 Mailbox Full NDR.",
             "2 - High",
             "Assigned Exchange Online Plan 2 license with auto-expanding archive and enabled 1-year retention."),
            ("SharePoint Online sync client error 0x8004de40 for engineering document library on {ci}",
             "Design engineers unable to sync CAD drawings from cloud SharePoint site.",
             "3 - Moderate",
             "Reset OneDrive/SharePoint sync client registry keys and re-authenticated user profile."),
            ("Microsoft Teams Direct Routing audio stutter and call drops on {ci}",
             "Voice calls terminating prematurely across regional branch offices.",
             "2 - High",
             "Upgraded Session Border Controller (SBC) firmware and adjusted jitter buffer settings.")
        ]
    },
    {
        "category": "Infrastructure",
        "subcategory": "Storage & Backups",
        "group": "Systems Engineering",
        "ci_prefixes": ["netapp-san-lun-", "aws-backup-vault-", "nfs-storage-cluster-", "veeam-backup-srv-", "s3-bucket-archive-"],
        "scenarios": [
            ("Automated daily snapshot backup failed for RDS database on {ci}",
             "AWS Backup job returned status FAILED with AccessDenied on KMS encryption key.",
             "2 - High",
             "Updated KMS key policy statement granting DescribeKey permissions to AWSBackupDefaultServiceRole."),
            ("NFS shared export /mnt/shared mounted read-only on worker servers for {ci}",
             "Batch processing workers failing with [Errno 30] Read-only file system.",
             "2 - High",
             "Cleared NetApp storage controller failover lock and remounted NFS exports with rw,hard options."),
            ("Storage volume /data disk utilization reached 96% on {ci}",
             "Application logs and temp files filling up root partition threatening server crash.",
             "2 - High",
             "Expanded EBS volume size from 250GB to 600GB online using growpart and xfs_growfs."),
            ("Veeam VMware hypervisor backup job failed with CBT error on {ci}",
             "Changed Block Tracking (CBT) corrupted on critical production virtual machine disk.",
             "3 - Moderate",
             "Reset VMware CBT on VM configuration and executed active full backup successfully."),
            ("S3 lifecycle transition rule failing to move objects to Glacier on {ci}",
             "Old audit logs not archiving leading to unexpected monthly cloud storage bill increase.",
             "4 - Low",
             "Corrected invalid prefix filter in S3 lifecycle policy and verified transition schedule.")
        ]
    },
    {
        "category": "DevOps & CI/CD",
        "subcategory": "Build & Deployment Pipelines",
        "group": "DevOps & Release Engineering",
        "ci_prefixes": ["gitlab-runner-pool-", "github-actions-runner-", "sonarqube-server-", "jfrog-artifactory-", "argocd-server-"],
        "scenarios": [
            ("CI/CD build queue congestion - 60 jobs waiting for available runner on {ci}",
             "Developer pull request validation builds stalled due to runner exhaustion.",
             "2 - High",
             "Scaled autoscaling GitLab runner instance group from 5 to 25 worker nodes."),
            ("JFrog Artifactory Docker registry returning 500 Internal Server Error on {ci}",
             "Kubernetes deployments unable to pull container images during release window.",
             "1 - Critical",
             "Resolved disk space pressure on /var/opt/jfrog/artifactory/data and restarted PostgreSQL backend."),
            ("SonarQube static analysis gateway timeout blocking pull request merge on {ci}",
             "Quality gate analysis failing with HTTP 504 on large repository pull requests.",
             "3 - Moderate",
             "Increased SonarQube compute engine worker threads and tuned heap memory allocation."),
            ("Terraform remote state lock stuck on DynamoDB table for {ci}",
             "Automated infrastructure provisioning pipeline blocked by orphan lock.",
             "3 - Moderate",
             "Force-unlocked Terraform state using terraform force-unlock after verifying no active runs."),
            ("GitHub Actions self-hosted runner offline after OS automatic patching on {ci}",
             "Scheduled nightly performance testing pipeline failed to launch.",
             "3 - Moderate",
             "Restarted actions.runner service and configured systemd automatic start on boot.")
        ]
    },
    {
        "category": "Hardware & Datacenter",
        "subcategory": "Servers & Environmental",
        "group": "Datacenter Operations",
        "ci_prefixes": ["dell-poweredge-r750-", "cisco-nexus-core-", "apc-ups-rack-", "pdu-b-feed-", "hpe-proliant-dl380-"],
        "scenarios": [
            ("Dell PowerEdge dual PSU fault - Redundancy lost on {ci}",
             "iDRAC hardware monitor reported Power Supply 2 lost AC input power in Datacenter Row C.",
             "2 - High",
             "Replaced faulty 1400W hot-swap power supply module and restored dual power feed."),
            ("Cisco Nexus core switch fan module failure on {ci}",
             "Chassis temperature alarm triggered; fan tray 3 operating at 0 RPM.",
             "2 - High",
             "Dispatched on-site technician to hot-swap replacement fan module; chassis temp normalized."),
            ("APC Smart-UPS battery replacement warning in Rack {ci}",
             "UPS self-test failed; battery age exceeded 36-month operational threshold.",
             "3 - Moderate",
             "Scheduled maintenance window and replaced modular battery cartridge pack."),
            ("Server rack thermal threshold warning (88°F) in Datacenter Row {ci}",
             "CRAC unit 4 airflow baffle stuck causing localized hot spot.",
             "2 - High",
             "Facilities team repaired motorized damper on CRAC unit; row temperature returned to 68°F."),
            ("RAID controller battery backup unit (BBU) degraded on {ci}",
             "PERC controller switched cache mode from write-back to write-through reducing disk I/O.",
             "3 - Moderate",
             "Replaced degraded lithium-ion BBU battery and restored write-back caching.")
        ]
    },
    {
        "category": "Telephony & Collaboration",
        "subcategory": "VoIP & Video Conferencing",
        "group": "Unified Communications",
        "ci_prefixes": ["zoom-room-boardroom-", "cisco-cucm-cluster-", "genesys-contact-center-", "audiocodes-sbc-", "poly-studio-x50-"],
        "scenarios": [
            ("Boardroom Zoom Room SIP controller failed to register on {ci}",
             "Executive board meeting unable to dial external conference bridge.",
             "2 - High",
             "Updated SIP digest authentication password in Zoom Room admin portal and reconnected device."),
            ("Genesys Contact Center customer support queue dropping incoming calls on {ci}",
             "Customers hearing busy signal when calling toll-free support line.",
             "1 - Critical",
             "Identified SIP trunk channel saturation; carrier increased concurrent call paths from 100 to 300."),
            ("AudioCodes SBC rejecting incoming calls with SIP 403 Forbidden on {ci}",
             "Branch office outbound dialing failing across EMEA sites.",
             "2 - High",
             "Renewed expired TLS certificate on SIP trunk signaling interface."),
            ("Poly Studio conference bar microphone array audio clipping on {ci}",
             "Participants on remote end reporting muffled speech during team standups.",
             "3 - Moderate",
             "Upgraded Polycom device firmware to v4.1.2 and calibrated beamforming acoustic fence."),
            ("Cisco CallManager CDR billing export file transmission failed on {ci}",
             "Telecom accounting report missing daily call detail records.",
             "4 - Low",
             "Fixed SFTP destination server firewall rule and re-sent backlogged CDR files.")
        ]
    },
    {
        "category": "E-Commerce & Payments",
        "subcategory": "Payment Gateways & Billing",
        "group": "Payment Platform Engineering",
        "ci_prefixes": ["stripe-webhook-handler-", "paypal-gateway-api-", "settlement-worker-", "fraud-detection-engine-", "taxjar-calc-service-"],
        "scenarios": [
            ("Stripe webhook delivery failure for subscription invoices on {ci}",
             "Customer accounts remaining in past_due state despite successful credit card charge.",
             "1 - Critical",
             "Resolved idempotency key conflict in webhook handler and re-played failed events via Stripe CLI."),
            ("PayPal checkout API returning 500 Internal Error on {ci}",
             "International shoppers unable to complete PayPal express checkout.",
             "1 - Critical",
             "Updated PayPal SDK client authentication headers following upstream API deprecation."),
            ("Nightly payment settlement reconciliation file transmission delayed on {ci}",
             "Banking partner automated SFTP transfer failed with host key verification error.",
             "2 - High",
             "Updated banking SFTP server public host key in known_hosts file and re-triggered batch job."),
            ("Fraud detection engine latency exceeding 1,200ms per transaction on {ci}",
             "Machine learning scoring model queue backed up causing checkout timeout errors.",
             "2 - High",
             "Scaled SageMaker inference endpoint instances from 2 to 6 and enabled asynchronous scoring."),
            ("Tax calculation service TaxJar rate lookup timeout on {ci}",
             "Shopping cart checkout displaying $0.00 tax calculation warning.",
             "3 - Moderate",
             "Enabled fallback offline cached tax rate table and increased upstream API timeout to 5s.")
        ]
    },
    {
        "category": "End-User Computing",
        "subcategory": "VDI & Desktop Support",
        "group": "Service Desk Tier 2",
        "ci_prefixes": ["citrix-vdi-pool-", "horizon-desktop-vm-", "jamf-mac-mgmt-", "bitlocker-tpm-", "crowdstrike-sensor-"],
        "scenarios": [
            ("Citrix Virtual Apps session freeze on launching Epic EHR on {ci}",
             "Clinical staff unable to open medical records application during shift changeover.",
             "1 - Critical",
             "Cleared disconnected orphaned ICA sessions and restarted Citrix Virtual Delivery Agent service."),
            ("VMware Horizon VDI desktop pool exhausted for offshore contractor team on {ci}",
             "Contractors receiving 'No desktop sources available' error upon login.",
             "2 - High",
             "Expanded Horizon instant-clone pool capacity from 150 to 250 virtual desktops."),
            ("BitLocker recovery key prompt on reboot after BIOS update for laptop fleet on {ci}",
             "Over 40 executive laptops locked at BitLocker PIN screen following security firmware patch.",
             "2 - High",
             "Retrieved BitLocker keys via Intune portal script and suspended BitLocker protection for BIOS upgrade."),
            ("Jamf Pro MDM certificate expiration warning for macOS devices on {ci}",
             "Apple push notification service (APNs) certificate expiring in 7 days.",
             "3 - Moderate",
             "Renewed Apple Push Notification certificate with corporate Apple ID and uploaded to Jamf console."),
            ("CrowdStrike Falcon sensor high CPU usage (100%) on developer MacBooks on {ci}",
             "Developers experiencing severe compile slowdowns during Xcode and Gradle builds.",
             "3 - Moderate",
             "Configured sensor exclusion policy for local build target and node_modules directories.")
        ]
    }
]

CALLER_NAMES = [
    "Elena Rostova", "Marcus Vance", "David Chen", "Sarah Jenkins", "Priya Sharma",
    "Robert Sterling", "Kavita Rao", "Alex Mercer", "Lisa Ray", "Thomas Brown",
    "Sandra Martinez", "Daniel Craig", "Rachel Green", "James Wilson", "Emily Watson",
    "Vikram Patel", "Chloe Bennett", "Ahmed Hassan", "Sophie Dubois", "Lucas Silva",
    "Fatima Al-Mansoor", "Oliver Queen", "Mia Wallace", "Liam O'Connor", "Nina Petrova"
]

records = []
total_target = 581
current_inc_num = 10001
base_date = datetime(2026, 8, 1, 8, 0, 0)

for i in range(total_target):
    inc_id = f"INC{current_inc_num:07d}"
    current_inc_num += 1
    
    # Pick domain round-robin with random scenario
    domain = DOMAINS[i % len(DOMAINS)]
    scenario = random.choice(domain["scenarios"])
    ci_prefix = random.choice(domain["ci_prefixes"])
    ci_num = (i % 30) + 1
    ci_name = f"{ci_prefix}{ci_num:02d}"
    
    short_desc = scenario[0].replace("{ci}", ci_name)
    desc = scenario[1].replace("{ci}", ci_name)
    priority = scenario[2]
    resolution = scenario[3]
    
    # Create realistic timestamp
    days_offset = (i * 28) // total_target
    hours_offset = random.randint(0, 23)
    mins_offset = random.randint(0, 59)
    created_dt = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=mins_offset)
    duration_mins = random.randint(15, 360)
    resolved_dt = created_dt + timedelta(minutes=duration_mins)
    
    caller = random.choice(CALLER_NAMES)
    
    records.append({
        "Number": inc_id,
        "Short description": short_desc,
        "Description": desc,
        "Priority": priority,
        "State": "Resolved",
        "Category": domain["category"],
        "Subcategory": domain["subcategory"],
        "Assignment group": domain["group"],
        "Configuration item": ci_name,
        "Resolution notes": resolution,
        "Caller": caller,
        "Created": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "Resolved": resolved_dt.strftime("%Y-%m-%d %H:%M:%S")
    })

df = pd.DataFrame(records)

# Primary and fallback paths
csv_path = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/servicenow_incidents_sample.csv"
xlsx_path = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/servicenow_incidents_sample.xlsx"
xlsx_path_fallback = "e:/my_projects/vector_space_platform_all/vector-space-platform-main-v4-SNOW/backend/sample_data/servicenow_incidents_sample_580.xlsx"

df.to_csv(csv_path, index=False)

try:
    df.to_excel(xlsx_path, index=False)
    print(f"Saved {len(df)} records to {xlsx_path}")
except PermissionError:
    df.to_excel(xlsx_path_fallback, index=False)
    print(f"Warning: {xlsx_path} was locked by another application. Saved {len(df)} records to {xlsx_path_fallback} instead.")

print(f"Successfully generated {len(df)} realistic ServiceNow incidents in CSV and Excel!")
