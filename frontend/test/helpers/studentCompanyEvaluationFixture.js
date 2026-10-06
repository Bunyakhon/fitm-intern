import { initCompanyEvaluation } from "../../src/pages/studentCompanyEvaluation.js";
import { projectFixture } from "./studentCoopProjectFixture.js";

// Reuses the existing HTML-derived DOM and real shared feedback implementation.
// This exercises handlers and accessible markup, not browser/CSS rendering.
export function evaluationFixture(adapters = {}) {
  const base = projectFixture();
  const { document, context } = base;
  const calls = [], toasts = [];
  let saved = null;
  const defaults = {
    getEvaluation: async () => ({ student: { name: "นักศึกษา ทดสอบ" }, mentor: { name: "พี่เลี้ยง ทดสอบ" },
      display: { student_id: "-", major: "-", company_name: "-", mentor_position: "-", work_period: "-", evaluation_date: "-" }, evaluation: saved }),
    saveEvaluation: async body => {
      calls.push(body);
      const total = [1, 2, 3, 4, 5].reduce((sum, n) => sum + body[`q${n}_score`], 0);
      saved = { id: "fixture-evaluation", ...body, total_score: total, average_score: total / 5 };
      return defaults.getEvaluation();
    },
    ...adapters,
  };
  const controller = initCompanyEvaluation({ document,
    getEvaluation: () => defaults.getEvaluation(), saveEvaluation: body => defaults.saveEvaluation(body),
    setButtonLoading: context.setButtonLoading, formatDate: context.formatDate,
    showToast: (message, type) => { toasts.push({ message, type }); return context.showToast(message, type); },
  });
  const get = id => document.getElementById(id);
  return { document, get, calls, toasts, load: controller.load,
    save: () => get("companyEvaluationForm").dispatch("submit"),
    async scores(values) { for (let index = 0; index < values.length; index++) { const input = get(`evaluationQ${index + 1}`); input.value = String(values[index]); await input.dispatch("change"); } },
    adapters: values => Object.assign(defaults, values),
  };
}
