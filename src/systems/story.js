// ============================================
// Story Data + Display System
// ============================================

export const STORY = {
  intro: `You were a knight.<br><br>
    The kingdom's finest blade.<br>
    They called you <span class="story-highlight">The Silver Shadow</span>.<br><br>
    You killed without mercy.<br>
    Soldiers. Rebels. Innocents.<br>
    You stopped counting after the first hundred.<br><br>
    Then one night, something followed you home.<br><br>
    Not a person.<br>
    <span class="story-danger">A phantom.</span><br><br>
    Born from every soul you took.<br>
    It doesn't want revenge.<br>
    It wants to <span class="story-highlight">become you</span>.`,

  chapters: [
    {
      before: [
        `The dungeon beneath the castle.<br>
        This is where they kept the prisoners.<br>
        <span class="story-highlight">Your</span> prisoners.<br><br>
        Something drifts through these halls now.<br>
        A shadow made of screams.<br><br>
        It can barely move. It's still learning<br>
        what it is.<br><br>
        <span class="story-danger">Collect the souls. Seal the rift. Escape.</span>`,

        `You ran.<br><br>
        Your armor clanked against the stone floor<br>
        and <span class="story-danger">it heard you</span>.<br><br>
        Every soul you took gave it a new sense.<br>
        First movement. Now hearing.<br><br>
        <span class="story-highlight">Walk slowly, knight.<br>
        Your victims are listening.</span>`,
      ],
    },
    {
      before: [
        `You lit a torch to find your way.<br><br>
        The light fell on the phantom's face<br>
        and you saw it clearly for the first time.<br><br>
        <span class="story-danger">It had your face.</span><br><br>
        An older version. Hollow eyes.<br>
        A mouth full of teeth that used to be words.<br><br>
        It sees you now. In the light.<br>
        <span class="story-highlight">The darkness is safer.</span>`,

        `You thought you escaped.<br>
        You hid behind a wall and held your breath.<br><br>
        But it found your footprints.<br>
        <span class="story-danger">The trail of blood you've always left behind.</span><br><br>
        Every step you take leaves a mark.<br>
        Every mark is a memory of someone who died.<br><br>
        <span class="story-highlight">You can't outrun your past.</span>`,
      ],
    },
    {
      before: [
        `The walls shook.<br><br>
        You pressed your back against cold stone<br>
        and felt something reach through it.<br><br>
        <span class="story-danger">Its hand came through the wall.</span><br>
        Made of smoke and sorrow.<br><br>
        The barriers between you and your sins<br>
        are dissolving.<br><br>
        <span class="story-highlight">There is nowhere left to hide.</span>`,

        `It split in two.<br><br>
        Two phantoms now. Two shadows.<br>
        Made from the lives you ended.<br><br>
        One for the soldiers you killed in battle.<br>
        <span class="story-danger">One for the innocents.</span><br><br>
        They move differently.<br>
        But they share one purpose.<br><br>
        <span class="story-highlight">To make you feel what they felt.</span>`,
      ],
    },
  ],

  ending: `The rift seals behind you.<br><br>
    You collapse on the other side.<br>
    Breathing. Alive. Free.<br><br>
    But you know the truth now.<br><br>
    The phantom wasn't a monster.<br>
    <span class="story-danger">It was a mirror.</span><br><br>
    Every soul you took lives inside it.<br>
    Every face you forgot — it remembers.<br><br>
    You escaped the dungeon.<br>
    But the dungeon is inside you.<br><br>
    And in the darkness behind your eyes,<br>
    <span class="story-highlight">it's still learning.</span><br><br>
    <span class="story-danger">SHIFTING SHADOWS</span>`,
};

let waitingForStory = false;
let storyCallback = null;

export function isWaitingForStory() {
  return waitingForStory;
}

export function showStory(text, callback) {
  waitingForStory = true;
  const overlay = document.getElementById("story-overlay");
  const storyText = document.getElementById("story-text");
  storyText.innerHTML = text;
  storyText.style.animation = "none";
  storyText.offsetHeight;
  storyText.style.animation = "storyFadeIn 3s ease forwards";
  const prompt = document.getElementById("story-prompt");
  prompt.style.animation = "none";
  prompt.offsetHeight;
  prompt.style.animation = "storyPromptIn 1s ease 3.5s forwards";
  overlay.classList.remove("hidden");
  document.getElementById("ui-layer").style.display = "none";
  storyCallback = callback;

  // Also allow click to advance
  overlay.onclick = () => {
    advanceStory();
  };
}

export function advanceStory() {
  document.getElementById("story-overlay").classList.add("hidden");
  waitingForStory = false;
  if (storyCallback) {
    const cb = storyCallback;
    storyCallback = null;
    cb();
  }
}

export function resetStory() {
  waitingForStory = false;
  storyCallback = null;
}
