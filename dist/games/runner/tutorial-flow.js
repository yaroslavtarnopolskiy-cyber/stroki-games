/* Non-blocking onboarding: show once per new run, remain visible during play for 5 s. */
(() => {
 const TUTORIAL_DELAY_MS=0,AUTO_CLOSE_MS=5000;
 const card=tutorialOverlay.querySelector('.tutorial-card');
 // Rebuild the controls here as well, so a previously cached HTML shell cannot
 // keep displaying the old mouse-only cards after this script is refreshed.
 if(card)card.innerHTML=`
  <div class="tutorial-controls tutorial-controls--desktop">
   <div class="tutorial-gesture-card"><div class="tutorial-gesture-label">Прыжок</div><div class="tutorial-shortcuts"><kbd aria-label="Стрелка вверх">↑</kbd><kbd>пробел</kbd></div><p class="tutorial-help">клавиша ↑, пробел или один клик</p></div>
   <div class="tutorial-gesture-card"><div class="tutorial-gesture-label">Смена облика</div><div class="tutorial-shortcuts"><kbd aria-label="Стрелка вниз">↓</kbd><kbd>E</kbd></div><p class="tutorial-help">клавиша ↓, E, двойной клик или ПКМ</p></div>
  </div>
  <div class="tutorial-controls tutorial-controls--touch">
   <div class="tutorial-gesture-card"><div class="tutorial-gesture-label">Прыжок</div><div class="tutorial-shortcuts"><kbd>↑</kbd></div><p class="tutorial-help">свайп вверх или два тапа</p></div>
   <div class="tutorial-gesture-card"><div class="tutorial-gesture-label">Смена облика</div><div class="tutorial-shortcuts"><kbd>тап</kbd></div><p class="tutorial-help">коснитесь экрана</p></div>
  </div>`;
 let tutorialStarted=false,tutorialVisible=false,runStartedAt=null,closeTimer=null;
 tutorialShown=true;tutorialActive=false;
 function hideTutorial(){
  clearTimeout(closeTimer);closeTimer=null;tutorialVisible=false;tutorialActive=false;
  tutorialOverlay.classList.remove('is-lingering');tutorialOverlay.classList.add('is-hidden');
  tutorialOverlay.style.pointerEvents='none';tutorialOverlay.setAttribute('aria-hidden','true');
 }
 function showTutorialWhileRunning(){
  if(tutorialStarted||window.infiniteMode)return;
  tutorialStarted=true;tutorialVisible=true;tutorialActive=false;
  tutorialOverlay.classList.remove('is-hidden');tutorialOverlay.classList.add('is-lingering');
  tutorialOverlay.style.pointerEvents='none';tutorialOverlay.setAttribute('aria-hidden','false');
  clearTimeout(closeTimer);closeTimer=setTimeout(hideTutorial,AUTO_CLOSE_MS);
 }
 function disableTutorial(){tutorialStarted=true;runStartedAt=null;tutorialShown=true;hideTutorial()}
 showTutorial=showTutorialWhileRunning;closeTutorial=hideTutorial;
 const originalResetRun=resetRun;
 resetRun=function resetRunWithTutorialState(){
  originalResetRun();hideTutorial();tutorialShown=true;
  if(window.infiniteMode){disableTutorial();return}
  if(worldX<locationWidth*.08){tutorialStarted=false;runStartedAt=performance.now();if(gameStarted)showTutorialWhileRunning()}
  else disableTutorial();
 };
 function updateTutorialFlow(now){
  if(window.infiniteMode){if(tutorialVisible||!tutorialStarted)disableTutorial()}
  else if(gameStarted&&!tutorialStarted){
   tutorialShown=true;if(runStartedAt===null)runStartedAt=now;
   if(running&&now-runStartedAt>=TUTORIAL_DELAY_MS)showTutorialWhileRunning();
  }
  requestAnimationFrame(updateTutorialFlow);
 }
 requestAnimationFrame(updateTutorialFlow);
})();
