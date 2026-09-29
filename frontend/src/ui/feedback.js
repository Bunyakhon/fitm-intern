const FEEDBACK_ROOT_ID = "appFeedback";

function getFeedbackRoot() {
  let root = document.getElementById(FEEDBACK_ROOT_ID);

  if (!root) {
    root = document.createElement("div");
    root.id = FEEDBACK_ROOT_ID;
    root.className = "app-feedback";
    document.body.append(root);
  }

  return root;
}

export function showToast(message, type = "info", options = {}) {
  const { duration = 4500 } = options;
  const root = getFeedbackRoot();
  const toast = document.createElement("div");
  const isError = type === "error" || type === "warning";

  toast.className = `app-toast app-toast--${type}`;
  toast.setAttribute("role", isError ? "alert" : "status");
  toast.setAttribute("aria-live", isError ? "assertive" : "polite");
  toast.innerHTML = `
    <span class="app-toast__icon" aria-hidden="true"></span>
    <p class="app-toast__message"></p>
    <button class="app-toast__close" type="button" aria-label="ปิดข้อความ">×</button>
  `;
  toast.querySelector(".app-toast__message").textContent = message;
  root.append(toast);

  let timeoutId = window.setTimeout(removeToast, duration);
  toast.querySelector(".app-toast__close").addEventListener("click", removeToast);

  function removeToast() {
    window.clearTimeout(timeoutId);
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 180);
  }

  return toast;
}

export function setButtonLoading(button, isLoading, loadingLabel, defaultLabel) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = defaultLabel || button.textContent.trim();
  }

  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.setAttribute("aria-busy", String(isLoading));
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
}

export function showConfirmModal({
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  loadingLabel = "กำลังดำเนินการ...",
  closeOnBackdrop = false,
  onConfirm,
}) {
  const root = getFeedbackRoot();
  const previousFocus = document.activeElement;
  const modal = document.createElement("div");

  modal.className = "app-confirm-overlay";
  modal.innerHTML = `
    <section class="app-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle" aria-describedby="appConfirmMessage">
      <div class="app-confirm-modal__icon" aria-hidden="true">!</div>
      <h2 id="appConfirmTitle"></h2>
      <p id="appConfirmMessage"></p>
      <div class="app-confirm-modal__actions">
        <button class="app-confirm-modal__cancel" type="button"></button>
        <button class="app-confirm-modal__confirm" type="button"></button>
      </div>
    </section>
  `;

  const cancelButton = modal.querySelector(".app-confirm-modal__cancel");
  const confirmButton = modal.querySelector(".app-confirm-modal__confirm");
  modal.querySelector("#appConfirmTitle").textContent = title;
  modal.querySelector("#appConfirmMessage").textContent = message;
  cancelButton.textContent = cancelLabel;
  confirmButton.textContent = confirmLabel;
  root.append(modal);
  document.body.classList.add("has-app-modal");
  confirmButton.focus();

  let isSubmitting = false;

  function close() {
    if (isSubmitting) {
      return;
    }

    modal.classList.add("is-leaving");
    document.body.classList.remove("has-app-modal");
    document.removeEventListener("keydown", handleEscape);
    window.setTimeout(() => {
      modal.remove();
      previousFocus?.focus?.();
    }, 180);
  }

  cancelButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (closeOnBackdrop && event.target === modal) {
      close();
    }
  });
  document.addEventListener("keydown", function handleEscape(event) {
    if (event.key !== "Escape") {
      return;
    }

    close();
  });
  confirmButton.addEventListener("click", async () => {
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    cancelButton.disabled = true;
    setButtonLoading(confirmButton, true, loadingLabel, confirmLabel);

    try {
      await onConfirm?.();
      isSubmitting = false;
      close();
    } catch (error) {
      isSubmitting = false;
      cancelButton.disabled = false;
      setButtonLoading(confirmButton, false, loadingLabel, confirmLabel);
      throw error;
    }
  });
}
