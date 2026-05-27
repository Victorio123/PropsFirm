import { execSync } from 'child_process';

const uri = process.env.POSTGRES_URI;
if (!uri || !uri.startsWith('postgres') || uri.includes('localhost:5432/mydb')) {
  console.log('No valid POSTGRES_URI found in environment. Skipping Prisma push.');
  process.exit(0);
}

try {
  console.log('Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
} catch (error) {
  console.error('Prisma push failed:', error.message);
  process.exit(1);
}
