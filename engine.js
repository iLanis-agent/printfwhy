(function(root){
  'use strict';
  var INT_BITS={hh:8,h:16,'':32,l:64,ll:64,j:64,z:64,t:64};
  var FLOATS='fFeEgGaA';
  function parse(fmt){
    var out=[],i=0,lit='';
    function flush(){if(lit){out.push({kind:'lit',text:lit});lit='';}}
    while(i<fmt.length){
      var c=fmt[i];
      if(c!=='%'){lit+=c;i++;continue;}
      flush();
      var st=i;i++;
      var sp={kind:'spec',flags:'',width:null,widthStar:false,prec:null,precStar:false,len:'',conv:'',text:'',notes:[]};
      while(i<fmt.length&&'-+ #0'.indexOf(fmt[i])>=0){if(sp.flags.indexOf(fmt[i])<0)sp.flags+=fmt[i];else sp.notes.push('flag "'+fmt[i]+'" repeated');i++;}
      if(fmt[i]==='*'){sp.widthStar=true;i++;}else{var m=/^\d+/.exec(fmt.slice(i));if(m){sp.width=parseInt(m[0],10);i+=m[0].length;}}
      if(fmt[i]==='.'){i++;sp.prec=0;if(fmt[i]==='*'){sp.precStar=true;sp.prec=null;i++;}else{var m2=/^\d+/.exec(fmt.slice(i));if(m2){sp.prec=parseInt(m2[0],10);i+=m2[0].length;}else sp.precDot=true;}}
      var lm=/^(hh|h|ll|l|j|z|t|L)/.exec(fmt.slice(i));if(lm){sp.len=lm[0];i+=lm[0].length;}
      if(i>=fmt.length){sp.conv='';sp.text=fmt.slice(st);sp.invalid='The format ends in the middle of a conversion';out.push(sp);break;}
      sp.conv=fmt[i];i++;sp.text=fmt.slice(st,i);
      out.push(sp);}
    flush();return out;}
  function rawFlag(sp,f){return sp.flags.indexOf(f)>=0;}
  function pad(body,width,left){if(width===null||body.length>=width)return body;var p=new Array(width-body.length+1).join(' ');return left?body+p:p+body;}
  function fmtOne(sp,width,prec,arg){
    // returns {s, undef:[...]} ; width/prec already resolved (null if none)
    var undef=[],conv=sp.conv,left=rawFlag(sp,'-'),zero=rawFlag(sp,'0'),plus=rawFlag(sp,'+'),space=rawFlag(sp,' '),alt=rawFlag(sp,'#');
    if(conv==='%')return {s:'%',undef:undef};
    if(conv==='c'||conv==='s'){
      if(alt)undef.push('the # flag has no defined meaning with %'+conv);
      if(zero)undef.push('the 0 flag has no defined meaning with %'+conv);
      if(plus||space)undef.push('+ and space flags only apply to signed conversions (d, i)');
      if(conv==='c'&&prec!==null)undef.push('a precision has no defined meaning with %c');
      if(sp.len&&sp.len!=='l')undef.push('length modifier "'+sp.len+'" is not defined for %'+conv);
      var body;
      if(conv==='c'){body=String.fromCharCode(Number(BigInt.asUintN(8,arg.int)));}
      else{body=arg.str;if(prec!==null&&prec<body.length)body=body.slice(0,prec);}
      return {s:pad(body,width,left),undef:undef};}
    var signed=conv==='d'||conv==='i';
    var bits=INT_BITS[sp.len];
    if(bits===undefined){undef.push('length modifier "'+sp.len+'" is not defined for %'+conv);bits=32;}
    var v=signed?BigInt.asIntN(bits,arg.int):BigInt.asUintN(bits,arg.int);
    if(alt&&!(conv==='o'||conv==='x'||conv==='X'))undef.push('the # flag has no defined meaning with %'+conv);
    if(!signed&&(plus||space))undef.push('+ and space flags only apply to signed conversions (d, i)');
    var neg=v<0n,mag=neg?-v:v;
    var base=conv==='o'?8:(conv==='x'||conv==='X')?16:10;
    var digits=mag.toString(base);if(conv==='X')digits=digits.toUpperCase();
    if(prec!==null){if(prec===0&&v===0n)digits='';else while(digits.length<prec)digits='0'+digits;}
    var prefix='';
    if(signed){prefix=neg?'-':plus?'+':space?' ':'';}
    if(conv==='o'&&alt&&digits[0]!=='0')digits='0'+digits;
    if((conv==='x'||conv==='X')&&alt&&v!==0n)prefix=conv==='x'?'0x':'0X';
    var total=prefix.length+digits.length;
    var zeroPad=zero&&!left&&prec===null;
    if(width!==null&&total<width){
      var n=width-total;
      if(left)return {s:prefix+digits+new Array(n+1).join(' '),undef:undef};
      if(zeroPad)return {s:prefix+new Array(n+1).join('0')+digits,undef:undef};
      return {s:new Array(n+1).join(' ')+prefix+digits,undef:undef};}
    return {s:prefix+digits,undef:undef};}
  // args: array of strings. returns {items:[{...}], output, extraArgs, missing}
  function run(fmt,args){
    var parts=parse(fmt),ai=0,out='',items=[],missing=false;
    function take(kind){
      if(ai>=args.length){missing=true;return null;}
      var raw=args[ai++];
      if(kind==='str')return {str:raw,raw:raw};
      var t=raw.trim(),v=null;
      if(kind==='char'&&raw.length===1&&!/^\d$/.test(raw))return {int:BigInt(raw.charCodeAt(0)),raw:raw};
      if(/^[+-]?\d+$/.test(t))v=BigInt(t);else if(/^[+-]?0[xX][0-9a-fA-F]+$/.test(t))v=t[0]==='-'?-BigInt(t.slice(1)):BigInt(t.replace(/^\+/,''));
      if(v===null)return {bad:raw};
      return {int:v,raw:raw};}
    parts.forEach(function(p){
      if(p.kind==='lit'){out+=p.text;items.push({kind:'lit',text:p.text,out:p.text});return;}
      var it={kind:'spec',sp:p,text:p.text,consumed:[],undef:[],notes:p.notes.slice()};items.push(it);
      if(p.invalid){it.error=p.invalid;it.out='';return;}
      var width=p.width,prec=p.prec;
      var left=rawFlag(p,'-');
      if(p.conv==='%'){ if(p.text!=='%%')it.notes.push('only %% is defined; flags, width or precision make this undefined');
        it.out='%';out+='%';return;}
      var known='diuoxXcs';
      if(FLOATS.indexOf(p.conv)>=0||p.conv==='p'||p.conv==='n'){
        it.unsupported=true;it.out='';
        if(p.widthStar){take('int');}if(p.precStar){take('int');}take('int');
        it.notes.push('%'+p.conv+' is not computed here (only integers, characters and strings are)');return;}
      if(known.indexOf(p.conv)<0){it.error='%'+p.conv+' is not a conversion; the behaviour is undefined';it.out='';return;}
      if(p.widthStar){var wa=take('int');if(!wa||wa.bad!==undefined){it.error=wa?'Argument "'+wa.bad+'" is not an integer (needed for *)':'No argument left for *';it.out='';return;}
        it.consumed.push({role:'width (*)',raw:wa.raw});var w=Number(BigInt.asIntN(32,wa.int));if(w<0){left=true;w=-w;it.notes.push('negative * width means the - flag and width '+w);}width=w;}
      if(p.precStar){var pa=take('int');if(!pa||pa.bad!==undefined){it.error=pa?'Argument "'+pa.bad+'" is not an integer (needed for *)':'No argument left for *';it.out='';return;}
        it.consumed.push({role:'precision (*)',raw:pa.raw});var pr=Number(BigInt.asIntN(32,pa.int));if(pr<0){prec=null;it.notes.push('negative * precision is ignored');}else prec=pr;}
      var kind=p.conv==='s'?'str':p.conv==='c'?'char':'int';
      var a=take(kind);
      if(!a){it.error='No argument left for this conversion (undefined behaviour in C)';it.out='';return;}
      if(a.bad!==undefined){it.error='Argument "'+a.bad+'" is not an integer';it.out='';return;}
      it.consumed.push({role:'value',raw:a.raw});
      var spx={flags:p.flags,len:p.len,conv:p.conv};
      if(left&&p.flags.indexOf('-')<0)spx.flags+='-';
      var r=fmtOne(spx,width,prec,a);
      it.out=r.s;it.undef=r.undef;it.width=width;it.prec=prec;out+=r.s;
      if(p.flags.indexOf('0')>=0&&(left||prec!==null)&&'diuoxX'.indexOf(p.conv)>=0)it.notes.push('the 0 flag is ignored because '+(left?'the - flag is set':'a precision is given'));
      if(p.flags.indexOf(' ')>=0&&p.flags.indexOf('+')>=0)it.notes.push('the space flag is ignored because + is set');
    });
    return {items:items,output:out,extra:ai<args.length?args.length-ai:0,missing:missing,anyUndef:items.some(function(i){return i.undef&&i.undef.length})};}
  var api={parse:parse,run:run};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrintfWhy=api;
})(typeof window!=='undefined'?window:globalThis);
