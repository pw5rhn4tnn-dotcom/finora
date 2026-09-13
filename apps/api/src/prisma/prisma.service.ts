import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { createDatabaseClient, databaseUrl } from './client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = createDatabaseClient(databaseUrl());

  async onModuleInit() {
    await this.client.$connect();
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
  async isReady() {
    await this.client.$queryRaw`SELECT 1`;
  }
}
