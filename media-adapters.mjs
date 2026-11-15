// Media adapters (docs/briefs/edtech-v2-claude/requirements/MEDIA_PIPELINE.md).
// SpeechProvider: localFixture is active; elevenLabs is a disabled contract that never makes a network call in this
// iteration, even with a key in the environment. VideoRenderer: local Remotion render from the repository (video/).
// CaptionSource: local WebVTT next to the media file. Mock jobs are deterministic; timeout and error are reproducible.
import fs from 'node:fs';
const FIXTURES={'M01:0.1.0:ru':{audio:'/media/M01/0.2.0/audio.ru.mp3',video:'/media/M01/0.2.0/lesson.mp4',captions:'/media/M01/0.2.0/captions.ru.vtt'},
 'M01:0.1.0:kk':{audio:null,video:'/media/M01/0.2.0/lesson.mp4',captions:'/media/M01/0.2.0/captions.kk.vtt'}};
export const providers={
 speech:{localFixture:{enabled:true},elevenLabs:{enabled:false,reason:'paid provider, disabled in local mode'}},
 video:{localRender:{enabled:true,tool:'remotion (video/)'},videoCraft:{enabled:false,reason:'no VideoCraft skill or adapter found in this project'}},
 captions:{localVtt:{enabled:true}}
};
export async function job(input,{paid}){
 const locale=input.locale==='kk'?'kk':'ru',script=String(input.approvedScriptId||''),version=String(input.scriptVersion||'');
 if(!/^[A-Za-z0-9_-]{1,20}$/.test(script)||!/^[0-9.]{1,12}$/.test(version))return [400,{code:'bad_request'}];
 const jobId=['job',script,version,locale].join('-');
 if(input.simulate==='timeout')return [504,{jobId,status:'timeout',providerMode:'mock'}];
 if(input.simulate==='error')return [502,{jobId,status:'error',safeCode:'mock_provider_error',providerMode:'mock'}];
 // Asking for ElevenLabs gives the same local answer: the adapter is disabled, not silently replaced by a fake voice.
 const wanted=input.provider==='elevenLabs'?'elevenLabs':'localFixture';
 const f=FIXTURES[[script,version,locale].join(':')];
 const exists=p=>!!p&&fs.existsSync('dist'+p);
 return [200,{jobId,status:f?'done':'no_fixture',providerMode:wanted==='elevenLabs'?'disabled':'localFixture',paidAllowed:false,ownerSwitch:paid?'enabled_by_owner_env_but_adapter_not_wired':'off',
  localArtifactPath:f&&exists(f.video)?f.video:null,audioPath:f&&exists(f.audio)?f.audio:null,subtitlePath:f&&exists(f.captions)?f.captions:null,
  note:wanted==='elevenLabs'?'ElevenLabs adapter is disabled in this iteration. No request was sent.':null}];
}
