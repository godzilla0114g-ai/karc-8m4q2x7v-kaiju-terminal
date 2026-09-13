/* Shared access clock. The folder scopes each kaiju; both HTML pages use this file. */
(() => {
  'use strict';
  // The archive is a separate document, but its audio and access clock belong
  // to the persistent terminal. Do not create another AudioContext here.
  try{if(window.parent!==window&&window.parent.TerminalSession){
    const host=window.parent.TerminalSession;
    let childHooks={};
    window.TerminalSession={startedAt:host.startedAt,configure(h){childHooks=h},
      authenticate:()=>host.authenticate(),isAuthenticated:()=>host.isAuthenticated(),
      reconnect:()=>host.reconnect(),navigate:(href,target)=>{if(childHooks.leave)childHooks.leave();host.navigate(href,target)},
      pause:()=>{if(childHooks.leave)childHooks.leave()}};
    document.addEventListener('pointerdown',()=>host.unlock(),{passive:true});
    document.addEventListener('keydown',()=>host.unlock());
    const updateChildClock=()=>{
      const elapsed=Math.max(0,Date.now()-host.startedAt),sec=Math.floor(elapsed/1000);
      const value=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
      document.querySelectorAll('[data-session-clock]').forEach(el=>el.textContent=value);
    };
    updateChildClock();
    const childClockInterval=setInterval(updateChildClock,1000);
    addEventListener('pagehide',()=>clearInterval(childClockInterval),{once:true});
    return;
  }}catch(_){}
  const folder=new URL('.',location.href).pathname;
  const key='ACLLECT_SESSION_V2:'+folder;
  let state, hooks={}, audio, terminated=false, navigating=false, noticeTimer;
  try{state=JSON.parse(sessionStorage.getItem(key))}catch(_){}
  if(!state||!Number.isFinite(state.start)||state.start>Date.now()||!Number.isInteger(state.stage))state={start:Date.now(),stage:0,authenticated:false};
  if(typeof state.authenticated!=='boolean')state.authenticated=false;
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
  function tone(f=480,d=.09){if(hooks.tone){hooks.tone(f,d);return}if(!audio||audio.state!=='running')return;const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.02);o.onended=()=>{o.disconnect();g.disconnect()}}
  function sound(level){if(hooks.sound){hooks.sound(level);return}tone(level===1?380:760,.12);if(level>1)setTimeout(()=>tone(580,.14),230)}
  function channelCheck(target){
    const notes=target==='archive'?[310,465,620,845]:[420,560,735];
    notes.forEach((frequency,index)=>setTimeout(()=>tone(frequency,index===notes.length-1?.16:.075),index*125));
  }
  function notify(level){
    notice.replaceChildren(make('small','','ACCESS CONTROL // '+(level===1?'VALIDATION PENDING':'TRACE ACTIVE')),make('strong','',level===1?'UNUSUAL ACCESS PATTERN DETECTED':'UNAUTHORIZED SESSION CONFIRMED'),make('span','',level===1?'セッション認証を再確認中':'接続元の追跡を開始しました'));
    notice.dataset.level=String(level);notice.hidden=false;clearTimeout(noticeTimer);sound(level);
    if(level===2){document.body.classList.add('security-interference');try{if(typeof navigator.vibrate==='function')navigator.vibrate([25,35,25])}catch(_){}setTimeout(()=>document.body.classList.remove('security-interference'),900)}
    noticeTimer=setTimeout(()=>notice.hidden=true,level===1?4200:6500);
  }
  let archiveFrame, savedScroll=0, returnFocus, loadTimeout;
  const main=document.querySelector('main.shell');
  function lock(){savedScroll=window.scrollY;returnFocus=document.activeElement;document.body.style.top=-savedScroll+'px';document.body.classList.add('channel-locked');if(main)main.inert=true}
  function release(){document.body.classList.remove('channel-locked');document.body.style.removeProperty('top');if(main)main.inert=false;window.scrollTo({top:savedScroll,behavior:'instant'});if(returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true})}
  const recover=make('button','','機密資料へ戻る');recover.type='button';recover.hidden=true;channel.append(recover);
  recover.addEventListener('click',()=>{clearTimeout(loadTimeout);if(archiveFrame){archiveFrame.remove();archiveFrame=null}release();channel.hidden=true;recover.hidden=true;navigating=false;if(hooks.resume)hooks.resume()});
  function stopMedia(){document.querySelectorAll('audio,video').forEach(el=>el.pause());document.querySelectorAll('iframe:not(#archiveChannelHost)').forEach(el=>el.remove());if(archiveFrame){try{archiveFrame.contentWindow.TerminalSession.pause()}catch(_){}}if(window.speechSynthesis)window.speechSynthesis.cancel()}
  function terminate(){if(terminated)return;terminated=true;notice.hidden=true;channel.hidden=true;navigating=false;stopMedia();
    if(archiveFrame){archiveFrame.remove();archiveFrame=null}release();
    if(hooks.terminate){hooks.terminate();return}
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    end.showModal();endTitle.textContent='REMOTE SESSION CONTROL REVOKED';reconnect.hidden=true;document.body.classList.add('security-interference');sound(3);
    setTimeout(()=>{endTitle.textContent='CONNECTION TERMINATED';document.body.classList.remove('security-interference');document.body.classList.add('archive-terminated');reconnect.hidden=false;reconnect.focus()},2400);
  }
  function tick(){if(document.hidden)return;const elapsed=Date.now()-state.start;const level=elapsed>=900000?3:elapsed>=600000?2:elapsed>=300000?1:0;
    if(state.stage===3){terminate();return}
    if(level>state.stage){state.stage=level;save();if(level===3)terminate();else notify(level)}
    document.querySelectorAll('[data-session-clock]').forEach(el=>{const sec=Math.max(0,Math.floor(elapsed/1000));el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')})
  }
  const interval=setInterval(tick,1000);document.addEventListener('visibilitychange',tick);addEventListener('pageshow',tick);
  const api={
    unlock(){unlock();if(hooks.unlock)hooks.unlock()},
    startedAt:state.start,
    configure(options){hooks=options;setTimeout(tick,0)},
    authenticate(){state.authenticated=true;save()},
    isAuthenticated(){return state.authenticated===true},
    reconnect(){state={start:Date.now(),stage:0,authenticated:false};save();stopMedia();location.assign('./index.html')},
    navigate(href,target){if(terminated||navigating)return;tick();if(terminated)return;api.unlock();navigating=true;stopMedia();if(!archiveFrame)lock();channelCheck(target);if(hooks.leave)hooks.leave();
      const steps=target==='archive'?['CLASSIFIED DATABASE DISCONNECTED','ARCHIVE ACCESS KEY CHECK','ARCHIVE CHANNEL AUTHENTICATED','CONNECTING TO ARCHIVE STORAGE…','ARCHIVE DATABASE CONNECTED']:['ARCHIVE DATABASE DISCONNECTED','CLASSIFIED SESSION KEY VERIFIED','RETURNING TO CLASSIFIED SYSTEM…','CLASSIFIED CHANNEL CONNECTED'];
      channelSteps.replaceChildren();channel.hidden=false;
      steps.forEach((text,i)=>setTimeout(()=>{if(terminated)return;channelText.textContent=text;channelSteps.append(make('span','',String(i+1).padStart(2,'0')+' / '+text));tone(420+i*55,.07)},i*650));
      setTimeout(()=>{
        if(terminated)return;
        if(main&&target==='archive'){
          archiveFrame=make('iframe','archive-channel');archiveFrame.id='archiveChannelHost';
          archiveFrame.title='ガバラ作品資料庫';archiveFrame.allow='autoplay; fullscreen';
          loadTimeout=setTimeout(()=>{channelText.textContent='ARCHIVE CHANNEL UNAVAILABLE';recover.hidden=false},12000);
          archiveFrame.addEventListener('load',()=>{if(terminated||!archiveFrame)return;
            try{if(!archiveFrame.contentDocument.querySelector('#archiveMain')){channelText.textContent='ARCHIVE CHANNEL UNAVAILABLE';recover.hidden=false;clearTimeout(loadTimeout);return}}catch(_){channelText.textContent='ARCHIVE CHANNEL UNAVAILABLE';recover.hidden=false;clearTimeout(loadTimeout);return}
            clearTimeout(loadTimeout);recover.hidden=true;channel.hidden=true;navigating=false;archiveFrame.classList.add('channel-reveal');archiveFrame.focus();tick()},{once:true});
          archiveFrame.src=href;document.body.append(archiveFrame);
        }else if(main&&target==='classified'){
          if(archiveFrame){archiveFrame.remove();archiveFrame=null}release();channel.hidden=true;navigating=false;
          document.body.classList.remove('classified-return');main.classList.remove('channel-reveal');void main.offsetWidth;main.classList.add('channel-reveal');
          if(hooks.resume)hooks.resume();tick();
        }else location.assign(href);
      },steps.length*650+500)
    }
  };
  window.TerminalSession=api;
  addEventListener('pagehide',()=>{clearInterval(interval);stopMedia();if(audio)audio.suspend()});
})();
