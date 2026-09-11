/* Shared access clock. The folder scopes each kaiju; both HTML pages use this file. */
(() => {
  'use strict';
  const folder=new URL('.',location.href).pathname;
  const key='ACLLECT_SESSION_V2:'+folder;
  let state, hooks={}, audio, terminated=false, navigating=false, noticeTimer;
  try{state=JSON.parse(sessionStorage.getItem(key))}catch(_){}
  if(!state||!Number.isFinite(state.start)||state.start>Date.now()||!Number.isInteger(state.stage))state={start:Date.now(),stage:0};
  const save=()=>{try{sessionStorage.setItem(key,JSON.stringify(state))}catch(_){}};
  save();
  function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e}
  const notice=make('aside','access-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.hidden=true;document.body.append(notice);
  const channel=make('div','channel-switch');channel.hidden=true;channel.setAttribute('role','status');channel.setAttribute('aria-live','polite');
  const channelTag=make('small','','LEGACY NODE 09 // CHANNEL TRANSFER'),channelText=make('strong'),channelSteps=make('div','channel-steps');
  channel.append(channelTag,channelText,channelSteps);document.body.append(channel);
  const end=make('dialog','session-end'),endTag=make('small','','CENTRAL COMMAND OVERRIDE'),endTitle=make('h2','','CONNECTION TERMINATED'),endText=make('p','','SESSION LOG PRESERVED // TRACE COMPLETE'),reconnect=make('button','','RECONNECT / 再接続を試行');
  reconnect.type='button';reconnect.addEventListener('click',()=>api.reconnect());end.append(endTag,endTitle,endText,reconnect);document.body.append(end);
  function unlock(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch(_){}}
  document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
  function tone(f=480,d=.09){if(!audio||audio.state!=='running')return;const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.02);o.onended=()=>{o.disconnect();g.disconnect()}}
  function sound(level){if(hooks.sound){hooks.sound(level);return}tone(level===1?380:760,.12);if(level>1)setTimeout(()=>tone(580,.14),230)}
  function notify(level){
    notice.replaceChildren(make('small','','ACCESS CONTROL // '+(level===1?'VALIDATION PENDING':'TRACE ACTIVE')),make('strong','',level===1?'UNUSUAL ACCESS PATTERN DETECTED':'UNAUTHORIZED SESSION CONFIRMED'),make('span','',level===1?'セッション認証を再確認中':'接続元の追跡を開始しました'));
    notice.dataset.level=String(level);notice.hidden=false;clearTimeout(noticeTimer);sound(level);
    if(level===2){document.body.classList.add('security-interference');try{if(typeof navigator.vibrate==='function')navigator.vibrate([25,35,25])}catch(_){}setTimeout(()=>document.body.classList.remove('security-interference'),900)}
    noticeTimer=setTimeout(()=>notice.hidden=true,level===1?4200:6500);
  }
  function stopMedia(){document.querySelectorAll('audio,video').forEach(el=>el.pause());document.querySelectorAll('iframe').forEach(el=>el.remove());if(window.speechSynthesis)window.speechSynthesis.cancel()}
  function terminate(){if(terminated)return;terminated=true;notice.hidden=true;channel.hidden=true;navigating=false;stopMedia();
    if(hooks.terminate){hooks.terminate();return}
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    end.showModal();endTitle.textContent='REMOTE SESSION CONTROL REVOKED';reconnect.hidden=true;document.body.classList.add('security-interference');sound(3);
    setTimeout(()=>{endTitle.textContent='CONNECTION TERMINATED';document.body.classList.remove('security-interference');document.body.classList.add('archive-terminated');reconnect.hidden=false;reconnect.focus()},2400);
  }
  function tick(){if(navigating||document.hidden)return;const elapsed=Date.now()-state.start;const level=elapsed>=900000?3:elapsed>=600000?2:elapsed>=300000?1:0;
    if(state.stage===3){terminate();return}
    if(level>state.stage){state.stage=level;save();if(level===3)terminate();else notify(level)}
    document.querySelectorAll('[data-session-clock]').forEach(el=>{const sec=Math.max(0,Math.floor(elapsed/1000));el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')})
  }
  const interval=setInterval(tick,1000);document.addEventListener('visibilitychange',tick);addEventListener('pageshow',tick);
  const api={
    startedAt:state.start,
    configure(options){hooks=options;setTimeout(tick,0)},
    reconnect(){state={start:Date.now(),stage:0};save();stopMedia();location.assign('./index.html')},
    navigate(href,target){if(terminated||navigating)return;tick();if(terminated)return;navigating=true;stopMedia();if(hooks.leave)hooks.leave();
      const steps=target==='archive'?['CLASSIFIED DATABASE DISCONNECTED','ARCHIVE CHANNEL REQUESTED','CONNECTING TO ARCHIVE STORAGE…','ARCHIVE DATABASE CONNECTED']:['ARCHIVE DATABASE DISCONNECTED','RETURNING TO CLASSIFIED SYSTEM…','CLASSIFIED CHANNEL CONNECTED'];
      channelSteps.replaceChildren();channel.hidden=false;
      steps.forEach((text,i)=>setTimeout(()=>{if(terminated)return;channelText.textContent=text;channelSteps.append(make('span','',String(i+1).padStart(2,'0')+' / '+text));tone(420+i*55,.07)},i*650));
      setTimeout(()=>{if(!terminated)location.assign(href)},steps.length*650+250)
    }
  };
  window.TerminalSession=api;
  addEventListener('pagehide',()=>{clearInterval(interval);stopMedia();if(audio)audio.suspend()});
})();
