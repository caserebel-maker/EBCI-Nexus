# EBCI Nexus Rules

## Vercel Hobby Plan Restrictions
- **Cron Jobs**: Vercel Hobby accounts are limited to daily cron jobs (maximum once per day frequency, e.g., `"schedule": "0 0 * * *"`). Setting schedules like `*/30 * * * *` will cause Vercel to fail the build validation and reject deployment without warning logs. 
- **Workaround**: Always consolidate cron jobs into a single `/api/cron` route, set it to run daily to pass Vercel Hobby validation, and use a free third-party cron scheduler (such as Cron-Job.org) to ping the endpoint at higher frequencies (e.g., every 30 minutes).
