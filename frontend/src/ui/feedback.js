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

export function showActionModal({
  title,
  message,
  detail = "",
  actionLabel,
  closeLabel = "ปิด",
  onAction,
}) {
  const root = getFeedbackRoot();
  const previousFocus = document.activeElement;
  const modal = document.createElement("div");
  modal.className = "app-confirm-overlay app-alert-overlay";
  modal.innerHTML = `
    <section class="app-confirm-modal app-alert-modal" role="alertdialog" aria-modal="true" aria-labelledby="appAlertTitle" aria-describedby="appAlertMessage">
      <div class="app-confirm-modal__icon app-alert-modal__icon" aria-hidden="true">!</div>
      <h2 id="appAlertTitle"></h2>
      <p id="appAlertMessage"></p>
      <p class="app-alert-modal__detail"></p>
      <div class="app-confirm-modal__actions">
        <button class="app-confirm-modal__cancel" type="button"></button>
        <button class="app-confirm-modal__confirm" type="button"></button>
      </div>
    </section>
  `;
  modal.querySelector("#appAlertTitle").textContent = title;
  modal.querySelector("#appAlertMessage").textContent = message;
  const detailElement = modal.querySelector(".app-alert-modal__detail");
  detailElement.textContent = detail;
  detailElement.hidden = !detail;
  const closeButton = modal.querySelector(".app-confirm-modal__cancel");
  const actionButton = modal.querySelector(".app-confirm-modal__confirm");
  closeButton.textContent = closeLabel;
  actionButton.textContent = actionLabel;
  root.append(modal);
  document.body.classList.add("has-app-modal");

  let isClosed = false;
  function close(restoreFocus = true) {
    if (isClosed) return;
    isClosed = true;
    modal.classList.add("is-leaving");
    document.body.classList.remove("has-app-modal");
    document.removeEventListener("keydown", handleEscape);
    window.setTimeout(() => {
      modal.remove();
      if (restoreFocus) previousFocus?.focus?.();
    }, 180);
  }
  function handleEscape(event) {
    if (event.key === "Escape") close();
  }
  closeButton.addEventListener("click", () => close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", handleEscape);
  actionButton.addEventListener("click", () => {
    close(false);
    onAction?.();
  });
  actionButton.focus();
  return close;
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
  reasonLabel = "",
  reasonMaxLength = 2000,
  onClose,
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
  let reasonInput;
  if (reasonLabel) {
    const label = document.createElement("label");
    label.className = "app-confirm-modal__reason";
    label.textContent = reasonLabel;
    reasonInput = document.createElement("textarea");
    reasonInput.required = true;
    reasonInput.maxLength = reasonMaxLength;
    reasonInput.rows = 4;
    label.append(reasonInput);
    modal.querySelector(".app-confirm-modal").append(label);
  }
  const errorMessage = document.createElement("p");
  errorMessage.className = "app-confirm-modal__error";
  errorMessage.setAttribute("role", "alert");
  modal.querySelector(".app-confirm-modal").append(errorMessage, modal.querySelector(".app-confirm-modal__actions"));
  cancelButton.textContent = cancelLabel;
  confirmButton.textContent = confirmLabel;
  root.append(modal);
  document.body.classList.add("has-app-modal");
  confirmButton.focus();

  let isSubmitting = false;
  let isClosed = false;

  function close() {
    if (isSubmitting || isClosed) {
      return;
    }

    isClosed = true;
    modal.classList.add("is-leaving");
    document.body.classList.remove("has-app-modal");
    document.removeEventListener("keydown", handleEscape);
    onClose?.();
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
  function handleEscape(event) {
    if (event.key === "Tab") {
      const controls = [reasonInput, cancelButton, confirmButton].filter(button => button && !button.disabled);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.key !== "Escape") {
      return;
    }

    close();
  }
  document.addEventListener("keydown", handleEscape);
  confirmButton.addEventListener("click", async () => {
    if (isSubmitting || isClosed) {
      return;
    }

    if (reasonInput && (!reasonInput.value.trim() || reasonInput.value.trim().length > reasonMaxLength)) {
      errorMessage.textContent = `กรุณาระบุเหตุผลไม่เกิน ${reasonMaxLength} ตัวอักษร`;
      reasonInput.focus();
      return;
    }
    errorMessage.textContent = "";

    isSubmitting = true;
    if (reasonInput) reasonInput.disabled = true;
    cancelButton.disabled = true;
    setButtonLoading(confirmButton, true, loadingLabel, confirmLabel);

    try {
      await onConfirm?.(reasonInput?.value.trim());
      isSubmitting = false;
      close();
    } catch (error) {
      isSubmitting = false;
      if (reasonInput) reasonInput.disabled = false;
      cancelButton.disabled = false;
      setButtonLoading(confirmButton, false, loadingLabel, confirmLabel);
      errorMessage.textContent = error.message || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง";
    }
  });
}
