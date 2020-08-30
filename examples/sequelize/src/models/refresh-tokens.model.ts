// See http://docs.sequelizejs.com/en/latest/docs/models-definition/
// for more of what you can do here.
import { Sequelize, DataTypes } from 'sequelize';
import { Application } from '../declarations';

export default function (app: Application) {
  const sequelizeClient: Sequelize = app.get('sequelizeClient');
  const refreshTokens = sequelizeClient.define(
    'refresh_tokens',
    {
      userId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isValid: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      expiredAt: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      hooks: {
        beforeCount(options: any) {
          options.raw = true;
        }
      }
    }
  );

  // eslint-disable-next-line no-unused-vars
  (refreshTokens as any).associate = function (models: any) {
    // Define associations here
    // See http://docs.sequelizejs.com/en/latest/docs/associations/
  };

  return refreshTokens;
}
