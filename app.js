const slideCount = 9;

const slides = Array.from({ length: slideCount }, (_, index) => ({
  number: index + 1,
  src: `assets/slides/slide-${String(index + 1).padStart(2, "0")}.png`,
  label: `第 ${index + 1} 页`,
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

function createThumbnail(slide, index, variant = "rail") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant === "rail" ? "thumbnail" : "overview-card";
  button.dataset.index = String(index);
  button.setAttribute("aria-label", `打开${slide.label}`);

  const image = document.createElement("img");
  image.src = slide.src;
  image.alt = "";
  image.loading = index < 3 ? "eager" : "lazy";
  image.decoding = "async";
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
  for (const offset of [-1, 1, 2]) {
    const index = (center + offset + slideCount) % slideCount;
    const image = new Image();
    image.src = slides[index].src;
  }
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

function showSlide(requestedIndex, options = {}) {
  const nextIndex = (requestedIndex + slideCount) % slideCount;
  if (nextIndex === activeIndex && options.force !== true) return;

  activeIndex = nextIndex;
  const slide = slides[activeIndex];
  const token = ++transitionToken;

  currentPage.textContent = String(slide.number).padStart(2, "0");
  slideImage.alt = slide.label;
  canvasWrap.classList.add("is-loading");
  slideImage.classList.add("is-changing");
  slideError.hidden = true;
  updateActiveThumbnails();
  updateHash();
  preloadAround(activeIndex);

  const nextImage = new Image();
  nextImage.src = slide.src;
  nextImage.decode()
    .catch(() => undefined)
    .finally(() => {
      if (token !== transitionToken) return;
      slideImage.src = slide.src;
      slideImage.classList.remove("is-changing");
      canvasWrap.classList.remove("is-loading");
      slideError.hidden = true;
    });
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
