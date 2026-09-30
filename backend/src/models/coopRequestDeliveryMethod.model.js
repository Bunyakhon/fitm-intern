const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CoopRequestDeliveryMethod extends Model {
    static associate(models) {
      CoopRequestDeliveryMethod.belongsTo(models.CoopRequest, {
        foreignKey: "coop_request_id",
        as: "coopRequest",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  CoopRequestDeliveryMethod.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      coop_request_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "coop_requests",
          key: "id",
        },
      },
      method: {
        type: DataTypes.ENUM("self_submit", "postal", "email"),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "CoopRequestDeliveryMethod",
      tableName: "coop_request_delivery_methods",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["coop_request_id", "method"],
        },
      ],
    },
  );

  return CoopRequestDeliveryMethod;
};
