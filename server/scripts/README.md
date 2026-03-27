# Global Credits Migration Scripts

This directory contains scripts to migrate users from the legacy individual credit system to the new unified global credit system.

## Overview

The new global credit system simplifies credit management by using a single credit pool for all services instead of separate credits for each service type.

### Credit Costs in New System
- **Post Generation** (manual posts): 5 credits
- **Caption Generation**: 5 credits
- **Automation Creation**: 10 credits
- **Automation Execution** (text only): 5 credits
- **Automation Execution** (with image): 15 credits

### Monthly Credit Addition
- All users receive +100 credits every month (accumulative, not reset)
- Credits are added on the 1st of each month at 1 AM

## Scripts

### 1. migrateUsersToGlobalCredits.js

Migrates existing users from legacy credit system to global credits.

**Usage:**
```bash
# Dry run (preview changes without making them)
node scripts/migrateUsersToGlobalCredits.js --dry-run

# Actual migration
node scripts/migrateUsersToGlobalCredits.js
```

**What it does:**
- Finds all users in the system
- Calculates equivalent global credits from their legacy credits
- Enables global credit system for each user
- Sets initial credit balance (minimum 100 credits)
- Clears legacy credit data from user records

**Migration Logic:**
- Converts remaining legacy credits to global credits based on service costs
- Ensures all users start with at least 100 global credits
- Preserves credit value by calculating equivalent amounts

### 2. verifyGlobalCredits.js

Verifies the global credit system is working correctly after migration.

**Usage:**
```bash
# Test all users (first 3)
node scripts/verifyGlobalCredits.js

# Test specific user
node scripts/verifyGlobalCredits.js --user-email user@example.com
```

**What it tests:**
- Global credit system statistics
- Individual user credit operations
- Service cost calculations
- Credit availability checks
- Monthly credit addition functionality

## Migration Steps

1. **Backup Database**
   ```bash
   mongodump --uri="your-mongo-uri" --db=masterAiApiKey
   ```

2. **Run Dry Run Migration**
   ```bash
   node scripts/migrateUsersToGlobalCredits.js --dry-run
   ```
   Review the output to ensure migration will work correctly.

3. **Run Actual Migration**
   ```bash
   node scripts/migrateUsersToGlobalCredits.js
   ```

4. **Verify Migration**
   ```bash
   node scripts/verifyGlobalCredits.js
   ```

5. **Test Specific Users** (optional)
   ```bash
   node scripts/verifyGlobalCredits.js --user-email admin@example.com
   ```

## Migration Safety

- **Dry Run Mode**: Always test with `--dry-run` first
- **Batch Processing**: Users are processed in batches of 10 to avoid database overload
- **Error Handling**: Failed migrations are logged with detailed error information
- **Idempotent**: Safe to run multiple times (skips already migrated users)
- **No Data Loss**: Legacy credit data is preserved until migration is verified

## Post-Migration Checklist

- [ ] All users have global credits enabled
- [ ] Credit balances are reasonable (minimum 100 credits per user)
- [ ] API endpoints return new global credit structure
- [ ] Frontend components display global credits correctly
- [ ] Monthly credit addition cron job is running
- [ ] Legacy credit system is disabled

## Troubleshooting

### Common Issues

**"User credits structure is not properly initialized"**
- Run verification script to check user credit status
- Re-run migration for specific users if needed

**"Cannot find User model"**
- Ensure you're running from the correct directory
- Check MongoDB connection string in .env file

**"Permission denied"**
- Make scripts executable: `chmod +x scripts/*.js`

### Recovery

If migration fails:
1. Restore database from backup
2. Fix any issues identified in error logs
3. Re-run migration with dry-run mode
4. Proceed with actual migration

## Support

If you encounter issues during migration:
1. Check the error logs in the script output
2. Verify database connection and permissions
3. Ensure all environment variables are set correctly
4. Test with a single user first using the verification script

## Files Created/Modified

### Backend Models
- `models/Credit.js` - Updated with global credit methods
- `models/User.js` - Simplified to use global credits

### Backend Routes
- `routes/credits.js` - Updated for global credit API
- `routes/auth.js` - Updated credit deduction endpoint
- `routes/posts.js` - Added credit consumption to post creation

### Backend Services
- `services/schedulerService.js` - Updated for dynamic credit consumption
- `services/creditResetService.js` - Added monthly credit addition

### Frontend Components
- `Components/credits/CreditDisplay.jsx` - Updated for global credits
- `Components/credits/AutomationCreditDisplay.jsx` - Updated for global credits
- `features/api/creditsApiSlice.ts` - Updated interfaces for global credits

## Cron Jobs

The following cron job is automatically set up for monthly credit additions:

```javascript
// Runs on 1st of every month at 1 AM
cron.schedule('0 1 1 * *', async () => {
  await creditResetService.addMonthlyGlobalCredits();
});
```

Manual trigger available via API:
```bash
POST /api/credits/add-monthly-credits
Authorization: Bearer <admin-token>
```