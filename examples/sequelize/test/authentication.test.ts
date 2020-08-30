import app from '../src/app';

describe('authentication', () => {
  it('registered the authentication service', () => {
    expect(app.service('authentication')).toBeTruthy();
  });

  describe('local strategy', () => {
    const userInfo = {
      email: 'someone@example.com',
      password: 'supersecret'
    };

    beforeAll(async () => {
      try {
        await app.service('users').create(userInfo);
      } catch (error) {
        // Do nothing, it just means the user already exists and can be tested
      }
    });

    let user, refreshToken;
    it('authenticates user and creates accessToken and refresh-token', async () => {
      const { user, accessToken, refreshToken } = await app
        .service('authentication')
        .create(
          {
            strategy: 'local',
            ...userInfo
          },
          {}
        );
      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();
      expect(user).toBeTruthy();
    });

    it('logout user', async () => {
      const result = await app.service('authentication').remove(null, {
        authentication: {
          strategy: 'local',
          ...userInfo
        }
      });
      console.log(result);
    });
  });
});
