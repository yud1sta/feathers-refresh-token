import app from '../../src/app';

describe('\'refresh-tokens\' service', () => {
  it('registered the service', () => {
    const service = app.service('refresh-tokens');
    expect(service).toBeTruthy();
  });
});
