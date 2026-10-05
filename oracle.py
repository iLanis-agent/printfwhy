# usage: oracle.py <seed> <n> <out.jsonl>. Random integer/char/string printf specs, run through gcc + glibc printf.
import random, sys, json, subprocess, tempfile
seed=int(sys.argv[1]); N=int(sys.argv[2]); random.seed(seed)
LEN={'hh':'signed char','h':'short','':'int','l':'long','ll':'long long','j':'long long','z':'long','t':'long'}
ULEN={'hh':'unsigned char','h':'unsigned short','':'unsigned int','l':'unsigned long','ll':'unsigned long long','j':'unsigned long long','z':'unsigned long','t':'unsigned long'}
VALS=[0,1,-1,5,42,-42,255,256,65535,65536,70000,-70000,2147483647,-2147483648,4294967295,4294967296,123456789012,-123456789012,9223372036854775807,-9223372036854775807,300,-300,127,128,-128,-129,32767,32768]
WORDS=['','a','ab','hello','x y','12345','%d']
cases=[]
for _ in range(N):
    conv=random.choice('diuoxXcs'+'dxuo'*2+'s')
    flags=''.join(random.sample('-+ #0',random.choice([0,0,1,1,2,3])))
    width=random.choice([None,None,0,1,3,5,8,12])
    prec=random.choice([None,None,None,'',0,1,3,6,10])
    wstar=pstar=False
    if width is not None and random.random()<.15: wstar=True
    if prec not in (None,) and random.random()<.15 and prec!='': pstar=True
    ln=random.choice(['','','','hh','h','l','ll','j','z','t']) if conv in 'diuoxX' else ''
    spec='%'+flags+('*' if wstar else ('' if width is None else str(width)))
    if prec is not None: spec+='.'+('*' if pstar else str(prec))
    spec+=ln+conv
    args=[]
    wv=pv=None
    if wstar: wv=random.choice([-7,-1,0,4,9]); args.append(('int',wv))
    if pstar: pv=random.choice([-3,0,2,7]); args.append(('int',pv))
    if conv in 'di': v=random.choice(VALS); args.append((LEN[ln],v))
    elif conv in 'uoxX': v=random.choice(VALS); args.append((ULEN[ln],v))
    elif conv=='c': v=random.choice([65,97,48,32,126,33,0x141 if random.random()<.1 else 100]); args.append(('int',v))
    else: v=random.choice(WORDS); args.append(('str',v))
    cases.append((spec,args))
merged=[];i=0
while i<len(cases):
    k=random.choice([1,1,2,3]); grp=cases[i:i+k]; i+=k
    f=''; a=[]
    for j,(sp,ar) in enumerate(grp):
        f+=random.choice(['','-',' ','x=','[']) + sp; a+=ar
    merged.append((f,a))
cases=merged
def cexpr(t,v):
    if t=='str': return json.dumps(v)
    if t=='int' or t=='signed char' or t=='short' or t=='unsigned char' or t=='unsigned short': return '(%s)%dLL'%(t if t!='int' else 'int',v)
    return '(%s)%s'%(t,('%dLL'%v) if v>=0 or t.startswith(('long','signed','short','int')) else '%dLL'%v)
src='#include <stdio.h>\nint main(void){\n'
for spec,args in cases:
    src+='printf("%s|\\n"%s);\n'%(spec.replace('\\','\\\\').replace('"','\\"'),''.join(','+cexpr(t,v) for t,v in args))
src+='return 0;}\n'
d=tempfile.mkdtemp(); open(d+'/a.c','w').write(src)
cp=subprocess.run(['gcc','-w','-o',d+'/a',d+'/a.c'],capture_output=True,text=True)
if cp.returncode: print(cp.stderr[:500]); sys.exit(1)
res=subprocess.run([d+'/a'],capture_output=True).stdout.decode('latin1').split('|\n')[:-1]
assert len(res)==len(cases),(len(res),len(cases))
with open(sys.argv[3],'w') as f:
    for (spec,args),o in zip(cases,res):
        f.write(json.dumps({'fmt':spec,'args':[str(v) for t,v in args],'out':o})+'\n')
