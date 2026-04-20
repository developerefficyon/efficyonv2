/**
 * GCP Recommender Catalog
 *
 * Maps each Google Recommender type to our internal finding type, default
 * severity, UI label, and location scope. Location scope determines whether
 * we call the recommender once per region, once per zone, or once globally
 * per project.
 */

const GCP_RECOMMENDER_CATALOG = [
  // Compute
  { id: "google.compute.instance.IdleResourceRecommender",     type: "IDLE_VM",                severity: "high",   label: "Idle Compute VM",                 locationScope: "zone"    },
  { id: "google.compute.instance.MachineTypeRecommender",      type: "OVERSIZED_VM",           severity: "medium", label: "Oversized VM",                    locationScope: "zone"    },
  { id: "google.compute.disk.IdleResourceRecommender",         type: "UNATTACHED_DISK",        severity: "medium", label: "Unattached Persistent Disk",      locationScope: "zone"    },
  { id: "google.compute.address.IdleResourceRecommender",      type: "UNUSED_STATIC_IP",       severity: "low",    label: "Unused Static IP",                locationScope: "region"  },
  { id: "google.compute.commitment.UsageCommitmentRecommender",type: "MISSING_CUD",            severity: "high",   label: "Missing Committed Use Discount",  locationScope: "region"  },
  // BigQuery
  { id: "google.bigquery.capacityCommitments.Recommender",     type: "BQ_CAPACITY",            severity: "high",   label: "BigQuery Capacity Commitment",    locationScope: "global"  },
  { id: "google.bigquery.table.PartitionClusterRecommender",   type: "BQ_PARTITION",           severity: "medium", label: "BigQuery Partition/Cluster",      locationScope: "global"  },
  // Cloud SQL
  { id: "google.cloudsql.instance.IdleRecommender",            type: "IDLE_CLOUDSQL",          severity: "high",   label: "Idle Cloud SQL Instance",         locationScope: "global"  },
  { id: "google.cloudsql.instance.OverprovisionedRecommender", type: "OVERSIZED_CLOUDSQL",     severity: "medium", label: "Overprovisioned Cloud SQL",       locationScope: "global"  },
  // Cloud Storage
  { id: "google.cloudstorage.bucket.SoftDeleteRecommender",    type: "BUCKET_SOFT_DELETE",     severity: "low",    label: "Cloud Storage Soft Delete",       locationScope: "global"  },
  // IAM
  { id: "google.iam.serviceAccount.ChangeRiskRecommender",     type: "UNUSED_SERVICE_ACCOUNT", severity: "low",    label: "Unused Service Account",          locationScope: "global"  },
]

// Google recommendation.priority → our severity
const PRIORITY_TO_SEVERITY = {
  P1: "critical",
  P2: "high",
  P3: "medium",
  P4: "low",
}

function severityForRecommendation(defaultSeverity, priority) {
  if (priority && PRIORITY_TO_SEVERITY[priority]) return PRIORITY_TO_SEVERITY[priority]
  return defaultSeverity
}

module.exports = {
  GCP_RECOMMENDER_CATALOG,
  PRIORITY_TO_SEVERITY,
  severityForRecommendation,
}
