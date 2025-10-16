import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as fs from 'fs';
dotenvConfig({ path: '.env' });

const config = {
  type: 'postgres',
  host: `${process.env.POSTGRES_HOST}`,
  port: +`${process.env.POSTGRES_PORT}`,
  username: `${process.env.POSTGRES_USER}`,
  password: `${process.env.POSTGRES_PASSWORD}`,
  database: `${process.env.POSTGRES_DB}`,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/config/migrations/*{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: true,
  ssl: process.env.POSTGRES_SSL
    ? 
    {rejectUnauthorized: true,
    ca: fs.readFileSync('global-bundle.pem').toString(),}
    : false,
};

export default registerAs('typeorm-config', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
