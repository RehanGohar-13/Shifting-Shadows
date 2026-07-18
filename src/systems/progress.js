// ============================================
// Progress / Save System
// ============================================

const SAVE_KEY = "shifting_shadows_progress";

const defaultProgress = {
  chaptersUnlocked: 1,
  chapter1Complete: false,
  chapter2Complete: false,
  chapter3Complete: false,
  totalDeaths: 0,
  bestEndlessFloor: 0,
  bestTimes: {},
  achievements: {
    firstBlood: false, // Die once
    hundredDeaths: false, // Die 100 times
    nightmare: false, // Beat nightmare
  },
};

export function loadProgress() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) return { ...defaultProgress, ...JSON.parse(saved) };
  } catch (e) {
    console.warn(e);
  }
  return { ...defaultProgress };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch (e) {}
}

export function addDeath() {
  const p = loadProgress();
  p.totalDeaths++;
  if (p.totalDeaths === 1 && !p.achievements.firstBlood)
    unlockAchievement(p, "firstBlood", "First Blood (Died)");
  if (p.totalDeaths === 100 && !p.achievements.hundredDeaths)
    unlockAchievement(p, "hundredDeaths", "Century of Suffering (Died 100x)");
  saveProgress(p);
  return p.totalDeaths;
}

export function saveBestTime(level, time) {
  const p = loadProgress();
  if (!p.bestTimes[level] || time < p.bestTimes[level]) {
    p.bestTimes[level] = time;
    saveProgress(p);
  }
}

export function completeChapter(chapter) {
  const p = loadProgress();
  if (chapter === 1) p.chapter1Complete = true;
  if (chapter === 2) p.chapter2Complete = true;
  if (chapter === 3) p.chapter3Complete = true;
  if (chapter === "nightmare" && !p.achievements.nightmare) {
    unlockAchievement(p, "nightmare", "Awoke from Nightmare");
  }

  const nextChapter = typeof chapter === "number" ? chapter + 1 : 4;
  if (nextChapter <= 3 && nextChapter > p.chaptersUnlocked) {
    p.chaptersUnlocked = nextChapter;
  }
  saveProgress(p);
  return loadProgress();
}

function unlockAchievement(progress, id, text) {
  progress.achievements[id] = true;
  const toast = document.getElementById("achievement-toast");
  if (toast) {
    document.getElementById("toast-text").textContent = text;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 4000);
  }
}
