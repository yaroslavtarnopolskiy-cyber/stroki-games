/* Встреча с ведьмой на выходе из пещеры.
   Герой останавливается, камера приближается, появляется бабл ведьмы.
   После двух секунд чтения игровое действие отдаляет камеру и продолжает бег. */
(() => {
  const witch = document.createElement("img");
  witch.id = "witch-midpoint";
  witch.src = "assets/characters/witch.png";
  witch.alt = "Ведьма";
  witch.style.position = "absolute";
  witch.style.bottom = "30px";
  witch.style.width = "clamp(92px, 9vw, 138px)";
  witch.style.height = "auto";
  witch.style.zIndex = "8";
  witch.style.pointerEvents = "none";
  witch.style.transform = "translateX(-50%)";
  witch.style.userSelect = "none";
  witch.style.webkitUserDrag = "none";
  world.appendChild(witch);

  const bubble = document.createElement("div");
  bubble.id = "witch-bubble";
  bubble.textContent = "Человеческая красавица ждёт. Беги к ней, до городища недалеко.";
  bubble.setAttribute("role", "note");
  bubble.style.position = "absolute";
  bubble.style.height = "auto";
  bubble.style.zIndex = "12";
  bubble.style.opacity = "0";
  bubble.style.pointerEvents = "none";
  bubble.style.userSelect = "none";
  bubble.style.webkitUserDrag = "none";
  bubble.style.transition = "opacity 420ms ease, transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
  Object.assign(bubble.style,{position:'fixed',left:'50%',zIndex:'84',padding:'12px 18px',background:'#f8f6f2ed',color:'#191817',borderRadius:'8px',textAlign:'center',fontFamily:'Glanz,Georgia,serif',lineHeight:'1.2',overflow:'auto'});
  document.body.appendChild(bubble);

  /* Правый край последнего экрана пещеры (mound-end), с небольшим запасом от стыка. */
  const witchRoutePosition = 6.86;
  const currentLocationWidth = () => innerHeight * (3000 / 1080);
  const currentWitchX = () => currentLocationWidth() * witchRoutePosition;
  const sceneScale = () => innerHeight / 1080;
  const isTouchLayout = () => window.matchMedia("(pointer: coarse)").matches || innerWidth <= 900;

  function positionWitchAndBubble() {
    const scale = sceneScale();
    const witchX = currentWitchX();
    const mobile = isTouchLayout();

    witch.style.left = `${witchX}px`;
    witch.dataset.logicalX = String(witchRoutePosition);

    // Viewport coordinates keep the entire message outside the camera zoom.
    bubble.style.width = `${Math.min(innerWidth * .78,640)}px`;
    bubble.style.maxHeight = `${innerHeight * .5}px`;
    bubble.style.top = `${innerHeight * .14}px`;
    bubble.style.fontSize = `${Math.max(12,Math.min(36,innerHeight * .05))}px`;
    bubble.style.transform = 'translate(-50%, 12px)';
  }

  positionWitchAndBubble();

  let triggered = false;
  let waitingForInteraction = false;
  let completed = false;
  const zoomDuration = 850;
  const readingDuration = 2000;
  let readingTimer=null,resumeTimer=null;

  function showBubble() {
    positionWitchAndBubble();
    requestAnimationFrame(() => {
      bubble.style.opacity = "1";
      bubble.style.transform = "translate(-50%, 0) scale(1)";
    });
  }

  function hideBubble() {
    bubble.style.opacity = "0";
    bubble.style.transform = `translate(-50%, ${12 * sceneScale()}px) scale(0.97)`;
  }

  function triggerWitchScene() {
    if (triggered || completed || window.infiniteMode) return;
    triggered = true;

    running = false;
    jump = null;
    wading = null;

    hero.classList.remove("running", "jumping", "wading");
    hero.classList.add("witch-paused");
    hero.style.transform = "";

    const witchX = currentWitchX();
    const witchScreenX = witchX - worldX;
    const focusX = Math.max(innerWidth * 0.25, Math.min(innerWidth * 0.75, witchScreenX));

    game.style.transformOrigin = `${focusX}px 72%`;
    game.style.transition = `transform ${zoomDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;

    showBubble();

    requestAnimationFrame(() => {
      game.style.transform = "scale(1.42)";
    });

    readingTimer=window.setTimeout(() => {
      if (!completed) waitingForInteraction = true;
    }, readingDuration);
  }

  function continueAfterWitch(event) {
    if (!triggered || completed || window.infiniteMode) return false;
    if (event?.target?.closest?.('button,a,input,#speed-control,#result-screen')) return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    // Early actions do not skip the two-second reading window or queue a jump.
    if (!waitingForInteraction) return true;

    completed = true;
    waitingForInteraction = false;
    hideBubble();
    game.style.transform = "scale(1)";

    /* Чекпоинт ставим сразу после ведьмы, но до первого препятствия следующей локации. */
    window.activateWitchCheckpoint?.(witchRoutePosition + 0.08);

    resumeTimer=window.setTimeout(() => {
      if(window.runnerResultVisible)return;
      hero.classList.remove("witch-paused");
      hero.classList.add("running");
      running = true;
      lastFrameAt = performance.now();
    }, zoomDuration);
    return true;
  }

  /* Продолжение — по клику/тапу в любом месте экрана, а не только по баблу. */
  game.addEventListener("pointerdown", continueAfterWitch, true);
  game.addEventListener("touchstart", continueAfterWitch, {capture:true,passive:false});
  window.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "Space", "KeyE", "Enter"].includes(event.code)) continueAfterWitch(event);
  }, true);
  window.runnerCancelWitchScene=()=>{
    clearTimeout(readingTimer);clearTimeout(resumeTimer);waitingForInteraction=false;completed=true;hideBubble();
  };
  window.runnerResetWitchScene=()=>{
    window.runnerCancelWitchScene();triggered=false;completed=false;game.style.transform='scale(1)';
  };
  window.runnerResetWitchScene=()=>{
    window.runnerCancelWitchScene();triggered=false;completed=false;waitingForInteraction=false;
  };
  // The landing routes controls here when focus is outside the iframe.
  window.runnerContinueWitchScene = continueAfterWitch;

  function watchWitch() {
    if (!window.infiniteMode && !triggered && !completed && gameStarted && running && !tutorialActive) {
      const center = worldX + heroScreenX();
      const approachDistance = innerWidth * 0.08;
      if (center >= currentWitchX() - approachDistance) triggerWitchScene();
    }
    requestAnimationFrame(watchWitch);
  }

  window.addEventListener("resize", positionWitchAndBubble);
  requestAnimationFrame(watchWitch);
})();
