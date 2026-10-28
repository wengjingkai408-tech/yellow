const slideCount = 15;

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

const photoSlide = (pageNumber, label) => ({
  src: `assets/slides-webp/slide-insert-${pageNumber}.webp`,
  srcMobile: `assets/slides-mobile/slide-insert-${pageNumber}.webp`,
  srcFallback: `assets/slides/slide-insert-${pageNumber}.png`,
  thumb: `assets/thumbs-webp/slide-insert-${pageNumber}.webp`,
  kind: "photo",
  label,
});

const slides = [
  ...Array.from({ length: 4 }, (_, index) => (
    standardSlide(String(index + 1).padStart(2, "0"))
  )),
  photoSlide("05", "第 5 页 现场照片一"),
  photoSlide("06", "第 6 页 现场照片二"),
  ...Array.from({ length: 4 }, (_, index) => (
    standardSlide(String(index + 5).padStart(2, "0"))
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

const contentImages = [
  "出轨证据",
  "联系方式 1",
  "联系方式 2",
  "联系方式 3",
  "联系方式 4",
].map((title, index) => {
  const id = `image-${String(index + 1).padStart(2, "0")}`;
  return {
    title,
    category: "图片资料",
    src: `assets/content/images/${id}.webp`,
    thumb: `assets/content/image-thumbs/${id}-thumb.webp`,
    alt: `${title}图片`,
  };
});

const videoDurations = [6.03, 22.3, 18.24, 12.3, 9.43, 7.83, 12.23, 2.5];
const contentVideos = videoDurations.map((duration, index) => {
  const id = `video-${String(index + 1).padStart(2, "0")}`;
  return {
    title: `现场视频 ${index + 1}`,
    category: "视频资料",
    src: `assets/content/videos/${id}.mp4`,
    poster: `assets/content/video-posters/${id}-poster.webp`,
    duration,
  };
});

const slideImage = document.querySelector("#slideImage");
const canvasWrap = document.querySelector("#canvasWrap");
const currentPage = document.querySelector("#currentPage");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");
const previousOverlay = document.querySelector("#previousOverlay");
const nextOverlay = document.querySelector("#nextOverlay");
const thumbnailList = document.querySelector("#thumbnailList");
const overviewGrid = document.querySelector("#overviewGrid");
const overviewButton = document.querySelector("#overviewButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const contentButton = document.querySelector("#contentButton");
const libraryPage = document.querySelector("#libraryPage");
const libraryPageClose = document.querySelector("#libraryPageClose");
const libraryPageTitle = document.querySelector("#libraryPageTitle");
const libraryPageDescription = document.querySelector("#libraryPageDescription");
const overviewSection = document.querySelector("#overviewSection");
const contentSection = document.querySelector("#contentSection");
const contentImageGrid = document.querySelector("#contentImageGrid");
const contentVideoGrid = document.querySelector("#contentVideoGrid");
const mediaViewer = document.querySelector("#mediaViewer");
const mediaViewerClose = document.querySelector("#mediaViewerClose");
const mediaCounter = document.querySelector("#mediaCounter");
const mediaCategory = document.querySelector("#mediaCategory");
const mediaViewerTitle = document.querySelector("#mediaViewerTitle");
const mediaViewerStage = document.querySelector("#mediaViewerStage");
const mediaViewerImage = document.querySelector("#mediaViewerImage");
const mediaVideoShell = document.querySelector("#mediaVideoShell");
const mediaViewerVideo = document.querySelector("#mediaViewerVideo");
const mediaLoading = document.querySelector("#mediaLoading");
const mediaPreviousButton = document.querySelector("#mediaPreviousButton");
const mediaNextButton = document.querySelector("#mediaNextButton");
const stage = document.querySelector("#stage");
const slideError = document.querySelector("#slideError");
let activeIndex = 0;
let activeContentType = "images";
let activeMediaIndex = 0;
let mediaReturnFocus = contentButton;
let mediaVideoObjectUrl = null;
let mediaLoadToken = 0;
let contentCacheWarmed = false;
let overviewGridRendered = false;
let contentGridsRendered = false;
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
  image.loading = variant === "rail" && index < 4 ? "eager" : "lazy";
  image.decoding = "async";
  image.fetchPriority = "low";
  button.appendChild(image);

  const label = document.createElement("span");
  label.textContent = variant === "rail"
    ? String(slide.number).padStart(2, "0")
    : slide.label;
  button.appendChild(label);

  button.addEventListener("click", () => {
    if (variant === "overview") closeLibrary(false);
    showSlide(index);
  });

  return button;
}

slides.forEach((slide, index) => {
  thumbnailList.appendChild(createThumbnail(slide, index));
});

function formatDuration(seconds) {
  const rounded = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function createContentCard(item, index, type) {
  const isVideo = type === "videos";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `content-card${isVideo ? " content-video-card" : ""}`;
  button.dataset.contentType = type;
  button.dataset.contentIndex = String(index);
  button.setAttribute("aria-label", `${isVideo ? "播放" : "查看"}${item.title}`);

  const media = document.createElement("div");
  media.className = "content-card-media";
  const image = document.createElement("img");
  image.src = isVideo ? item.poster : item.thumb;
  image.alt = "";
  image.width = 520;
  image.height = 700;
  image.loading = "lazy";
  image.decoding = "async";
  media.appendChild(image);

  if (isVideo) {
    const play = document.createElement("span");
    play.className = "content-play";
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"></path></svg>';
    const duration = document.createElement("span");
    duration.className = "content-duration";
    duration.textContent = formatDuration(item.duration);
    media.append(play, duration);
  }

  const copy = document.createElement("div");
  copy.className = "content-card-copy";
  const title = document.createElement("strong");
  title.textContent = item.title;
  const category = document.createElement("span");
  category.textContent = isVideo ? "点击播放" : "点击查看大图";
  copy.append(title, category);
  button.append(media, copy);

  button.addEventListener("click", () => {
    openMediaViewer(type, index, button);
  });

  return button;
}

function renderOverviewGrid() {
  if (overviewGridRendered) return;
  overviewGridRendered = true;
  const fragment = document.createDocumentFragment();
  slides.forEach((slide, index) => {
    fragment.appendChild(createThumbnail(slide, index, "overview"));
  });
  overviewGrid.appendChild(fragment);
}

function renderContentGrids() {
  if (contentGridsRendered) return;
  contentGridsRendered = true;

  const imageFragment = document.createDocumentFragment();
  contentImages.forEach((item, index) => {
    imageFragment.appendChild(createContentCard(item, index, "images"));
  });
  contentImageGrid.appendChild(imageFragment);

  const videoFragment = document.createDocumentFragment();
  contentVideos.forEach((item, index) => {
    videoFragment.appendChild(createContentCard(item, index, "videos"));
  });
  contentVideoGrid.appendChild(videoFragment);
}

function updateLibraryNavigation(section) {
  const showsOverview = section === "overview";
  if (showsOverview) {
    renderOverviewGrid();
  } else {
    renderContentGrids();
  }
  overviewButton.classList.toggle("is-active", showsOverview);
  contentButton.classList.toggle("is-active", !showsOverview);
  overviewSection.hidden = !showsOverview;
  contentSection.hidden = showsOverview;
  libraryPageTitle.textContent = showsOverview ? "简介" : "内容";
  libraryPageDescription.textContent = showsOverview
    ? "15 页材料概览。"
    : "5 张图片与 8 段现场视频，按类型分组查看。";
}

function openLibrary(section = "overview", options = {}) {
  const nextSection = section === "content" ? "content" : "overview";
  libraryPage.hidden = false;
  document.body.classList.add("library-page-open");
  updateLibraryNavigation(nextSection);
  if (options.history !== false) {
    history.replaceState(null, "", `#${nextSection}`);
  }

  libraryPage.scrollTop = 0;
  if (nextSection === "content") warmFirstContentVideo();
}

function closeLibrary(restoreFocus = true) {
  libraryPage.hidden = true;
  document.body.classList.remove("library-page-open");
  overviewButton.classList.remove("is-active");
  contentButton.classList.remove("is-active");
  history.replaceState(null, "", `#slide-${activeIndex + 1}`);
  if (restoreFocus) overviewButton.focus();
}

function openOverview() {
  openLibrary("overview");
}

function openContentPage() {
  openLibrary("content");
}

function currentMediaItems() {
  return activeContentType === "videos" ? contentVideos : contentImages;
}

function resetVideoViewer() {
  mediaViewerVideo.pause();
  mediaViewerVideo.removeAttribute("src");
  mediaViewerVideo.removeAttribute("poster");
  mediaViewerVideo.load();
  if (mediaVideoObjectUrl) {
    URL.revokeObjectURL(mediaVideoObjectUrl);
    mediaVideoObjectUrl = null;
  }
}

async function getCachedVideoBlobUrl(url) {
  if (!("caches" in window)) return null;
  const absoluteUrl = new URL(url, window.location.href).href;
  const cache = await caches.open("yellow-content-videos-v1");
  const request = new Request(absoluteUrl);
  const response = await cache.match(request);
  if (!response) return null;
  return URL.createObjectURL(await response.blob());
}

async function cacheVideoInBackground(url) {
  if (!("caches" in window)) return;
  const absoluteUrl = new URL(url, window.location.href).href;
  const cache = await caches.open("yellow-content-videos-v1");
  const request = new Request(absoluteUrl);
  if (await cache.match(request)) return;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response);
}

async function loadViewerVideo(item, token, shouldPlay) {
  mediaLoading.hidden = false;
  resetVideoViewer();
  mediaViewerVideo.poster = item.poster;

  let cachedUrl = null;
  try {
    cachedUrl = await getCachedVideoBlobUrl(item.src);
  } catch {
    cachedUrl = null;
  }

  if (token !== mediaLoadToken) {
    if (cachedUrl) URL.revokeObjectURL(cachedUrl);
    return;
  }

  mediaVideoObjectUrl = cachedUrl;
  mediaViewerVideo.src = cachedUrl ?? item.src;
  mediaViewerVideo.load();

  const finishLoading = () => {
    if (token === mediaLoadToken) mediaLoading.hidden = true;
  };
  mediaViewerVideo.addEventListener("loadedmetadata", finishLoading, { once: true });
  mediaViewerVideo.addEventListener("canplay", finishLoading, { once: true });
  mediaViewerVideo.addEventListener("error", finishLoading, { once: true });

  if (shouldPlay) mediaViewerVideo.play().catch(() => undefined);
  if (!cachedUrl) {
    mediaViewerVideo.addEventListener("ended", () => {
      cacheVideoInBackground(item.src).catch(() => undefined);
    }, { once: true });
  }
}

function updateMediaViewer(options = {}) {
  const items = currentMediaItems();
  activeMediaIndex = (activeMediaIndex + items.length) % items.length;
  const item = items[activeMediaIndex];
  const isVideo = activeContentType === "videos";
  const token = ++mediaLoadToken;

  mediaViewerStage.classList.remove("is-image-zoomed");
  mediaViewerImage.hidden = isVideo;
  mediaVideoShell.hidden = !isVideo;
  mediaCounter.textContent =
    `${String(activeMediaIndex + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
  mediaCategory.textContent = isVideo ? "视频资料" : "图片资料";
  mediaViewerTitle.textContent = item.title;

  if (isVideo) {
    mediaViewerImage.removeAttribute("src");
    loadViewerVideo(item, token, options.autoplay === true);
  } else {
    resetVideoViewer();
    mediaLoading.hidden = true;
    mediaViewerImage.src = item.src;
    mediaViewerImage.alt = item.alt;
  }
}

function openMediaViewer(type, index, trigger) {
  activeContentType = type;
  activeMediaIndex = index;
  mediaReturnFocus = trigger;
  mediaViewer.hidden = false;
  document.body.classList.add("media-viewer-open");
  updateMediaViewer({ autoplay: type === "videos" });
  mediaViewerClose.focus();
}

function closeMediaViewer(restoreFocus = true) {
  mediaViewer.hidden = true;
  document.body.classList.remove("media-viewer-open");
  mediaLoadToken += 1;
  resetVideoViewer();
  mediaViewerStage.classList.remove("is-image-zoomed");
  if (restoreFocus) mediaReturnFocus?.focus();
}

function stepMedia(direction) {
  activeMediaIndex += direction;
  updateMediaViewer({ autoplay: activeContentType === "videos" });
}

async function warmFirstContentVideo() {
  if (contentCacheWarmed || !("caches" in window)) return;
  const connection = navigator.connection;
  const slowNetwork = connection?.saveData === true
    || /(^|-)2g$/.test(connection?.effectiveType ?? "");
  if (slowNetwork) return;

  contentCacheWarmed = true;
  scheduleIdle(async () => {
    try {
      await cacheVideoInBackground(contentVideos[0].src);
    } catch {
      // Video caching is opportunistic; playback still falls back to streaming.
    }
  }, 1800);
}

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
  if (options.updateHash !== false) updateHash();
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
fullscreenButton.addEventListener("click", toggleFullscreen);
contentButton.addEventListener("click", openContentPage);
libraryPageClose.addEventListener("click", closeLibrary);
mediaViewerClose.addEventListener("click", closeMediaViewer);
mediaPreviousButton.addEventListener("click", () => stepMedia(-1));
mediaNextButton.addEventListener("click", () => stepMedia(1));
mediaViewerImage.addEventListener("click", () => {
  if (mediaViewerImage.hidden) return;
  mediaViewerStage.classList.toggle("is-image-zoomed");
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

  if (!mediaViewer.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMediaViewer();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      stepMedia(-1);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      stepMedia(1);
      return;
    }
    return;
  }

  if (!libraryPage.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLibrary();
    }
    return;
  }

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
    case "c":
    case "C":
      event.preventDefault();
      openContentPage();
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

const slideHashMatch = window.location.hash.match(/^#slide-(\d+)$/);
const libraryHashMatch = window.location.hash.match(/^#(overview|content)$/);
const initialIndex = slideHashMatch
  ? Math.min(Math.max(Number(slideHashMatch[1]) - 1, 0), slideCount - 1)
  : 0;

showSlide(initialIndex, { force: true, updateHash: false });

if (libraryHashMatch) {
  openLibrary(libraryHashMatch[1], { instant: true, history: true, top: true });
} else {
  libraryPage.hidden = true;
  document.body.classList.remove("library-page-open");
  if (slideHashMatch) updateHash();
}

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
    for (let index = 1; index < Math.min(slideCount, 3); index += 1) {
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
    navigator.serviceWorker.register("sw.js?v=15", { scope: "./" })
      .then(warmSlideCache)
      .catch(() => undefined);
  }, { once: true });
} else {
  warmSlideCache();
}
