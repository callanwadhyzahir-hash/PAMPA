import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Global authentication policy (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_SECRET =
      'global-auth-e2e-secret-with-at-least-32-characters';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/countries (GET) requires authentication', () => {
    return request(app.getHttpServer()).get('/countries').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
