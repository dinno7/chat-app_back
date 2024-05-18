import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Redis, RedisKey } from 'ioredis';
import redisConfig from './configs/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private __redisClient: Redis;
  constructor(
    @Inject(redisConfig.KEY)
    private redisConfiguration: ConfigType<typeof redisConfig>,
  ) {}

  insert(key: RedisKey, value: string | number | Buffer): Promise<string> {
    return this.__redisClient.set(key, value);
  }
  async validate(
    key: RedisKey,
    value: string | number | Buffer,
  ): Promise<boolean> {
    const stored = await this.__redisClient.get(key);
    return stored === value;
  }
  remove(key: RedisKey): Promise<number> {
    return this.__redisClient.del(key);
  }
  get(key: RedisKey): Promise<string> {
    return this.__redisClient.get(key);
  }
  pushToList(key: RedisKey, ...values: (string | number | Buffer)[]) {
    return this.__redisClient.rpush(key, ...values);
  }
  getList(
    key: RedisKey,
    startIndex: string | number = 0,
    endIndex: string | number = -1,
  ) {
    return this.__redisClient.lrange(key, startIndex, endIndex);
  }
  getElIndexFromList(
    key: RedisKey,
    element: string | number | Buffer,
  ): Promise<number | null> {
    return this.__redisClient.lpos(key, element);
  }
  removeElFromList(
    key: RedisKey,
    element: string | number | Buffer,
    count: number | string = 0,
  ) {
    //? When count is 0 it will remove all matches elements
    return this.__redisClient.lrem(key, count, element);
  }
  pushToSet(key: RedisKey, ...values: (string | number | Buffer)[]) {
    return this.__redisClient.sadd(key, ...values);
  }
  getSetMembers(key: RedisKey) {
    return this.__redisClient.smembers(key);
  }
  removeElFromSet(key: RedisKey, ...elements: (string | number | Buffer)[]) {
    return this.__redisClient.srem(key, ...elements);
  }
  onModuleInit() {
    this.__redisClient = new Redis({
      host: this.redisConfiguration.host,
      port: this.redisConfiguration.port,
    });
  }
  onApplicationShutdown() {
    return this.__redisClient.quit();
  }
}
