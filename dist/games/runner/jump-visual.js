/* Во время прыжка у обоих обликов остаётся обычный кадр бега.
   Физика прыжка сохраняется: меняются только визуальные кадры. */

updateHeroAnimation = function (now) {
  if (hero.classList.contains("falling")) return;

  const form = hero.dataset.form;

  if (jump && hero.classList.contains("jumping")) {
    setHeroSpriteFrame(form, "run", 0);
    return;
  }

  const cycleDuration = form === "bear" ? 420 : 330;
  const runFrames = spriteFrames[form].run;
  const frameIndex = Math.floor(now / (cycleDuration / runFrames.length)) % runFrames.length;
  setHeroSpriteFrame(form, "run", frameIndex);
};

heroImage.style.transition = "none";
heroImage.style.transform = "";
