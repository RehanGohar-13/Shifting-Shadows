// ============================================
// Story Data + Display System
// ============================================

export const STORY = {
  intro: `You murdered them all.<br><br>
    Men. Women. Children.<br>
    Anyone the king pointed at.<br><br>
    They called you <span class="story-danger">The Silver Shadow</span> —<br>
    the blade that never hesitated.<br><br>
    You bathed in their blood.<br>
    You slept through their screams.<br>
    You buried your soul in a shallow grave<br>
    somewhere between the 40th body and the 400th.<br><br>
    Tonight, you woke up in a place<br>
    that shouldn't exist.<br><br>
    <span class="story-danger">Something is here with you.</span><br><br>
    It has your face.<br>
    It has your victims' eyes.<br>
    And it is <span class="story-highlight">learning</span> what you did.`,

  chapters: [
    {
      before: [
        `The dungeon beneath the palace.<br>
        The one where you executed the rebels.<br>
        The one where the mothers begged.<br>
        The one where the children stopped crying<br>
        <span class="story-danger">after enough hours.</span><br><br>
        Their souls are trapped here.<br>
        Trapped in bottles you never noticed<br>
        when you left the bodies to rot.<br><br>
        <span class="story-highlight">Free them. Feed them to the rift.</span><br>
        <span class="story-danger">Before it feeds on you.</span>`,

        `You ran.<br><br>
        Your boots slapped the cold stone<br>
        and the phantom's head snapped up.<br><br>
        <span class="story-danger">It heard you.</span><br><br>
        Every soul you took<br>
        gave it a new way to find you.<br>
        First it learned to move.<br>
        Now it learned to listen.<br><br>
        <span class="story-highlight">Walk softly, butcher.<br>
        The dead are listening for their killer.</span>`,
      ],
    },
    {
      before: [
        `You lit a torch.<br>
        The flame caught on the phantom's face<br>
        and you finally saw it.<br><br>
        <span class="story-danger">It was you.</span><br><br>
        Older. Hollow. Rotten.<br>
        A mouth stitched shut with the screams<br>
        of everyone you silenced.<br>
        Eyes weeping black tar<br>
        for every promise you broke.<br><br>
        It sees you now.<br>
        In the light, it <span class="story-danger">remembers you.</span><br><br>
        <span class="story-highlight">The darkness lied.<br>
        There is no hiding from yourself.</span>`,

        `You hid behind a wall.<br>
        You covered your mouth to muffle the breath<br>
        that innocents once held while you approached.<br><br>
        But it found your footprints.<br>
        <span class="story-danger">The trail of blood<br>
        you have always left behind.</span><br><br>
        Every step of your life is a wound<br>
        in the earth.<br>
        And it can smell every one of them.<br><br>
        <span class="story-highlight">You cannot outrun what you did.<br>
        Only forward. Only into the rift.</span>`,
      ],
    },
    {
      before: [
        `The walls trembled.<br>
        You pressed your back against stone<br>
        and felt <span class="story-danger">something reach through it.</span><br><br>
        A hand of smoke and small bones.<br>
        Fingers made of every child<br>
        you told yourself was "collateral."<br><br>
        The walls between you and your sins<br>
        are dissolving.<br><br>
        <span class="story-highlight">There is no more running.<br>
        There is only the rift.<br>
        And the rift is watching too.</span>`,

        `It split in two.<br><br>
        Where there was one shadow,<br>
        <span class="story-danger">now there are two.</span><br><br>
        One for the soldiers you butchered<br>
        on the king's command.<br>
        One for the ones you butchered<br>
        <span class="story-danger">for fun.</span><br><br>
        They move differently.<br>
        They kill differently.<br>
        But they share one hunger.<br><br>
        <span class="story-highlight">To do to you<br>
        what you did to them.</span>`,
      ],
    },
  ],

  ending: `The rift seals behind you.<br><br>
    You collapse into the dirt<br>
    of a world you thought you knew.<br><br>
    You are alive.<br>
    You are free.<br><br>
    But you know now.<br><br>
    <span class="story-danger">The phantom wasn't punishment.</span><br>
    <span class="story-danger">It was you.</span><br><br>
    Every face you forgot — it remembered.<br>
    Every scream you buried — it swallowed.<br>
    Every child you left in the dark —<br>
    it grew into.<br><br>
    You escaped the dungeon.<br>
    But the dungeon has always been<br>
    <span class="story-highlight">inside your skull.</span><br><br>
    Close your eyes.<br>
    <span class="story-danger">It is already learning again.</span><br><br>
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
