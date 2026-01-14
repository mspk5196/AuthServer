#!/bin/bash

# Group Management Features Setup Script
# This script sets up the new group management features

echo "🚀 Setting up Group Management Features..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your database credentials."
    exit 1
fi

# Load environment variables
source .env

echo "📊 Running database migration..."

# Run the migration
psql "${DATABASE_URL:-postgresql://localhost/auth_server}" -f migrations/007_group_management_features.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed! Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server: npm start"
echo "2. Access the CPanel and navigate to Groups"
echo "3. Click ⚙️ Settings on any group to access new features"
echo ""
echo "📖 For detailed documentation, see GROUP_MANAGEMENT_FEATURES.md"
