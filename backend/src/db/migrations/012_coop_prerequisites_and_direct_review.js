const {DataTypes} = require('sequelize');
const newChecks = `ALTER TABLE coop_request_reviews
  ADD CONSTRAINT coop_reviews_actor_check CHECK (
    (actor_role = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL AND department_staff_id IS NULL)
    OR (actor_role = 'department_staff' AND department_staff_id IS NOT NULL AND teacher_id IS NULL AND student_id IS NULL)
    OR (actor_role IN ('teacher','department_head') AND teacher_id IS NOT NULL AND department_staff_id IS NULL AND student_id IS NULL)),
  ADD CONSTRAINT coop_reviews_transition_check CHECK (
    (actor_role = 'student' AND decision = 'submit' AND from_status = 'new' AND to_status = 'advisor_review')
    OR (actor_role IN ('student','department_staff') AND decision = 'cancel' AND from_status IN ('submitted','advisor_review','staff_review','department_head_review') AND to_status = 'cancelled')
    OR (actor_role = 'teacher' AND from_status IN ('submitted','advisor_review') AND ((decision = 'approve' AND to_status = 'department_head_review') OR (decision = 'reject' AND to_status = 'rejected')))
    OR (actor_role = 'department_head' AND from_status = 'department_head_review' AND ((decision = 'approve' AND to_status = 'approved') OR (decision = 'reject' AND to_status = 'rejected')))) NOT VALID,
  ADD CONSTRAINT coop_reviews_reason_check CHECK (decision NOT IN ('reject','cancel') OR (reason IS NOT NULL AND length(trim(reason)) > 0)) NOT VALID`;
const oldChecks = `ALTER TABLE coop_request_reviews
  ADD CONSTRAINT coop_reviews_actor_check CHECK (
    (actor_role = 'department_staff' AND department_staff_id IS NOT NULL AND teacher_id IS NULL)
    OR (actor_role IN ('teacher','department_head') AND teacher_id IS NOT NULL AND department_staff_id IS NULL)),
  ADD CONSTRAINT coop_reviews_transition_check CHECK (
    (actor_role = 'teacher' AND from_status IN ('submitted','advisor_review') AND ((decision = 'approve' AND to_status = 'staff_review') OR (decision = 'reject' AND to_status = 'rejected')))
    OR (actor_role = 'department_staff' AND from_status = 'staff_review' AND ((decision = 'approve' AND to_status = 'department_head_review') OR (decision = 'reject' AND to_status = 'rejected')))
    OR (actor_role = 'department_head' AND from_status = 'department_head_review' AND ((decision = 'approve' AND to_status = 'approved') OR (decision = 'reject' AND to_status = 'rejected')))),
  ADD CONSTRAINT coop_reviews_reason_check CHECK (decision <> 'reject' OR (reason IS NOT NULL AND length(trim(reason)) > 0))`;
async function dropChecks(qi, transaction) {
  await qi.sequelize.query(`ALTER TABLE coop_request_reviews DROP CONSTRAINT coop_reviews_actor_check, DROP CONSTRAINT coop_reviews_transition_check, DROP CONSTRAINT coop_reviews_reason_check`, {transaction});
}
module.exports = {
  async up({context: qi}) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", {transaction});
      await qi.createTable('coop_request_prerequisite_courses', {
        id: {type: DataTypes.UUID, allowNull: false, primaryKey: true},
        coop_request_id: {type: DataTypes.UUID, allowNull: false, references: {model: 'coop_requests', key: 'id'}, onDelete: 'CASCADE', onUpdate: 'CASCADE'},
        program: {type: DataTypes.STRING(3), allowNull: false}, course_code: {type: DataTypes.STRING(9), allowNull: false},
        course_name: {type: DataTypes.STRING(255), allowNull: false}, english_name: {type: DataTypes.STRING(255), allowNull: true},
        status: {type: DataTypes.STRING(16), allowNull: false}, grade: {type: DataTypes.STRING(10), allowNull: true},
        created_at: {type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal('CURRENT_TIMESTAMP')},
        updated_at: {type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal('CURRENT_TIMESTAMP')},
      }, {transaction});
      await qi.addIndex('coop_request_prerequisite_courses', ['coop_request_id','course_code'], {unique: true, name: 'coop_prerequisites_request_code_unique', transaction});
      await qi.sequelize.query(`ALTER TABLE coop_request_prerequisite_courses
        ADD CONSTRAINT coop_prerequisites_program_code_check CHECK (
          (program = 'IT' AND course_code IN ('060243102','060243104','060243108','060243112','060243122'))
          OR (program = 'INE' AND course_code IN ('060233107','060233112','060233113','060233202','060233204'))),
        ADD CONSTRAINT coop_prerequisites_status_grade_check CHECK (
          (status = 'passed' AND grade IS NOT NULL AND length(trim(grade)) > 0)
          OR (status IN ('studying','unselected') AND grade IS NULL))`, {transaction});
      await qi.addColumn('coop_request_reviews', 'student_id', {type: DataTypes.UUID, allowNull: true, references: {model: 'students', key: 'id'}, onDelete: 'RESTRICT', onUpdate: 'CASCADE'}, {transaction});
      await dropChecks(qi, transaction);
      // NOT VALID preserves existing legacy decision evidence; new inserts and
      // updates must satisfy the corrected transition checks immediately.
      await qi.sequelize.query(newChecks, {transaction});
      // Existing pending staff rows advance without inventing an actor/decision;
      // historical review records retain their original transitions unchanged.
      await qi.sequelize.query("UPDATE coop_requests SET status = 'department_head_review' WHERE status = 'staff_review'", {transaction});
    });
  },
  async down({context: qi}) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", {transaction});
      await qi.sequelize.query('LOCK TABLE coop_request_prerequisite_courses, coop_request_reviews, coop_requests IN ACCESS EXCLUSIVE MODE', {transaction});
      const [rows] = await qi.sequelize.query(`SELECT EXISTS (SELECT 1 FROM coop_request_prerequisite_courses)
        OR EXISTS (SELECT 1 FROM coop_request_reviews WHERE student_id IS NOT NULL OR decision = 'cancel' OR (actor_role = 'teacher' AND to_status = 'department_head_review'))
        OR EXISTS (SELECT 1 FROM coop_requests WHERE status = 'department_head_review') AS has_evidence`, {transaction});
      if (rows[0].has_evidence) throw new Error('012 rollback refused: preserve prerequisite snapshots and direct-review evidence');
      await dropChecks(qi, transaction);
      await qi.sequelize.query(oldChecks, {transaction});
      await qi.removeColumn('coop_request_reviews', 'student_id', {transaction});
      await qi.dropTable('coop_request_prerequisite_courses', {transaction});
    });
  },
};
