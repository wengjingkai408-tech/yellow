const slideCount = 13;

const standardSlide = (id) => ({
  src: `assets/slides-webp/slide-${id}.webp`,
  srcMobile: `assets/slides-mobile/slide-${id}.webp`,
  srcFallback: `assets/slides/slide-${id}.png`,
  thumb: `assets/thumbs-webp/slide-${id}.webp`,
  kind: "slide",
});

const evidenceSlide = (fileName, thumb, label) => ({
  src: `assets/evidence/slides/${fileName}.png`,
  srcMobile: `assets/evidence/slides/${fileName}.png`,
  srcFallback: `assets/evidence/slides/${fileName}.png`,
  thumb,
  kind: "evidence",
  label,
});

const slides = [
  ...Array.from({ length: 8 }, (_, index) => (
    standardSlide(String(index + 1).padStart(2, "0"))
  )),
  evidenceSlide(
    "confrontation",
    "assets/evidence/thumbs/confrontation-thumb.webp",
    "第 9 页 对峙现场",
  ),
  evidenceSlide(
    "judgment-cover",
    "assets/evidence/thumbs/judgment-cover-thumb.webp",
    "第 10 页 法院判决",
  ),
  evidenceSlide(
    "judgment-page-01",
    "assets/evidence/thumbs/judgment-page-01-thumb.webp",
    "第 11 页 判决内容一",
  ),
  evidenceSlide(
    "judgment-page-02",
    "assets/evidence/thumbs/judgment-page-02-thumb.webp",
    "第 12 页 判决内容二",
  ),
  standardSlide("09"),
].map((slide, index) => ({
  ...slide,
  number: index + 1,
  label: slide.label ?? `第 ${index + 1} 页`,
}));

const slideImage = document.querySelector("#slideImage");
const canvasWrap = document.querySelector("#canvasWrap");
const currentPage = document.querySelector("#currentPage");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");
const previousOverlay = document.querySelector("#previousOverlay");
const nextOverlay = document.querySelector("#nextOverlay");
const thumbnailList = document.querySelector("#thumbnailList");
const overview = document.querySelector("#overview");
const overviewGrid = document.querySelector("#overviewGrid");
const overviewButton = document.querySelector("#overviewButton");
const overviewClose = document.querySelector("#overviewClose");
const fullscreenButton = document.querySelector("#fullscreenButton");
const stage = document.querySelector("#stage");
const slideError = document.querySelector("#slideError");
let activeIndex = 0;
let pointerStartX = null;
let pointerStartY = null;
let transitionToken = 0;
const compactMedia = window.matchMedia("(max-width: 1100px)");

function getSlideSource(slide) {
  const saveData = navigator.connection?.saveData === true;
  return compactMedia.matches || saveData ? slide.srcMobile : slide.src;
}

function decodeImage(image) {
  if (typeof image.decode === "function") {
    return image.decode();
  }
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

function createThumbnail(slide, index, variant = "rail") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant === "rail" ? "thumbnail" : "overview-card";
  button.dataset.index = String(index);
  button.setAttribute("aria-label", `打开${slide.label}`);

  const image = document.createElement("img");
  image.src = slide.thumb;
  image.alt = "";
  image.width = 320;
  image.height = 180;
  image.loading = variant === "rail" ? "eager" : "lazy";
  image.decoding = "async";
  image.fetchPriority = "low";
  button.appendChild(image);

  const label = document.createElement("span");
  label.textContent = variant === "rail"
    ? String(slide.number).padStart(2, "0")
    : slide.label;
  button.appendChild(label);

  button.addEventListener("click", () => {
    showSlide(index);
    if (variant === "overview") closeOverview();
  });

  return button;
}

slides.forEach((slide, index) => {
  thumbnailList.appendChild(createThumbnail(slide, index));
  overviewGrid.appendChild(createThumbnail(slide, index, "overview"));
});

function preloadAround(center) {
  const index = (center + 1) % slideCount;
  const image = new Image();
  image.decoding = "async";
  image.src = getSlideSource(slides[index]);
}

function updateActiveThumbnails() {
  document.querySelectorAll(".thumbnail").forEach((thumbnail) => {
    const isActive = Number(thumbnail.dataset.index) === activeIndex;
    thumbnail.classList.toggle("is-active", isActive);
    thumbnail.setAttribute("aria-current", isActive ? "page" : "false");
  });

  const activeThumbnail = thumbnailList.querySelector(".is-active");
  activeThumbnail?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function updateHash() {
  const nextHash = `slide-${activeIndex + 1}`;
  if (window.location.hash !== `#${nextHash}`) {
    history.replaceState(null, "", `#${nextHash}`);
  }
}

async function showSlide(requestedIndex, options = {}) {
  const nextIndex = (requestedIndex + slideCount) % slideCount;
  if (nextIndex === activeIndex && options.force !== true) return;

  activeIndex = nextIndex;
  const slide = slides[activeIndex];
  const token = ++transitionToken;

  currentPage.textContent = String(slide.number).padStart(2, "0");
  slideImage.alt = slide.label;
  canvasWrap.classList.toggle("is-evidence-slide", slide.kind === "evidence");
  canvasWrap.classList.add("is-loading");
  slideImage.classList.add("is-changing");
  slideError.hidden = true;
  updateActiveThumbnails();
  updateHash();
  preloadAround(activeIndex);

  const nextImage = new Image();
  nextImage.decoding = "async";
  nextImage.src = getSlideSource(slide);

  try {
    await decodeImage(nextImage);
  } catch {
    nextImage.src = slide.srcFallback;
    await decodeImage(nextImage).catch(() => undefined);
  }

  if (token !== transitionToken) return;
  slideImage.src = nextImage.src;
  slideImage.classList.remove("is-changing");
  canvasWrap.classList.remove("is-loading");
  slideError.hidden = true;
}

function goPrevious() {
  showSlide(activeIndex - 1);
}

function goNext() {
  showSlide(activeIndex + 1);
}

function openOverview() {
  overview.hidden = false;
  document.body.classList.add("overview-open");
  overviewClose.focus();
}

function closeOverview() {
  overview.hidden = true;
  document.body.classList.remove("overview-open");
  overviewButton.focus();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Some file-preview environments do not allow the Fullscreen API.
  }
}

[previousButton, previousOverlay].forEach((button) => button.addEventListener("click", goPrevious));
[nextButton, nextOverlay].forEach((button) => button.addEventListener("click", goNext));
overviewButton.addEventListener("click", openOverview);
overviewClose.addEventListener("click", closeOverview);
fullscreenButton.addEventListener("click", toggleFullscreen);
overview.addEventListener("click", (event) => {
  if (event.target === overview) closeOverview();
});

slideImage.addEventListener("error", () => {
  canvasWrap.classList.remove("is-loading");
  slideError.hidden = false;
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.setAttribute(
    "aria-label",
    document.fullscreenElement ? "退出全屏" : "进入全屏",
  );
});

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  const isTyping = target instanceof HTMLElement
    && (target.matches("input, textarea, select") || target.isContentEditable);
  if (isTyping) return;

  if (event.key === "Escape" && !overview.hidden) {
    closeOverview();
    return;
  }

  if (!overview.hidden) return;

  switch (event.key) {
    case "ArrowLeft":
    case "PageUp":
      event.preventDefault();
      goPrevious();
      break;
    case "ArrowRight":
    case "PageDown":
    case " ":
      event.preventDefault();
      goNext();
      break;
    case "Home":
      event.preventDefault();
      showSlide(0);
      break;
    case "End":
      event.preventDefault();
      showSlide(slideCount - 1);
      break;
    case "f":
    case "F":
      event.preventDefault();
      toggleFullscreen();
      break;
    case "o":
    case "O":
      event.preventDefault();
      openOverview();
      break;
    default:
      break;
  }
});

stage.addEventListener("pointerdown", (event) => {
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
});

stage.addEventListener("pointerup", (event) => {
  if (pointerStartX === null || pointerStartY === null) return;

  const deltaX = event.clientX - pointerStartX;
  const deltaY = event.clientY - pointerStartY;
  pointerStartX = null;
  pointerStartY = null;

  if (Math.abs(deltaX) < 54 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
  if (deltaX > 0) {
    goPrevious();
  } else {
    goNext();
  }
});

stage.addEventListener("pointercancel", () => {
  pointerStartX = null;
  pointerStartY = null;
});

const hashMatch = window.location.hash.match(/^#slide-(\d+)$/);
const initialIndex = hashMatch
  ? Math.min(Math.max(Number(hashMatch[1]) - 1, 0), slideCount - 1)
  : 0;

showSlide(initialIndex, { force: true });

function scheduleIdle(callback, timeout = 1800) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    window.setTimeout(callback, timeout);
  }
}

function warmSlideCache() {
  const connection = navigator.connection;
  const slowNetwork = connection?.saveData === true
    || /(^|-)2g$/.test(connection?.effectiveType ?? "");
  if (slowNetwork || document.visibilityState === "hidden") return;

  scheduleIdle(async () => {
    for (let index = 1; index < slideCount; index += 1) {
      if (document.visibilityState === "hidden") return;
      try {
        await fetch(getSlideSource(slides[index]), { cache: "force-cache" });
      } catch {
        return;
      }
    }
  }, 2600);
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js?v=9", { scope: "./" })
      .then(warmSlideCache)
      .catch(() => undefined);
  }, { once: true });
} else {
  warmSlideCache();
}
