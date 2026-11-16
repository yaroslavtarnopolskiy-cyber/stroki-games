/* Экран результата показывается при проигрыше до ведьмы и после финальной сцены.
   После активированного чекпоинта у ведьмы поражение сразу возвращает игрока к чекпоинту. */
(() => {
  const STORY_URL = "https://mtsbooks.onelink.me/zdZb/t75hb4td";
  const ROUTE_METERS = 300;

  const overlay = document.createElement("div");
  overlay.id = "result-screen";
  overlay.setAttribute("aria-hidden", "true");

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "120",
    background: "#000",
    opacity: "0",
    visibility: "hidden",
    pointerEvents: "none",
    transition: "opacity 180ms ease, visibility 180ms ease",
    overflow: "hidden"
  });

  /* Весь экран собирается в системе координат макета 16:9. */
  const stage = document.createElement("div");
  Object.assign(stage.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "100%",
    height: "100%",
    transform: "translate(-50%, -50%)"
  });

  const background = document.createElement("img");
  background.src = "assets/UI/эеран успеха.png";
  background.alt = "Экран результата";
  Object.assign(background.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    userSelect: "none",
    webkitUserDrag: "none",
    pointerEvents: "none"
  });
  stage.appendChild(background);

  // A paper patch covers the old baked-in lockup without changing the artwork.
  const brandPaper=document.createElement('div');brandPaper.className='runner-result-brand-paper';brandPaper.setAttribute('aria-hidden','true');stage.appendChild(brandPaper);
  const brandRow=document.createElement('div');brandRow.className='runner-result-brands';brandRow.setAttribute('role','group');brandRow.setAttribute('aria-label','Песни Земли, НИУ ВШЭ и КИОН Строки');
  const projectLogo=document.createElement('img');projectLogo.src='../../assets/logo.svg';projectLogo.alt='Песни Земли';projectLogo.className='result-project-logo';projectLogo.decoding='async';brandRow.append(projectLogo);
  const separator=document.createElement('span');separator.textContent='×';separator.setAttribute('aria-hidden','true');brandRow.append(separator);
  const partnerLogos=document.createElement('div');partnerLogos.className='runner-result-partners';
  [
    ['../../partners/hse-light.svg','НИУ ВШЭ','result-hse-logo'],
    ['../../assets/kion_stroki_logo_black.svg','КИОН Строки','result-kion-logo']
  ].forEach(([src,alt,className])=>{
    const logo=document.createElement('img');logo.src=src;logo.alt=alt;logo.className=className;logo.decoding='async';
    if(className==='result-kion-logo'){const link=document.createElement('a');link.className='result-kion-link';link.href=STORY_URL;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','КИОН Строки — сборник «Песни Земли»');link.append(logo);partnerLogos.append(link)}else partnerLogos.append(logo);
  });
  brandRow.append(partnerLogos);
  stage.appendChild(brandRow);


  const distance = document.createElement("div");
  distance.id = "result-distance";
  Object.assign(distance.style, {
    position: "absolute",
    left: "8.5%",
    top: "72.5%",
    width: "28%",
    color: "#fff",
    fontFamily: 'Izvod, Glanz, Georgia, serif',
    fontSize: "32px",
    lineHeight: "1.15",
    whiteSpace: "nowrap",
    textAlign: "center",
    letterSpacing: "0.015em",
    textShadow: "0 2px 2px rgba(0,0,0,0.28)",
    pointerEvents: "none"
  });
  stage.appendChild(distance);

  let resultButtonIndex=0;
  // Carved silhouettes and fine cuts echo the story selector's pictograms.
  const carvedIcon=(shape,cuts)=>`<g transform="scale(.1875)" fill="currentColor" stroke="none">${shape}<g fill="none" stroke="#080808" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${cuts}</g></g>`;
  const resultSymbols=[
    carvedIcon('<path d="M33 17h62v24c0 24-10 38-26 42v17h20v10H39v-10h20V83C43 79 33 65 33 41ZM33 24H13v16c0 20 14 30 29 31l-6-11c-10-3-14-9-14-20v-7h11ZM95 24h20v16c0 20-14 30-29 31l6-11c10-3 14-9 14-20v-7H95Z"/><path d="M33 112h62v6H33Z"/>','<path d="m64 29 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9 12-2Z"/><path d="M42 23v18c0 18 6 28 15 32M49 25v13M72 105h11M45 115h13"/>'),
    carvedIcon('<path d="M10 72 38 59c9-20 24-25 40-18 1-10 6-22 17-22 10-1 17 6 16 14l12 7-14 6c-2 18-15 30-30 33-14 3-25 1-35-3L9 94l12-17Z"/><path d="m52 77 4 22-11 8 2 4 16-8-2-24m16-4 3 22-9 8 3 4 13-9-2-28"/>','<path d="M38 67c14-20 31-24 43-18-5 15-17 24-33 24M46 65l23-10m-17 15 19-8M97 29h2m-9 16 10-3M23 81l13-8"/>'),
    carvedIcon('<path d="M12 28c17-5 35-5 52 4 17-9 35-9 52-4v78c-18-6-35-5-52 3-17-8-34-9-52-3ZM20 18c15-3 29-1 40 5v7c-12-5-25-7-40-4ZM108 18c-15-3-29-1-40 5v7c12-5 25-7 40-4Z"/>','<path d="M64 38v62M23 39c10-2 20-1 29 3M23 48c10-2 20-1 29 3M23 84c10-2 20-1 29 3M23 93c10-2 20-1 29 3M76 42c9-4 19-5 29-3M76 51c9-4 19-5 29-3M76 87c9-4 19-5 29-3M76 96c9-4 19-5 29-3m-73-36 7 8-7 8-7-8Zm58 0 7 8-7 8-7-8Z"/>'),
    '<path d="M5 8a8 8 0 1 1-1 8M5 3v6h6"/>',
    '<path d="M12 12c-3-6-8-6-9-2s3 9 9 2c6-7 10-2 9 2s-6 4-9-2Z"/>',
    '<path d="M10 4H4v16h6m4-13 5 5-5 5M8 12h11"/>'
  ];
  function createResultButton(src,alt,box,onClick){
    const index=resultButtonIndex++,button=document.createElement('button');
    button.type='button';button.className='runner-result-button'+(index>=3?' is-compact':'')+(index===0?' is-record':'');button.setAttribute('aria-label',alt);button.title=alt;
    Object.assign(button.style,{position:'absolute',left:box.left,top:box.top,width:box.width,height:box.height,zIndex:'3'});
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.innerHTML=resultSymbols[index];
    if(index<3)icon.style.color=index===1?'var(--runner-blue)':'var(--runner-red)';
    button.append(icon);
    {const label=document.createElement('span');label.textContent=index===5?'Выход':alt;button.append(label)}
    button.addEventListener('click',onClick);stage.append(button);return button;
  }

  function currentDistanceMeters(result) {
    if (window.infiniteMode && typeof window.getEndlessDistanceMeters === "function") {
      return window.getEndlessDistanceMeters();
    }
    if (result === "win") return ROUTE_METERS;
    const maxScroll = Math.max(1, world.scrollWidth - game.clientWidth);
    const progress = Math.max(0, Math.min(1, worldX / maxScroll));
    return Math.round(progress * ROUTE_METERS);
  }

  function currentGameUrl() {
    return window.runnerLandingUrl || window.location.href.split("#")[0];
  }

  async function sharePayload(payload) {
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }

    const fallbackText = [payload.text, payload.url].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(fallbackText);
    } catch (_) {
      window.prompt("Скопируйте ссылку:", payload.url || fallbackText);
    }
  }

  function hideResultScreen() {
    window.runnerResultVisible = false;
    window.parent.postMessage({channel:"pesni-runner",type:"screen",screen:"play"},location.origin);
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
  }

  function restartFromBeginning({ infinite = false } = {}) {
    hideResultScreen();
    window.clearWitchCheckpoint?.();
    window.finalSequenceActive = false;
    window.infiniteMode = infinite;
    tutorialShown = false;
    window.runnerResetWitchScene?.();
    window.runnerResetFinalScene?.();
    resetRun();
    running = true;
    lastFrameAt = performance.now();
  }

  createResultButton(
    "assets/UI/ПЗ_Поделиться Рекордом.png",
    "Поделиться рекордом",
    { left: "7.0%", top: "89.2%", width: "31.0%", height: "7.2%" },
    () => {
      const meters = Number(distance.dataset.meters || 0);
      sharePayload({
        title: "Добеги до любимой — Песни Земли",
        text: `Я пробежал ${meters} м в мире «Песен Земли». Попробуй побить мой результат!`,
        url: currentGameUrl()
      });
    }
  );

  createResultButton(
    "assets/UI/ПЗ_Поделиться Игрой.png",
    "Поделиться игрой",
    { left: "55.9%", top: "55.0%", width: "39.2%", height: "13.0%" },
    () => sharePayload({
      title: "Добеги до любимой — Песни Земли",
      text: "Сможешь добежать до любимой? Меняй облик человека и медведя в игре по мотивам «Маски человека» из «Песен Земли».",
      url: currentGameUrl()
    })
  );

  createResultButton(
    "assets/UI/ПЗ_ПрочестьИсторию.png",
    "Прочесть историю",
    { left: "55.9%", top: "71.0%", width: "39.2%", height: "13.0%" },
    () => { window.open(STORY_URL, "_blank", "noopener,noreferrer"); }
  );

  createResultButton(
    "assets/UI/ПЗ_Сначала.png",
    "Повторить",
    { left: "55.9%", top: "33.5%", width: "17.0%", height: "18.0%" },
    () => restartFromBeginning({ infinite: false })
  );

  createResultButton(
    "assets/UI/ПЗ_Беск_режим.png",
    "Бесконечный режим",
    { left: "74.0%", top: "33.5%", width: "21.1%", height: "18.0%" },
    () => restartFromBeginning({ infinite: true })
  );

  createResultButton(
    "assets/UI/ПЗ_Выход.png",
    "Выход",
    { left: "85.1%", top: "88.0%", width: "10.0%", height: "9.5%" },
    () => {
      if (window.runnerExit) { window.runnerExit(); return; }
      window.close();
      window.setTimeout(() => {
        if (!window.closed) {
          if (window.history.length > 1) window.history.back();
          else window.location.replace("about:blank");
        }
      }, 120);
    }
  );

  overlay.appendChild(stage);
  game.appendChild(overlay);

  function fitStage(){
    const layout=fitRunnerResultLayout(innerWidth,innerHeight,distance.textContent.length);
    stage.style.width=`${layout.width}px`;stage.style.height=`${layout.height}px`;
    stage.style.fontSize=`${layout.width/100}px`;
    distance.style.fontSize=`${layout.distanceFont}px`;
  }

  fitStage();
  window.addEventListener("resize", fitStage);

  window.showResultScreen = function showResultScreen(result = "loss") {
    window.runnerResultVisible = true;
    window.parent.postMessage({channel:"pesni-runner",type:"screen",screen:"result"},location.origin);
    const meters = currentDistanceMeters(result);
    distance.dataset.meters = String(meters);
    distance.textContent = `${meters} М`;
    fitStage();
    overlay.dataset.result = result;
    overlay.style.visibility = "visible";
    overlay.style.pointerEvents = "auto";
    overlay.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });
  };

  window.runnerFinishRun = function(){
    running=false;jump=null;wading=null;touchStart=null;
    window.runnerMouseInput?.cancel();window.runnerCancelWitchScene?.();window.runnerResetFinalScene?.();
    hero.classList.remove('falling','jumping','wading','witch-paused');hero.style.transform='';
    game.style.transform='scale(1)';window.showResultScreen('loss');
  };

  /* До ведьмы поражение показывает экран результата.
     После ведьмы — очень короткое затемнение и быстрый рестарт от чекпоинта. */
  failRun = function failRunWithCheckpointAwareResult() {
    if (!running || window.finalSequenceActive) return;

    running = false;
    jump = null;
    wading = null;
    hero.classList.remove("wading");
    hero.style.transform = "";
    hero.classList.remove("running", "jumping");
    hero.classList.add("falling");

    window.setTimeout(() => {
      if (window.hasWitchCheckpoint?.()) {
        resetRun();
        return;
      }

      window.showResultScreen("loss");
    }, 240);
  };
})();
