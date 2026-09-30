const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CoopRequest extends Model {
    static associate(models) {
      CoopRequest.belongsTo(models.Student, {
        foreignKey: "student_id",
        as: "student",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      CoopRequest.hasMany(models.CoopRequestDeliveryMethod, {
        foreignKey: "coop_request_id",
        as: "deliveryMethods",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  CoopRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
      },
      company_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      company_province: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      letter_recipient_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      letter_recipient_position_department: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      company_address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      work_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      work_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "submitted",
          "staff_review",
          "advisor_review",
          "department_head_review",
          "approved",
          "document_issued",
          "in_progress",
          "rejected",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "submitted",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      document_issued_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CoopRequest",
      tableName: "coop_requests",
      underscored: true,
      timestamps: true,
      validate: {
        workPeriodIsValid() {
          if (
            this.work_start_date &&
            this.work_end_date &&
            this.work_end_date < this.work_start_date
          ) {
            throw new Error("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มปฏิบัติงาน");
          }
        },
      },
    },
  );

  return CoopRequest;
};
