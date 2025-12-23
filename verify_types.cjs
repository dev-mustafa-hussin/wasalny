const fs = require('fs');
const content = fs.readFileSync('m:\\WEP\\Wasalny\\src\\integrations\\supabase\\types.ts', 'utf8');

const checks = [
  { name: 'app_role enum', res: content.includes('"admin" | "customer" | "driver" | "store_owner"') },
  { name: 'stores status col', res: /stores: \{[\s\S]*?status: "pending" | "approved" | "rejected"/.test(content) },
  { name: 'drivers status col', res: /drivers: \{[\s\S]*?status: "pending" | "approved" | "rejected"/.test(content) }
];

console.log('--- VERIFICATION RESULTS ---');
checks.forEach(c => console.log(`${c.res ? '✅' : '❌'} ${c.name}`));

if (checks.every(c => c.res)) {
  console.log('\nAll code level checks passed!');
} else {
  console.log('\nSome code level checks failed.');
  process.exit(1);
}
