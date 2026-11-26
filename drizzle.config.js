import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'sqlite', schema: './cloud/schema.js', out: './drizzle' });
