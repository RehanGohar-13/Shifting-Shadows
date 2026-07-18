// ============================================
// Progress / Save System
// ============================================

const SAVE_KEY = "shifting_shadows_progress";

const defaultProgress = {
  chaptersUnlocked: 1, // Chapter 1 always unlocked
  chapter1Complete: false,
  chapter2Complete: false,
  chapter3Complete: false,
  totalDeaths: 0,
  bestEndlessFloor: 0,
};

export function loadProgress() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      return { ...defaultProgress, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("Failed to load save", e);
  }
  return { ...defaultProgress };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn("Failed to save progress", e);
  }
}

export function unlockChapter(chapter) {
  const progress = loadProgress();
  if (chapter > progress.chaptersUnlocked) {
    progress.chaptersUnlocked = chapter;
  }
  saveProgress(progress);
}

export function completeChapter(chapter) {
  const progress = loadProgress();
  if (chapter === 1) progress.chapter1Complete = true;
  if (chapter === 2) progress.chapter2Complete = true;
  if (chapter === 3) progress.chapter3Complete = true;

  // Auto-unlock next chapter
  const nextChapter = chapter + 1;
  if (nextChapter <= 3 && nextChapter > progress.chaptersUnlocked) {
    progress.chaptersUnlocked = nextChapter;
  }
  saveProgress(progress);
  return loadProgress();
}

export function resetProgress() {
  localStorage.removeItem(SAVE_KEY);
}

export function updateEndlessRecord(floor) {
  const progress = loadProgress();
  if (floor > progress.bestEndlessFloor) {
    progress.bestEndlessFloor = floor;
    saveProgress(progress);
  }
}
