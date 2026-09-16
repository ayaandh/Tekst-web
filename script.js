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

        if (examples[index]) {
            examples[index].classList.add("active");
        }
    });
});

const dropdown = document.getElementById("downloadDropdown");
const trigger = document.getElementById("downloadTrigger");

const latestVersion = document.getElementById("latestVersion");
const latestDescription = document.getElementById("latestDescription");
const latestReleaseDetails = document.getElementById("latestReleaseDetails");

const latestDownload = document.getElementById("latestDownload");
const latestDownloadText = document.getElementById("latestDownloadText");
const latestDownloadVersion = document.getElementById("latestDownloadVersion");
const detectedPlatform = document.getElementById("detectedPlatform");

const windowsDownload = document.getElementById("windowsDownload");
const macosDownload = document.getElementById("macosDownload");
const linuxDownload = document.getElementById("linuxDownload");

const downloadLatestText = document.getElementById("downloadLatestText");
const downloadLatestVersion = document.getElementById("downloadLatestVersion");
const downloadLatestButton = document.getElementById("downloadLatestButton");
const heroDownload = document.getElementById("heroDownload");

let latestRelease = null;

function getPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (
        userAgent.includes("windows") ||
        platform.includes("win")
    ) {
        return "windows";
    }

    if (
        userAgent.includes("macintosh") ||
        userAgent.includes("mac os") ||
        platform.includes("mac")
    ) {
        return "macos";
    }

    if (
        userAgent.includes("linux") ||
        userAgent.includes("x11") ||
        platform.includes("linux")
    ) {
        return "linux";
    }

    return "windows";
}

function platformName(platform) {
    if (platform === "macos") {
        return "macOS";
    }

    if (platform === "linux") {
        return "Linux";
    }

    return "Windows";
}

function platformDownload(platform) {
    if (!latestRelease) {
        return "releases/";
    }

    const files = {
        windows: "windows/Windows.zip",
        macos: "macos/MacOS.zip",
        linux: "linux/Linux.zip"
    };

    return new URL(
        files[platform],
        latestRelease.url
    ).href;
}

function updatePlatform(platform) {
    if (!latestRelease) {
        return;
    }

    const name = platformName(platform);
    const download = platformDownload(platform);

    detectedPlatform.textContent = name;

    latestDownload.href = download;
    latestDownloadText.textContent = "Download for " + name;
    latestDownloadVersion.textContent = latestRelease.version;

    windowsDownload.href = platformDownload("windows");
    macosDownload.href = platformDownload("macos");
    linuxDownload.href = platformDownload("linux");

    windowsDownload.classList.remove("selected");
    macosDownload.classList.remove("selected");
    linuxDownload.classList.remove("selected");

    if (platform === "windows") {
        windowsDownload.classList.add("selected");
    }

    if (platform === "macos") {
        macosDownload.classList.add("selected");
    }

    if (platform === "linux") {
        linuxDownload.classList.add("selected");
    }

    downloadLatestButton.href = download;
    heroDownload.href = download;
}

async function loadLatestRelease() {
    try {
        const releasesUrl = new URL(
            "releases/index.html",
            window.location.href
        );

        const response = await fetch(
            releasesUrl.href,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Could not load releases/index.html");
        }

        const html = await response.text();

        const parser = new DOMParser();

        const releaseDocument = parser.parseFromString(
            html,
            "text/html"
        );

        const releaseCard =
            releaseDocument.querySelector(".release-card");

        if (!releaseCard) {
            throw new Error("No .release-card found");
        }

        const versionElement =
            releaseCard.querySelector(".release-version");

        const descriptionElement =
            releaseCard.querySelector(".release-description");

        const href =
            releaseCard.getAttribute("href");

        if (!href) {
            throw new Error("Release card has no href");
        }

        const versionText = versionElement
            ? versionElement.textContent.trim()
            : "Tekst";

        latestRelease = {
            version: versionText.replace(/^Latest\s+/i, ""),
            description: descriptionElement
                ? descriptionElement.textContent.trim()
                : "Latest Tekst release.",
            url: new URL(
                href,
                releasesUrl.href
            ).href
        };

        latestVersion.textContent =
            latestRelease.version;

        latestDescription.textContent =
            latestRelease.description;

        latestReleaseDetails.href =
            latestRelease.url;

        latestDownloadVersion.textContent =
            latestRelease.version;

        downloadLatestText.textContent =
            "Download " +
            latestRelease.version +
            " and start writing.";

        downloadLatestVersion.textContent =
            latestRelease.version;

        updatePlatform(getPlatform());

    } catch (error) {
        console.error(
            "Failed to load latest release:",
            error
        );

        latestVersion.textContent =
            "Release unavailable";

        latestDescription.textContent =
            "The latest release could not be detected.";

        latestDownloadVersion.textContent =
            "Open releases";

        latestReleaseDetails.href =
            "releases/";

        latestDownload.href =
            "releases/";

        windowsDownload.href =
            "releases/";

        macosDownload.href =
            "releases/";

        linuxDownload.href =
            "releases/";

        downloadLatestButton.href =
            "releases/";

        heroDownload.href =
            "releases/";

        detectedPlatform.textContent =
            platformName(getPlatform());
    }
}

trigger.addEventListener("click", event => {
    event.stopPropagation();

    dropdown.classList.toggle("open");
});

document.addEventListener("click", event => {
    if (!dropdown.contains(event.target)) {
        dropdown.classList.remove("open");
    }
});

document.querySelectorAll("[data-platform]").forEach(item => {
    item.addEventListener("click", () => {
        if (latestRelease) {
            updatePlatform(item.dataset.platform);
        }
    });
});

loadLatestRelease();