import { Test, TestingModule } from '@nestjs/testing';
import { Controller } from './product.controller';
import { Service } from './product.service';

describe('Controller', () => {
  let controller: Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Controller],
      providers: [Service],
    }).compile();

    controller = module.get<Controller>(Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
