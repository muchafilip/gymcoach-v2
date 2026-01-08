#!/bin/bash
# Clean restart for Expo app

echo "🧹 Cleaning cache..."
rm -rf .expo
rm -rf node_modules/.cache

echo "📱 Starting Expo with clear cache..."
npx expo start --clear
