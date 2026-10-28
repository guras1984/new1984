const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../script.js'),'utf8');
const snippets=source.slice(source.indexOf('async function rankingRpc'),source.indexOf('function renderRanking'))+source.slice(source.indexOf('async function loadOnlineRanking'),source.indexOf('if (rankNicknameEl)'));
let calls=[],fail=false,failList=false;
const sandbox={AbortController,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,console,fetch:async(url,options)=>{
 calls.push({url,body:JSON.parse(options.body)});
 if(fail)throw new TypeError('network');
 return {ok:!(failList&&url.endsWith('new1984_leaderboard')),json:async()=>url.endsWith('new1984_leaderboard')?[]:true};
}};
vm.createContext(sandbox);
vm.runInContext(`const RANKING_URL='https://example.test/';const RANKING_KEY='public';let rankingResult=null,rankingSubmitted=false,rankingSubmitting=false,rankingLoadVersion=0;let score=1234,currentStage=4,kills=10,selectedDifficulty='normal',selectedPlaneType='jet';const rankNicknameEl={value:'조종사',focus(){}};const submitRankBtn={disabled:false};const rankStatusEl={textContent:''};const rankingListEl={innerHTML:''};const localStorage={setItem(){}};function renderRanking(rows){};${snippets}`,sandbox);
const run=code=>vm.runInContext(code,sandbox);
(async()=>{
 run('captureRankingResult()');const id=run('rankingResult.p_id');
 fail=true;await run('submitOnlineScore()');assert.equal(run('rankingSubmitted'),false);assert.equal(run('submitRankBtn.disabled'),false);
 fail=false;failList=true;await run('submitOnlineScore()');assert.equal(run('rankingSubmitted'),true);assert.match(run('rankStatusEl.textContent'),/점수는 등록/);
 assert.equal(calls.filter(c=>c.url.endsWith('new1984_submit_score')).length,2);
 assert.ok(calls.filter(c=>c.url.endsWith('new1984_submit_score')).every(c=>c.body.p_id===id));
 await run('submitOnlineScore()');assert.equal(calls.length,3);
 run("rankingResult=null;rankingSubmitted=false;score=2222;captureRankingResult();score=999999;selectedPlaneType='cruiser'");
 assert.equal(run('rankingResult.p_score'),2222);assert.equal(run('rankingResult.p_plane'),'jet');assert.notEqual(run('rankingResult.p_id'),id);
 failList=false;await run('submitOnlineScore()');assert.equal(run('rankingSubmitted'),true);
 assert.equal((source.match(/captureRankingResult\(\);/g)||[]).length,3);
 assert.ok(!source.includes('script.google.com'));console.log('PASS: retry uses same ID, duplicate blocked, immutable result, list failure preserves success, all mission endings connected');
})().catch(e=>{console.error(e);process.exitCode=1});
