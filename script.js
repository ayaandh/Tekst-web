const copyButtons = document.querySelectorAll(".copy-button");

copyButtons.forEach(button => {
    button.addEventListener("click", async () => {
        const container = button.closest(".hero-code, .code-panel, .example-card");
        const code = container?.querySelector("pre code");

        if (!code) return;

        try {
            await navigator.clipboard.writeText(code.textContent);
            const original = button.textContent;
            button.textContent = "Copied";

            setTimeout(() => {
                button.textContent = original;
            }, 1500);
        } catch {
            button.textContent = "Failed";

            setTimeout(() => {
                button.textContent = "Copy";
            }, 1500);
        }
    });
});

const tabs = document.querySelectorAll(".code-tabs button");
const examples = document.querySelectorAll(".code-example");

tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
        tabs.forEach(item => item.classList.remove("active"));
        examples.forEach(item => item.classList.remove("active"));

        tab.classList.add("active");
        examples[index].classList.add("active");
    });
});