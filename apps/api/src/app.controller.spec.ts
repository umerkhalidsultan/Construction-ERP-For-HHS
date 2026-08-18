import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns health payload', () => {
    const controller = new AppController(new AppService());
    const health = controller.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('Construction ERP API');
  });
});
