import { BcryptService } from './bcrypt.service';

describe('BcryptService', () => {
  it('should be defined', () => {
    expect(new BcryptService()).toBeDefined();
  });
});
