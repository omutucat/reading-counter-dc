#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
SERVICE_ACCOUNT_ID="github-actions-deployer"
DISPLAY_NAME="GitHub Actions Cloud Functions Deployer"
ROLES=(
  "roles/cloudfunctions.developer"
  "roles/iam.serviceAccountUser"
  "roles/storage.objectViewer"
  "roles/run.admin" # Added for Cloud Functions (2nd gen) deployment
)
KEY_FILE_NAME="github-actions-key.json"

# --- Functions ---
get_project_id() {
  gcloud config get-value project 2>/dev/null
}

# --- Main Script ---

echo "--- Google Cloud Service Account Setup Script ---"

# 1. Get Project ID
PROJECT_ID=$(get_project_id)
if [ -z "$PROJECT_ID" ]; then
  echo "Error: Google Cloud project ID not found."
  echo "Please ensure you are authenticated and a project is selected (e.g., gcloud auth login && gcloud config set project YOUR_PROJECT_ID)."
  exit 1
fi
echo "Using Google Cloud Project ID: $PROJECT_ID"

SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

# 2. Create Service Account
echo ""
echo "2. Creating service account: ${SERVICE_ACCOUNT_ID}..."
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" &>/dev/null; then
  echo "Service account '${SERVICE_ACCOUNT_ID}' already exists. Skipping creation."
else
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_ID}" \
    --display-name="${DISPLAY_NAME}"
  echo "Service account '${SERVICE_ACCOUNT_ID}' created."
fi

# 3. Grant Roles to Service Account
echo ""
echo "3. Granting necessary IAM roles to ${SERVICE_ACCOUNT_EMAIL}..."
for ROLE in "${ROLES[@]}"; do
  echo "  - Granting role: ${ROLE}"
  if gcloud projects get-iam-policy "${PROJECT_ID}" \
    --flatten="bindings[].members" \
    --format="value(bindings.role)" \
    | grep -q "${ROLE}.*serviceAccount:${SERVICE_ACCOUNT_EMAIL}"; then
    echo "    Role '${ROLE}' already granted. Skipping."
  else
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
      --role="${ROLE}" \
      --condition=None # Ensure no conditions are added by default
    echo "    Role '${ROLE}' granted."
  fi
done

# 4. Generate and Download Service Account Key
echo ""
echo "4. Generating JSON key for ${SERVICE_ACCOUNT_EMAIL}..."
KEY_FILE_PATH="${HOME}/${KEY_FILE_NAME}"
if [ -f "${KEY_FILE_PATH}" ]; then
  read -p "Key file '${KEY_FILE_PATH}' already exists. Overwrite? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping key generation. Please manually retrieve the key if needed."
    exit 0
  fi
fi

gcloud iam service-accounts keys create "${KEY_FILE_PATH}" \
  --iam-account="${SERVICE_ACCOUNT_EMAIL}"

echo ""
echo "Service account key generated at: ${KEY_FILE_PATH}"
echo "IMPORTANT: Copy the content of this file and add it as a GitHub Secret (e.g., GCP_SA_KEY) in your repository settings."
echo "Then, delete the local key file for security reasons: rm ${KEY_FILE_PATH}"
echo ""
echo "--- Setup Complete ---"
