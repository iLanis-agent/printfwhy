var P=require('./engine.js'),fs=require('fs');var st={lines:0,compared:0,agree:0,skippedUndefined:0,undefinedAlsoMatchGlibc:0,mismatch:0},mm=[];
process.argv.slice(2).forEach(function(f){fs.readFileSync(f,'utf8').split('\n').filter(Boolean).forEach(function(l){
 var o=JSON.parse(l);st.lines++;var r=P.run(o.fmt,o.args);
 var bad=r.items.some(function(i){return i.error});
 if(r.anyUndef){st.skippedUndefined++;if(!bad&&r.output===o.out)st.undefinedAlsoMatchGlibc++;return;}
 st.compared++;
 if(!bad&&r.output===o.out&&!r.missing)st.agree++;else{st.mismatch++;mm.push({fmt:o.fmt,args:o.args,want:o.out,got:r.output,err:r.items.filter(function(i){return i.error}).map(function(i){return i.error})});}});});
console.log(JSON.stringify(st));mm.slice(0,+(process.env.SHOW||8)).forEach(function(m){console.log(JSON.stringify(m));});
