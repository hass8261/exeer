const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector("button[type='submit']");

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    status.textContent = "送信しています。";
    status.className = "form-status";
    submitButton.disabled = true;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "送信に失敗しました。");
      }

      status.textContent = result.message || "お問い合わせを送信しました。";
      status.classList.add("success");
      contactForm.reset();
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "送信に失敗しました。management@exeer.com まで直接ご連絡ください。";
      status.classList.add("error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
