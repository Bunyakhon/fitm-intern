const { DataTypes, Model } = require("sequelize");
module.exports = (sequelize) => {
  class CoopRequestReview extends Model {
    static associate(models) {
      CoopRequestReview.belongsTo(models.CoopRequest, {
        foreignKey: "coop_request_id",
        as: "request",
        onDelete: "RESTRICT",
      });
      CoopRequestReview.belongsTo(models.Teacher, {
        foreignKey: "teacher_id",
        as: "teacher",
        onDelete: "RESTRICT",
      });
      CoopRequestReview.belongsTo(models.DepartmentStaff, {
        foreignKey: "department_staff_id",
        as: "staff",
        onDelete: "RESTRICT",
      });
    }
  }
  CoopRequestReview.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      coop_request_id: { type: DataTypes.UUID, allowNull: false },
      actor_role: { type: DataTypes.STRING(32), allowNull: false },
      teacher_id: { type: DataTypes.UUID, allowNull: true },
      department_staff_id: { type: DataTypes.UUID, allowNull: true },
      from_status: { type: DataTypes.STRING(32), allowNull: false },
      to_status: { type: DataTypes.STRING(32), allowNull: false },
      decision: { type: DataTypes.STRING(16), allowNull: false },
      reason: { type: DataTypes.STRING(2000), allowNull: true },
    },
    {
      sequelize,
      modelName: "CoopRequestReview",
      tableName: "coop_request_reviews",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );
  return CoopRequestReview;
};
