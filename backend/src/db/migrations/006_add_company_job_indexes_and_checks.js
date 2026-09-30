module.exports = {
  async up({ context: queryInterface }) {
    const { sequelize } = queryInterface;
    const indexes = [
      [
        "companies",
        ["normalized_name"],
        { name: "companies_normalized_name_idx" },
      ],
      [
        "companies",
        ["normalized_email"],
        { name: "companies_normalized_email_idx" },
      ],
      ["companies", ["province"], { name: "companies_province_idx" }],
      [
        "job_submissions",
        ["company_id", "verification_status"],
        { name: "job_submissions_company_status_idx" },
      ],
      ["job_postings", ["company_id"], { name: "job_postings_company_id_idx" }],
      [
        "job_postings",
        ["status", "category", "published_at"],
        { name: "job_postings_browse_idx" },
      ],
      ["job_postings", ["expires_at"], { name: "job_postings_expires_at_idx" }],
      [
        "job_posting_work_modes",
        ["job_posting_id", "mode"],
        { unique: true, name: "job_posting_work_modes_posting_mode_uq" },
      ],
      [
        "job_posting_work_modes",
        ["mode", "job_posting_id"],
        { name: "job_posting_work_modes_mode_posting_idx" },
      ],
      [
        "company_access_tokens",
        ["token_hash"],
        { unique: true, name: "company_access_tokens_token_hash_uq" },
      ],
      [
        "company_access_tokens",
        ["company_id", "purpose"],
        { name: "company_access_tokens_company_purpose_idx" },
      ],
      [
        "company_access_tokens",
        ["expires_at"],
        { name: "company_access_tokens_expires_at_idx" },
      ],
    ];
    for (const [table, fields, options] of indexes) {
      await queryInterface.addIndex(table, fields, options);
    }

    await sequelize.query(
      `ALTER TABLE job_submissions ADD CONSTRAINT job_submissions_verification_status_check CHECK (verification_status IN ('pending_email_verification', 'verified', 'expired', 'cancelled'))`,
    );
    await sequelize.query(
      `ALTER TABLE job_postings ADD CONSTRAINT job_postings_quota_check CHECK (quota BETWEEN 1 AND 9999)`,
    );
    await sequelize.query(
      `ALTER TABLE job_postings ADD CONSTRAINT job_postings_work_days_check CHECK (work_days_per_week BETWEEN 1 AND 7)`,
    );
    await sequelize.query(
      `ALTER TABLE job_postings ADD CONSTRAINT job_postings_category_check CHECK (category IN ('information_technology', 'business', 'design', 'engineering', 'other'))`,
    );
    await sequelize.query(
      `ALTER TABLE job_postings ADD CONSTRAINT job_postings_status_check CHECK (status IN ('pending_email_verification', 'pending_review', 'published', 'rejected', 'withdrawn', 'expired'))`,
    );
    await sequelize.query(
      `ALTER TABLE job_posting_work_modes ADD CONSTRAINT job_posting_work_modes_mode_check CHECK (mode IN ('onsite', 'work_from_home', 'hybrid'))`,
    );
    await sequelize.query(
      `ALTER TABLE company_access_tokens ADD CONSTRAINT company_access_tokens_purpose_check CHECK (purpose IN ('email_verification', 'management_access'))`,
    );
    await sequelize.query(
      `ALTER TABLE company_access_tokens ADD CONSTRAINT company_access_tokens_scope_check CHECK ((purpose = 'email_verification' AND job_submission_id IS NOT NULL) OR (purpose = 'management_access' AND job_submission_id IS NULL))`,
    );
    await sequelize.query(
      `ALTER TABLE company_access_tokens ADD CONSTRAINT company_access_tokens_expiry_check CHECK (expires_at > created_at)`,
    );
  },

  async down({ context: queryInterface }) {
    const { sequelize } = queryInterface;
    const constraints = [
      ["company_access_tokens", "company_access_tokens_expiry_check"],
      ["company_access_tokens", "company_access_tokens_scope_check"],
      ["company_access_tokens", "company_access_tokens_purpose_check"],
      ["job_posting_work_modes", "job_posting_work_modes_mode_check"],
      ["job_postings", "job_postings_status_check"],
      ["job_postings", "job_postings_category_check"],
      ["job_postings", "job_postings_work_days_check"],
      ["job_postings", "job_postings_quota_check"],
      ["job_submissions", "job_submissions_verification_status_check"],
    ];
    for (const [table, constraint] of constraints) {
      await sequelize.query(
        `ALTER TABLE ${table} DROP CONSTRAINT ${constraint}`,
      );
    }
    const indexes = [
      ["company_access_tokens", "company_access_tokens_expires_at_idx"],
      ["company_access_tokens", "company_access_tokens_company_purpose_idx"],
      ["company_access_tokens", "company_access_tokens_token_hash_uq"],
      ["job_posting_work_modes", "job_posting_work_modes_mode_posting_idx"],
      ["job_posting_work_modes", "job_posting_work_modes_posting_mode_uq"],
      ["job_postings", "job_postings_expires_at_idx"],
      ["job_postings", "job_postings_browse_idx"],
      ["job_postings", "job_postings_company_id_idx"],
      ["job_submissions", "job_submissions_company_status_idx"],
      ["companies", "companies_province_idx"],
      ["companies", "companies_normalized_email_idx"],
      ["companies", "companies_normalized_name_idx"],
    ];
    for (const [table, name] of indexes) {
      await queryInterface.removeIndex(table, name);
    }
  },
};
