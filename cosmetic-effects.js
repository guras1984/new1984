// Cosmetic rendering is visual only; combat damage and hit geometry stay in script.js.
window.EXTRA_COSMETICS = [
 ...[['rainbow','무지개 리본',55,'#9bf1ff'],['lightning','푸른 번개',60,'#7bcfff'],['sakura','벚꽃 바람',55,'#ffc5df'],['meteor','유성우',80,'#c9c1ff'],['frost','서리 궤적',55,'#caf6ff']].map(([id,name,price,color])=>({id,slot:'trail',name,price,color,desc:'움직임을 따라 흐르는 '+name})),
 ...[['angel','천사 날개',85,'#fff2c9'],['dragon','용의 날개',100,'#8ff5ce'],['hologram','홀로그램 날개',90,'#c3a8ff'],['icewing','얼음 결정',80,'#b2edff']].map(([id,name,price,color])=>({id,slot:'wings',name,price,color,desc:'기체 양옆에 펼쳐지는 '+name})),
 ...[['crescent','초승달',65,'#ffe1a1'],['sunring','태양 고리',75,'#ffd07c'],['snowflake','눈꽃',65,'#d5f5ff'],['magnetic','전자기장',80,'#89e9ff'],['rainbowcrown','무지개 왕관',110,'#e7baff'],['constellation','별자리 축제',100,'#c9d6ff'],['corona','태양 코로나',120,'#ffd68a'],['thunderorb','번개 구체',110,'#88dfff'],['butterflies','나비 정원',100,'#f2beff'],['blossom','벚꽃 소용돌이',90,'#ffc6df'],['nebula','은하 소용돌이',130,'#b5afff'],['icecrown','얼음 왕관',110,'#baf0ff'],['fireworks','축제 불꽃',120,'#ffe89b'],['dragonspirit','용의 기운',150,'#9af0c1']].map(([id,name,price,color])=>({id,slot:'aura',name,price,color,desc:({rainbowcrown:'일곱 빛의 보석이 회전하는 왕관',constellation:'별들이 연결되고 흩어지는 밤하늘',corona:'황금 불꽃이 넘실거리는 광륜',thunderorb:'회전 고리 사이를 잇는 전기',butterflies:'빛나는 나비들의 작은 정원',blossom:'분홍 꽃잎이 감싸는 소용돌이',nebula:'두 색의 나선과 흐르는 별가루',icecrown:'반짝이는 수정 조각의 왕관',fireworks:'작게 피어나는 다채로운 불꽃',dragonspirit:'길게 휘감아 도는 빛의 용'})[id]||'기체 주위를 감싸는 '+name})),
 ...[['pearl','진주빛',65,'#f2eee5'],['obsidian','흑요석',75,'#7993b5'],['rosegold','로즈 골드',85,'#efb8aa'],['cosmicpaint','우주 도색',100,'#aa9bff']].map(([id,name,price,color])=>({id,slot:'paint',name,price,color,desc:'기체 외장을 바꾸는 '+name+' 도색'})),
 ...[['starshot','별빛 탄환',55,'#ffe9a1'],['crystalshot','수정 탄환',65,'#b7eeff'],['flameshot','불꽃 탄환',70,'#ffd19c'],['boltshot','번개 탄환',75,'#9cddff'],['heartshot','하트 탄환',60,'#ffbadb'],['rainbowshot','무지개 탄환',90,'#bdf5ff']].map(([id,name,price,color])=>({id,slot:'bullet',name,price,color,desc:'공격 성능은 그대로, '+name+' 외형 적용'}))
];
window.cosmeticPaint = function(base,id){
 const palettes={pearl:{base:'#c5bba7',high:'#fffdf4',accent:'#ead79d'},obsidian:{base:'#26394f',high:'#8ba7c7',accent:'#a5daff'},rosegold:{base:'#bb7770',high:'#ffe1cc',accent:'#f4bd8b'},cosmicpaint:{base:'#4d3b88',high:'#bba8ec',accent:'#87e9ed'}};
 return palettes[id]||base;
};
window.drawCosmeticBullet = function(c,x,y,size,id,t=0){
 c.save();c.translate(x,y);const color={starshot:'#ffe7a0',crystalshot:'#a4e7ff',flameshot:'#ffce85',boltshot:'#8bdeff',heartshot:'#ffb7d8',rainbowshot:`hsl(${(t*3+y*2)%360},85%,78%)`}[id]||'#a3e2ff';
 c.fillStyle=color;c.strokeStyle=color;c.lineWidth=2;c.shadowColor=color;c.shadowBlur=5;
 if(id==='boltshot'){c.beginPath();c.moveTo(2,-8);c.lineTo(-3,-1);c.lineTo(2,0);c.lineTo(-2,8);c.stroke();}
 else if(id==='heartshot'){c.beginPath();c.moveTo(0,5);c.bezierCurveTo(-10,-1,-3,-9,0,-3);c.bezierCurveTo(3,-9,10,-1,0,5);c.fill();}
 else if(id==='starshot'){star(c,0,0,6,t*.01);}
 else if(id==='crystalshot'){c.beginPath();c.moveTo(0,-8);c.lineTo(4,0);c.lineTo(0,7);c.lineTo(-4,0);c.closePath();c.fill();}
 else if(id==='flameshot'){c.beginPath();c.moveTo(0,-7);c.quadraticCurveTo(8,4,0,11);c.quadraticCurveTo(-7,4,0,-7);c.fill();}
 else{c.beginPath();c.ellipse(0,0,3,7,0,0,Math.PI*2);c.fill();}
 c.restore();
};
function star(c,x,y,r,a=0){c.beginPath();for(let i=0;i<10;i++){const angle=a+i*Math.PI/5-Math.PI/2,rr=i%2?r*.43:r;c.lineTo(x+Math.cos(angle)*rr,y+Math.sin(angle)*rr);}c.closePath();c.fill();}
window.drawExtraCosmetic = function(c,p,t,preview){
 if(!window.EXTRA_COSMETICS.some(v=>v.id===p.id))return false;
 if(p.slot==='paint'||p.slot==='bullet')return true;
 c.save();c.globalAlpha=preview?.9:.52;c.shadowBlur=preview?10:4;c.lineWidth=1.5;
 const time=t*.022;
 if(p.slot==='trail'){
  for(let i=0;i<18;i++){const age=(t*1.6+i*7)%95,x=Math.sin(i*2.1+time)*age*.19,y=24+age;c.globalAlpha=(1-age/100)*(preview?.9:.55);
   if(p.id==='rainbow')c.fillStyle=`hsl(${i*21+t},85%,78%)`;
   if(p.id==='lightning'){c.beginPath();c.moveTo(x,y);c.lineTo(x+5,y+6);c.lineTo(x-3,y+9);c.stroke();}
   else if(p.id==='sakura'){c.beginPath();c.ellipse(x,y,3,1.6,time+i,0,Math.PI*2);c.fill();}
   else if(p.id==='meteor'){c.beginPath();c.moveTo(x,y);c.lineTo(x+4,y+13);c.stroke();}
   else if(p.id==='frost')star(c,x,y,2.5,time);
   else{c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
  }
 }else if(p.slot==='wings'){
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const spread=40+i*3+Math.sin(time)*3;c.beginPath();c.moveTo(side*14,4+i*2);
   if(p.id==='angel'){c.quadraticCurveTo(side*spread,-22+i*5,side*(42-i*4),18+i*2);c.quadraticCurveTo(side*25,10,side*14,4);}
   else if(p.id==='dragon'){c.lineTo(side*spread,-17+i*6);c.lineTo(side*(27+i*2),20);c.lineTo(side*19,10);}
   else if(p.id==='icewing'){c.lineTo(side*spread,-15+i*5);c.lineTo(side*(31+i),17);c.closePath();}
   else{c.lineTo(side*spread,-13+i*7);c.lineTo(side*24,23);}
   c.stroke();
  }
 }else{
  const id=p.id,n=id==='dragonspirit'?22:id==='nebula'?24:12;
  for(let i=0;i<n;i++){
   const a=time+i*Math.PI*2/n,r=34+Math.sin(time*1.7+i)*5,x=Math.cos(a)*r,y=Math.sin(a)*r*.78+4;
   if(id==='rainbowcrown'||id==='fireworks')c.fillStyle=`hsl(${i*31+t},80%,78%)`;
   if(id==='constellation'){c.beginPath();c.moveTo(x,y);c.lineTo(Math.cos(a+.52)*r,Math.sin(a+.52)*r*.78+4);c.stroke();star(c,x,y,2.5);}
   else if(id==='butterflies'){for(const side of [-1,1]){c.beginPath();c.ellipse(x+side*3,y,3,1.3+Math.abs(Math.sin(time*5))*2,side*.5,0,Math.PI*2);c.fill();}}
   else if(id==='blossom'){c.beginPath();c.ellipse(x,y,3.5,1.8,a,0,Math.PI*2);c.fill();}
   else if(['thunderorb','magnetic'].includes(id)){c.beginPath();c.moveTo(x,y);c.lineTo(x*.8+Math.sin(t+i)*4,y*.8);c.lineTo(x*.62,y*.62);c.stroke();}
   else if(['corona','sunring'].includes(id)){c.beginPath();c.moveTo(x,y);c.lineTo(x*1.18,y*1.18);c.lineTo(x*.95+3,y*.95);c.stroke();}
   else if(['icecrown','snowflake','rainbowcrown'].includes(id)){c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(0,-5);c.lineTo(3,0);c.lineTo(0,5);c.lineTo(-3,0);c.closePath();c.stroke();c.restore();}
   else if(id==='fireworks'){const phase=(time+i*.37)%1;for(let j=0;j<5;j++){const q=j*Math.PI*2/5;c.beginPath();c.arc(x+Math.cos(q)*phase*7,y+Math.sin(q)*phase*7,1.1,0,Math.PI*2);c.fill();}}
   else if(id==='dragonspirit'){c.globalAlpha=(.2+i/n*.65)*(preview?1:.65);c.beginPath();c.arc(x,y,1.5+i/n*3.5,0,Math.PI*2);c.fill();if(i===n-1){c.fillStyle='#f2ffe5';star(c,x,y,4,a);}}
   else if(id==='crescent'){if(i<7){c.beginPath();c.arc(x,y,2.5,0,Math.PI*2);c.fill();}}
   else if(id==='nebula'){c.fillStyle=i%2?'#9de9ef':'#ccb3ff';const rr=18+i*.9;c.beginPath();c.arc(Math.cos(a+i*.3)*rr,Math.sin(a+i*.3)*rr*.8,2,0,Math.PI*2);c.fill();}
  }
 }
 c.restore();return true;
};
