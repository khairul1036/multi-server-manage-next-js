#!/usr/bin/env bash
# Script to create isolated Linux user with strict chmod 700 permissions
set -e

USERNAME="$1"

if [ -z "$USERNAME" ]; then
  echo "Usage: $0 <username>"
  exit 1
fi

# Validate username to prevent injection
if [[ ! "$USERNAME" =~ ^[a-z_][a-z0-9_-]{2,31}$ ]]; then
  echo "Error: Invalid username format"
  exit 1
fi

# Create user with home directory if not exists
if id "$USERNAME" &>/dev/null; then
  echo "User $USERNAME already exists."
else
  useradd -m -s /bin/bash "$USERNAME"
  echo "Created user $USERNAME"
fi

# Enforce User File Isolation
chmod 700 "/home/$USERNAME"
echo "Enforced chmod 700 on /home/$USERNAME"
