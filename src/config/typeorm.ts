import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { TlsOptions } from 'tls';

dotenvConfig({ path: '.env' });

const parseBool = (v?: string) =>
  !!v && ['true', '1', 'yes'].includes(v.toLowerCase().trim());

const isPostgresSsl = parseBool(process.env.POSTGRES_SSL);

let sslOption: boolean | TlsOptions | undefined = false;
if (isPostgresSsl) {
  try {
    const certPath = path.resolve('global-bundle.pem');
    const ca = fs.readFileSync(certPath, 'utf8');
    sslOption = { rejectUnauthorized: true, ca };
  } catch (err) {
    // If the cert can't be read, fail early so it's obvious (optional)
    console.error('Failed to read Postgres SSL CA file:', err);
    throw err;
  }
}

const config = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/config/migrations/*{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: true,
  ssl: sslOption,
};

export default registerAs('typeorm-config', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
