// Hard-deletes accounts whose 30-day deletion window has passed. Usage: npm run account:purge (same AYAN_DB_FILE / DATABASE_URL as the server).
process.env.AYAN_SEED_ONLY='1';
const {Billing}=await import('../server.mjs');
console.log('purged accounts:',await Billing.purgeDue());
process.exit(0);
