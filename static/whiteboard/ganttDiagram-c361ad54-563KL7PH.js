import{a as Kt,b as $t,f as te,h as _t,i as Dt,j as St,k as Ct,l as Et,m as ee,n as ne,o as ie,p as se,q as re,r as ae,s as oe,t as Mt,u as At,x as ce,y as le}from"./chunk-FBD55CUV.js";import{Ca as de,Fa as fe,Ha as he,Ia as me,Ja as ke,Ka as ye,La as ge,Ma as pe,Na as be,Pa as it,b as He,c as ut,ga as dt,j as je,oa as ue}from"./chunk-OBE5MFDN.js";import{a as Be}from"./chunk-LYCWWW53.js";import{b as wt,d as rt}from"./chunk-FSRPMVAS.js";var Te=wt((Lt,It)=>{(function(t,e){typeof Lt=="object"&&typeof It<"u"?It.exports=e():typeof define=="function"&&define.amd?define(e):(t=typeof globalThis<"u"?globalThis:t||self).dayjs_plugin_isoWeek=e()})(Lt,(function(){"use strict";var t="day";return function(e,r,a){var s=function(_){return _.add(4-_.isoWeekday(),t)},d=r.prototype;d.isoWeekYear=function(){return s(this).year()},d.isoWeek=function(_){if(!this.$utils().u(_))return this.add(7*(_-this.isoWeek()),t);var T,S,D,F,C=s(this),x=(T=this.isoWeekYear(),S=this.$u,D=(S?a.utc:a)().year(T).startOf("year"),F=4-D.isoWeekday(),D.isoWeekday()>4&&(F+=7),D.add(F,t));return C.diff(x,"week")+1},d.isoWeekday=function(_){return this.$utils().u(_)?this.day()||7:this.day(this.day()%7?_:_-7)};var f=d.startOf;d.startOf=function(_,T){var S=this.$utils(),D=!!S.u(T)||T;return S.p(_)==="isoweek"?D?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):f.bind(this)(_,T)}}}))});var ve=wt((Yt,Ft)=>{(function(t,e){typeof Yt=="object"&&typeof Ft<"u"?Ft.exports=e():typeof define=="function"&&define.amd?define(e):(t=typeof globalThis<"u"?globalThis:t||self).dayjs_plugin_customParseFormat=e()})(Yt,(function(){"use strict";var t={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},e=/(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,r=/\d/,a=/\d\d/,s=/\d\d?/,d=/\d*[^-_:/,()\s\d]+/,f={},_=function(g){return(g=+g)+(g>68?1900:2e3)},T=function(g){return function(m){this[g]=+m}},S=[/[+-]\d\d:?(\d\d)?|Z/,function(g){(this.zone||(this.zone={})).offset=(function(m){if(!m||m==="Z")return 0;var A=m.match(/([+-]|\d\d)/g),L=60*A[1]+(+A[2]||0);return L===0?0:A[0]==="+"?-L:L})(g)}],D=function(g){var m=f[g];return m&&(m.indexOf?m:m.s.concat(m.f))},F=function(g,m){var A,L=f.meridiem;if(L){for(var P=1;P<=24;P+=1)if(g.indexOf(L(P,0,m))>-1){A=P>12;break}}else A=g===(m?"pm":"PM");return A},C={A:[d,function(g){this.afternoon=F(g,!1)}],a:[d,function(g){this.afternoon=F(g,!0)}],Q:[r,function(g){this.month=3*(g-1)+1}],S:[r,function(g){this.milliseconds=100*+g}],SS:[a,function(g){this.milliseconds=10*+g}],SSS:[/\d{3}/,function(g){this.milliseconds=+g}],s:[s,T("seconds")],ss:[s,T("seconds")],m:[s,T("minutes")],mm:[s,T("minutes")],H:[s,T("hours")],h:[s,T("hours")],HH:[s,T("hours")],hh:[s,T("hours")],D:[s,T("day")],DD:[a,T("day")],Do:[d,function(g){var m=f.ordinal,A=g.match(/\d+/);if(this.day=A[0],m)for(var L=1;L<=31;L+=1)m(L).replace(/\[|\]/g,"")===g&&(this.day=L)}],w:[s,T("week")],ww:[a,T("week")],M:[s,T("month")],MM:[a,T("month")],MMM:[d,function(g){var m=D("months"),A=(D("monthsShort")||m.map((function(L){return L.slice(0,3)}))).indexOf(g)+1;if(A<1)throw new Error;this.month=A%12||A}],MMMM:[d,function(g){var m=D("months").indexOf(g)+1;if(m<1)throw new Error;this.month=m%12||m}],Y:[/[+-]?\d+/,T("year")],YY:[a,function(g){this.year=_(g)}],YYYY:[/\d{4}/,T("year")],Z:S,ZZ:S};function x(g){var m,A;m=g,A=f&&f.formats;for(var L=(g=m.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,(function(y,w,p){var k=p&&p.toUpperCase();return w||A[p]||t[p]||A[k].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,(function(i,l,h){return l||h.slice(1)}))}))).match(e),P=L.length,R=0;R<P;R+=1){var G=L[R],B=C[G],z=B&&B[0],V=B&&B[1];L[R]=V?{regex:z,parser:V}:G.replace(/^\[|\]$/g,"")}return function(y){for(var w={},p=0,k=0;p<P;p+=1){var i=L[p];if(typeof i=="string")k+=i.length;else{var l=i.regex,h=i.parser,o=y.slice(k),b=l.exec(o)[0];h.call(w,b),y=y.replace(b,"")}}return(function(n){var O=n.afternoon;if(O!==void 0){var c=n.hours;O?c<12&&(n.hours+=12):c===12&&(n.hours=0),delete n.afternoon}})(w),w}}return function(g,m,A){A.p.customParseFormat=!0,g&&g.parseTwoDigitYear&&(_=g.parseTwoDigitYear);var L=m.prototype,P=L.parse;L.parse=function(R){var G=R.date,B=R.utc,z=R.args;this.$u=B;var V=z[1];if(typeof V=="string"){var y=z[2]===!0,w=z[3]===!0,p=y||w,k=z[2];w&&(k=z[2]),f=this.$locale(),!y&&k&&(f=A.Ls[k]),this.$d=(function(o,b,n,O){try{if(["x","X"].indexOf(b)>-1)return new Date((b==="X"?1e3:1)*o);var c=x(b)(o),u=c.year,v=c.month,W=c.day,M=c.hours,I=c.minutes,E=c.seconds,Y=c.milliseconds,$=c.zone,tt=c.week,ct=new Date,lt=W||(u||v?1:ct.getDate()),H=u||ct.getFullYear(),U=0;u&&!v||(U=v>0?v-1:ct.getMonth());var j,nt=M||0,Z=I||0,et=E||0,q=Y||0;return $?new Date(Date.UTC(H,U,lt,nt,Z,et,q+60*$.offset*1e3)):n?new Date(Date.UTC(H,U,lt,nt,Z,et,q)):(j=new Date(H,U,lt,nt,Z,et,q),tt&&(j=O(j).week(tt).toDate()),j)}catch{return new Date("")}})(G,V,B,A),this.init(),k&&k!==!0&&(this.$L=this.locale(k).$L),p&&G!=this.format(V)&&(this.$d=new Date("")),f={}}else if(V instanceof Array)for(var i=V.length,l=1;l<=i;l+=1){z[1]=V[l-1];var h=A.apply(this,z);if(h.isValid()){this.$d=h.$d,this.$L=h.$L,this.init();break}l===i&&(this.$d=new Date(""))}else P.call(this,R)}}}))});var xe=wt((Wt,Vt)=>{(function(t,e){typeof Wt=="object"&&typeof Vt<"u"?Vt.exports=e():typeof define=="function"&&define.amd?define(e):(t=typeof globalThis<"u"?globalThis:t||self).dayjs_plugin_advancedFormat=e()})(Wt,(function(){"use strict";return function(t,e){var r=e.prototype,a=r.format;r.format=function(s){var d=this,f=this.$locale();if(!this.isValid())return a.bind(this)(s);var _=this.$utils(),T=(s||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,(function(S){switch(S){case"Q":return Math.ceil((d.$M+1)/3);case"Do":return f.ordinal(d.$D);case"gggg":return d.weekYear();case"GGGG":return d.isoWeekYear();case"wo":return f.ordinal(d.week(),"W");case"w":case"ww":return _.s(d.week(),S==="w"?1:2,"0");case"W":case"WW":return _.s(d.isoWeek(),S==="W"?1:2,"0");case"k":case"kk":return _.s(String(d.$H===0?24:d.$H),S==="k"?1:2,"0");case"X":return Math.floor(d.$d.getTime()/1e3);case"x":return d.$d.getTime();case"z":return"["+d.offsetName()+"]";case"zzz":return"["+d.offsetName("long")+"]";default:return S}}));return a.bind(this)(T)}}}))});var Me=rt(Be(),1),X=rt(He(),1),Ae=rt(Te(),1),Le=rt(ve(),1),Ie=rt(xe(),1);function Xe(t){return t}var gt=1,Ot=2,zt=3,yt=4,we=1e-6;function Ge(t){return"translate("+t+",0)"}function qe(t){return"translate(0,"+t+")"}function Ue(t){return e=>+t(e)}function Ze(t,e){return e=Math.max(0,t.bandwidth()-e*2)/2,t.round()&&(e=Math.round(e)),r=>+t(r)+e}function Qe(){return!this.__axis}function _e(t,e){var r=[],a=null,s=null,d=6,f=6,_=3,T=typeof window<"u"&&window.devicePixelRatio>1?0:.5,S=t===gt||t===yt?-1:1,D=t===yt||t===Ot?"x":"y",F=t===gt||t===zt?Ge:qe;function C(x){var g=a??(e.ticks?e.ticks.apply(e,r):e.domain()),m=s??(e.tickFormat?e.tickFormat.apply(e,r):Xe),A=Math.max(d,0)+_,L=e.range(),P=+L[0]+T,R=+L[L.length-1]+T,G=(e.bandwidth?Ze:Ue)(e.copy(),T),B=x.selection?x.selection():x,z=B.selectAll(".domain").data([null]),V=B.selectAll(".tick").data(g,e).order(),y=V.exit(),w=V.enter().append("g").attr("class","tick"),p=V.select("line"),k=V.select("text");z=z.merge(z.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),V=V.merge(w),p=p.merge(w.append("line").attr("stroke","currentColor").attr(D+"2",S*d)),k=k.merge(w.append("text").attr("fill","currentColor").attr(D,S*A).attr("dy",t===gt?"0em":t===zt?"0.71em":"0.32em")),x!==B&&(z=z.transition(x),V=V.transition(x),p=p.transition(x),k=k.transition(x),y=y.transition(x).attr("opacity",we).attr("transform",function(i){return isFinite(i=G(i))?F(i+T):this.getAttribute("transform")}),w.attr("opacity",we).attr("transform",function(i){var l=this.parentNode.__axis;return F((l&&isFinite(l=l(i))?l:G(i))+T)})),y.remove(),z.attr("d",t===yt||t===Ot?f?"M"+S*f+","+P+"H"+T+"V"+R+"H"+S*f:"M"+T+","+P+"V"+R:f?"M"+P+","+S*f+"V"+T+"H"+R+"V"+S*f:"M"+P+","+T+"H"+R),V.attr("opacity",1).attr("transform",function(i){return F(G(i)+T)}),p.attr(D+"2",S*d),k.attr(D,S*A).text(m),B.filter(Qe).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",t===Ot?"start":t===yt?"end":"middle"),B.each(function(){this.__axis=G})}return C.scale=function(x){return arguments.length?(e=x,C):e},C.ticks=function(){return r=Array.from(arguments),C},C.tickArguments=function(x){return arguments.length?(r=x==null?[]:Array.from(x),C):r.slice()},C.tickValues=function(x){return arguments.length?(a=x==null?null:Array.from(x),C):a&&a.slice()},C.tickFormat=function(x){return arguments.length?(s=x,C):s},C.tickSize=function(x){return arguments.length?(d=f=+x,C):d},C.tickSizeInner=function(x){return arguments.length?(d=+x,C):d},C.tickSizeOuter=function(x){return arguments.length?(f=+x,C):f},C.tickPadding=function(x){return arguments.length?(_=+x,C):_},C.offset=function(x){return arguments.length?(T=+x,C):T},C}function De(t){return _e(gt,t)}function Se(t){return _e(zt,t)}var jn=rt(je(),1);var Pt=(function(){var t=function(k,i,l,h){for(l=l||{},h=k.length;h--;l[k[h]]=i);return l},e=[6,8,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,32,33,35,37],r=[1,25],a=[1,26],s=[1,27],d=[1,28],f=[1,29],_=[1,30],T=[1,31],S=[1,9],D=[1,10],F=[1,11],C=[1,12],x=[1,13],g=[1,14],m=[1,15],A=[1,16],L=[1,18],P=[1,19],R=[1,20],G=[1,21],B=[1,22],z=[1,24],V=[1,32],y={trace:function(){},yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,dateFormat:19,inclusiveEndDates:20,topAxis:21,axisFormat:22,tickInterval:23,excludes:24,includes:25,todayMarker:26,title:27,acc_title:28,acc_title_value:29,acc_descr:30,acc_descr_value:31,acc_descr_multiline_value:32,section:33,clickStatement:34,taskTxt:35,taskData:36,click:37,callbackname:38,callbackargs:39,href:40,clickStatementDebug:41,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",19:"dateFormat",20:"inclusiveEndDates",21:"topAxis",22:"axisFormat",23:"tickInterval",24:"excludes",25:"includes",26:"todayMarker",27:"title",28:"acc_title",29:"acc_title_value",30:"acc_descr",31:"acc_descr_value",32:"acc_descr_multiline_value",33:"section",35:"taskTxt",36:"taskData",37:"click",38:"callbackname",39:"callbackargs",40:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[34,2],[34,3],[34,3],[34,4],[34,3],[34,4],[34,2],[41,2],[41,3],[41,3],[41,4],[41,3],[41,4],[41,2]],performAction:function(i,l,h,o,b,n,O){var c=n.length-1;switch(b){case 1:return n[c-1];case 2:this.$=[];break;case 3:n[c-1].push(n[c]),this.$=n[c-1];break;case 4:case 5:this.$=n[c];break;case 6:case 7:this.$=[];break;case 8:o.setWeekday("monday");break;case 9:o.setWeekday("tuesday");break;case 10:o.setWeekday("wednesday");break;case 11:o.setWeekday("thursday");break;case 12:o.setWeekday("friday");break;case 13:o.setWeekday("saturday");break;case 14:o.setWeekday("sunday");break;case 15:o.setDateFormat(n[c].substr(11)),this.$=n[c].substr(11);break;case 16:o.enableInclusiveEndDates(),this.$=n[c].substr(18);break;case 17:o.TopAxis(),this.$=n[c].substr(8);break;case 18:o.setAxisFormat(n[c].substr(11)),this.$=n[c].substr(11);break;case 19:o.setTickInterval(n[c].substr(13)),this.$=n[c].substr(13);break;case 20:o.setExcludes(n[c].substr(9)),this.$=n[c].substr(9);break;case 21:o.setIncludes(n[c].substr(9)),this.$=n[c].substr(9);break;case 22:o.setTodayMarker(n[c].substr(12)),this.$=n[c].substr(12);break;case 24:o.setDiagramTitle(n[c].substr(6)),this.$=n[c].substr(6);break;case 25:this.$=n[c].trim(),o.setAccTitle(this.$);break;case 26:case 27:this.$=n[c].trim(),o.setAccDescription(this.$);break;case 28:o.addSection(n[c].substr(8)),this.$=n[c].substr(8);break;case 30:o.addTask(n[c-1],n[c]),this.$="task";break;case 31:this.$=n[c-1],o.setClickEvent(n[c-1],n[c],null);break;case 32:this.$=n[c-2],o.setClickEvent(n[c-2],n[c-1],n[c]);break;case 33:this.$=n[c-2],o.setClickEvent(n[c-2],n[c-1],null),o.setLink(n[c-2],n[c]);break;case 34:this.$=n[c-3],o.setClickEvent(n[c-3],n[c-2],n[c-1]),o.setLink(n[c-3],n[c]);break;case 35:this.$=n[c-2],o.setClickEvent(n[c-2],n[c],null),o.setLink(n[c-2],n[c-1]);break;case 36:this.$=n[c-3],o.setClickEvent(n[c-3],n[c-1],n[c]),o.setLink(n[c-3],n[c-2]);break;case 37:this.$=n[c-1],o.setLink(n[c-1],n[c]);break;case 38:case 44:this.$=n[c-1]+" "+n[c];break;case 39:case 40:case 42:this.$=n[c-2]+" "+n[c-1]+" "+n[c];break;case 41:case 43:this.$=n[c-3]+" "+n[c-2]+" "+n[c-1]+" "+n[c];break}},table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:r,13:a,14:s,15:d,16:f,17:_,18:T,19:S,20:D,21:F,22:C,23:x,24:g,25:m,26:A,27:L,28:P,30:R,32:G,33:B,34:23,35:z,37:V},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:33,11:17,12:r,13:a,14:s,15:d,16:f,17:_,18:T,19:S,20:D,21:F,22:C,23:x,24:g,25:m,26:A,27:L,28:P,30:R,32:G,33:B,34:23,35:z,37:V},t(e,[2,5]),t(e,[2,6]),t(e,[2,15]),t(e,[2,16]),t(e,[2,17]),t(e,[2,18]),t(e,[2,19]),t(e,[2,20]),t(e,[2,21]),t(e,[2,22]),t(e,[2,23]),t(e,[2,24]),{29:[1,34]},{31:[1,35]},t(e,[2,27]),t(e,[2,28]),t(e,[2,29]),{36:[1,36]},t(e,[2,8]),t(e,[2,9]),t(e,[2,10]),t(e,[2,11]),t(e,[2,12]),t(e,[2,13]),t(e,[2,14]),{38:[1,37],40:[1,38]},t(e,[2,4]),t(e,[2,25]),t(e,[2,26]),t(e,[2,30]),t(e,[2,31],{39:[1,39],40:[1,40]}),t(e,[2,37],{38:[1,41]}),t(e,[2,32],{40:[1,42]}),t(e,[2,33]),t(e,[2,35],{39:[1,43]}),t(e,[2,34]),t(e,[2,36])],defaultActions:{},parseError:function(i,l){if(l.recoverable)this.trace(i);else{var h=new Error(i);throw h.hash=l,h}},parse:function(i){var l=this,h=[0],o=[],b=[null],n=[],O=this.table,c="",u=0,v=0,W=2,M=1,I=n.slice.call(arguments,1),E=Object.create(this.lexer),Y={yy:{}};for(var $ in this.yy)Object.prototype.hasOwnProperty.call(this.yy,$)&&(Y.yy[$]=this.yy[$]);E.setInput(i,Y.yy),Y.yy.lexer=E,Y.yy.parser=this,typeof E.yylloc>"u"&&(E.yylloc={});var tt=E.yylloc;n.push(tt);var ct=E.options&&E.options.ranges;typeof Y.yy.parseError=="function"?this.parseError=Y.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function lt(){var J;return J=o.pop()||E.lex()||M,typeof J!="number"&&(J instanceof Array&&(o=J,J=o.pop()),J=l.symbols_[J]||J),J}for(var H,U,j,nt,Z={},et,q,vt,kt;;){if(U=h[h.length-1],this.defaultActions[U]?j=this.defaultActions[U]:((H===null||typeof H>"u")&&(H=lt()),j=O[U]&&O[U][H]),typeof j>"u"||!j.length||!j[0]){var xt="";kt=[];for(et in O[U])this.terminals_[et]&&et>W&&kt.push("'"+this.terminals_[et]+"'");E.showPosition?xt="Parse error on line "+(u+1)+`:
`+E.showPosition()+`
Expecting `+kt.join(", ")+", got '"+(this.terminals_[H]||H)+"'":xt="Parse error on line "+(u+1)+": Unexpected "+(H==M?"end of input":"'"+(this.terminals_[H]||H)+"'"),this.parseError(xt,{text:E.match,token:this.terminals_[H]||H,line:E.yylineno,loc:tt,expected:kt})}if(j[0]instanceof Array&&j.length>1)throw new Error("Parse Error: multiple actions possible at state: "+U+", token: "+H);switch(j[0]){case 1:h.push(H),b.push(E.yytext),n.push(E.yylloc),h.push(j[1]),H=null,v=E.yyleng,c=E.yytext,u=E.yylineno,tt=E.yylloc;break;case 2:if(q=this.productions_[j[1]][1],Z.$=b[b.length-q],Z._$={first_line:n[n.length-(q||1)].first_line,last_line:n[n.length-1].last_line,first_column:n[n.length-(q||1)].first_column,last_column:n[n.length-1].last_column},ct&&(Z._$.range=[n[n.length-(q||1)].range[0],n[n.length-1].range[1]]),nt=this.performAction.apply(Z,[c,v,u,Y.yy,j[1],b,n].concat(I)),typeof nt<"u")return nt;q&&(h=h.slice(0,-1*q*2),b=b.slice(0,-1*q),n=n.slice(0,-1*q)),h.push(this.productions_[j[1]][0]),b.push(Z.$),n.push(Z._$),vt=O[h[h.length-2]][h[h.length-1]],h.push(vt);break;case 3:return!0}}return!0}},w=(function(){var k={EOF:1,parseError:function(l,h){if(this.yy.parser)this.yy.parser.parseError(l,h);else throw new Error(l)},setInput:function(i,l){return this.yy=l||this.yy||{},this._input=i,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var i=this._input[0];this.yytext+=i,this.yyleng++,this.offset++,this.match+=i,this.matched+=i;var l=i.match(/(?:\r\n?|\n).*/g);return l?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),i},unput:function(i){var l=i.length,h=i.split(/(?:\r\n?|\n)/g);this._input=i+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-l),this.offset-=l;var o=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),h.length-1&&(this.yylineno-=h.length-1);var b=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:h?(h.length===o.length?this.yylloc.first_column:0)+o[o.length-h.length].length-h[0].length:this.yylloc.first_column-l},this.options.ranges&&(this.yylloc.range=[b[0],b[0]+this.yyleng-l]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},less:function(i){this.unput(this.match.slice(i))},pastInput:function(){var i=this.matched.substr(0,this.matched.length-this.match.length);return(i.length>20?"...":"")+i.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var i=this.match;return i.length<20&&(i+=this._input.substr(0,20-i.length)),(i.substr(0,20)+(i.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var i=this.pastInput(),l=new Array(i.length+1).join("-");return i+this.upcomingInput()+`
`+l+"^"},test_match:function(i,l){var h,o,b;if(this.options.backtrack_lexer&&(b={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(b.yylloc.range=this.yylloc.range.slice(0))),o=i[0].match(/(?:\r\n?|\n).*/g),o&&(this.yylineno+=o.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:o?o[o.length-1].length-o[o.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+i[0].length},this.yytext+=i[0],this.match+=i[0],this.matches=i,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(i[0].length),this.matched+=i[0],h=this.performAction.call(this,this.yy,this,l,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),h)return h;if(this._backtrack){for(var n in b)this[n]=b[n];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var i,l,h,o;this._more||(this.yytext="",this.match="");for(var b=this._currentRules(),n=0;n<b.length;n++)if(h=this._input.match(this.rules[b[n]]),h&&(!l||h[0].length>l[0].length)){if(l=h,o=n,this.options.backtrack_lexer){if(i=this.test_match(h,b[n]),i!==!1)return i;if(this._backtrack){l=!1;continue}else return!1}else if(!this.options.flex)break}return l?(i=this.test_match(l,b[o]),i!==!1?i:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var l=this.next();return l||this.lex()},begin:function(l){this.conditionStack.push(l)},popState:function(){var l=this.conditionStack.length-1;return l>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(l){return l=this.conditionStack.length-1-Math.abs(l||0),l>=0?this.conditionStack[l]:"INITIAL"},pushState:function(l){this.begin(l)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(l,h,o,b){switch(o){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),28;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),30;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 40;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 38;case 21:this.popState();break;case 22:return 39;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 37;case 26:return 4;case 27:return 19;case 28:return 20;case 29:return 21;case 30:return 22;case 31:return 23;case 32:return 25;case 33:return 24;case 34:return 26;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return"date";case 43:return 27;case 44:return"accDescription";case 45:return 33;case 46:return 35;case 47:return 36;case 48:return":";case 49:return 6;case 50:return"INVALID"}},rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50],inclusive:!0}}};return k})();y.lexer=w;function p(){this.yy={}}return p.prototype=y,y.Parser=p,new p})();Pt.parser=Pt;var Je=Pt;X.default.extend(Ae.default);X.default.extend(Le.default);X.default.extend(Ie.default);var Q="",Ht="",jt,Xt="",ft=[],ht=[],Gt={},qt=[],Tt=[],ot="",Ut="",Ye=["active","done","crit","milestone"],Zt=[],mt=!1,Qt=!1,Jt="sunday",Rt=0,Ke=function(){qt=[],Tt=[],ot="",Zt=[],pt=0,Bt=void 0,bt=void 0,N=[],Q="",Ht="",Ut="",jt=void 0,Xt="",ft=[],ht=[],mt=!1,Qt=!1,Rt=0,Gt={},he(),Jt="sunday"},$e=function(t){Ht=t},tn=function(){return Ht},en=function(t){jt=t},nn=function(){return jt},sn=function(t){Xt=t},rn=function(){return Xt},an=function(t){Q=t},on=function(){mt=!0},cn=function(){return mt},ln=function(){Qt=!0},un=function(){return Qt},dn=function(t){Ut=t},fn=function(){return Ut},hn=function(){return Q},mn=function(t){ft=t.toLowerCase().split(/[\s,]+/)},kn=function(){return ft},yn=function(t){ht=t.toLowerCase().split(/[\s,]+/)},gn=function(){return ht},pn=function(){return Gt},bn=function(t){ot=t,qt.push(t)},Tn=function(){return qt},vn=function(){let t=Ce(),e=10,r=0;for(;!t&&r<e;)t=Ce(),r++;return Tt=N,Tt},Fe=function(t,e,r,a){return a.includes(t.format(e.trim()))?!1:t.isoWeekday()>=6&&r.includes("weekends")||r.includes(t.format("dddd").toLowerCase())?!0:r.includes(t.format(e.trim()))},xn=function(t){Jt=t},wn=function(){return Jt},We=function(t,e,r,a){if(!r.length||t.manualEndTime)return;let s;t.startTime instanceof Date?s=(0,X.default)(t.startTime):s=(0,X.default)(t.startTime,e,!0),s=s.add(1,"d");let d;t.endTime instanceof Date?d=(0,X.default)(t.endTime):d=(0,X.default)(t.endTime,e,!0);let[f,_]=_n(s,d,e,r,a);t.endTime=f.toDate(),t.renderEndTime=_},_n=function(t,e,r,a,s){let d=!1,f=null;for(;t<=e;)d||(f=e.toDate()),d=Fe(t,r,a,s),d&&(e=e.add(1,"d")),t=t.add(1,"d");return[e,f]},Nt=function(t,e,r){r=r.trim();let s=/^after\s+(?<ids>[\d\w- ]+)/.exec(r);if(s!==null){let f=null;for(let T of s.groups.ids.split(" ")){let S=st(T);S!==void 0&&(!f||S.endTime>f.endTime)&&(f=S)}if(f)return f.endTime;let _=new Date;return _.setHours(0,0,0,0),_}let d=(0,X.default)(r,e.trim(),!0);if(d.isValid())return d.toDate();{dt.debug("Invalid date:"+r),dt.debug("With date format:"+e.trim());let f=new Date(r);if(f===void 0||isNaN(f.getTime())||f.getFullYear()<-1e4||f.getFullYear()>1e4)throw new Error("Invalid date:"+r);return f}},Ve=function(t){let e=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return e!==null?[Number.parseFloat(e[1]),e[2]]:[NaN,"ms"]},Oe=function(t,e,r,a=!1){r=r.trim();let d=/^until\s+(?<ids>[\d\w- ]+)/.exec(r);if(d!==null){let D=null;for(let C of d.groups.ids.split(" ")){let x=st(C);x!==void 0&&(!D||x.startTime<D.startTime)&&(D=x)}if(D)return D.startTime;let F=new Date;return F.setHours(0,0,0,0),F}let f=(0,X.default)(r,e.trim(),!0);if(f.isValid())return a&&(f=f.add(1,"d")),f.toDate();let _=(0,X.default)(t),[T,S]=Ve(r);if(!Number.isNaN(T)){let D=_.add(T,S);D.isValid()&&(_=D)}return _.toDate()},pt=0,at=function(t){return t===void 0?(pt=pt+1,"task"+pt):t},Dn=function(t,e){let r;e.substr(0,1)===":"?r=e.substr(1,e.length):r=e;let a=r.split(","),s={};Ne(a,s,Ye);for(let f=0;f<a.length;f++)a[f]=a[f].trim();let d="";switch(a.length){case 1:s.id=at(),s.startTime=t.endTime,d=a[0];break;case 2:s.id=at(),s.startTime=Nt(void 0,Q,a[0]),d=a[1];break;case 3:s.id=at(a[0]),s.startTime=Nt(void 0,Q,a[1]),d=a[2];break}return d&&(s.endTime=Oe(s.startTime,Q,d,mt),s.manualEndTime=(0,X.default)(d,"YYYY-MM-DD",!0).isValid(),We(s,Q,ht,ft)),s},Sn=function(t,e){let r;e.substr(0,1)===":"?r=e.substr(1,e.length):r=e;let a=r.split(","),s={};Ne(a,s,Ye);for(let d=0;d<a.length;d++)a[d]=a[d].trim();switch(a.length){case 1:s.id=at(),s.startTime={type:"prevTaskEnd",id:t},s.endTime={data:a[0]};break;case 2:s.id=at(),s.startTime={type:"getStartDate",startData:a[0]},s.endTime={data:a[1]};break;case 3:s.id=at(a[0]),s.startTime={type:"getStartDate",startData:a[1]},s.endTime={data:a[2]};break}return s},Bt,bt,N=[],ze={},Cn=function(t,e){let r={section:ot,type:ot,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:e},task:t,classes:[]},a=Sn(bt,e);r.raw.startTime=a.startTime,r.raw.endTime=a.endTime,r.id=a.id,r.prevTaskId=bt,r.active=a.active,r.done=a.done,r.crit=a.crit,r.milestone=a.milestone,r.order=Rt,Rt++;let s=N.push(r);bt=r.id,ze[r.id]=s-1},st=function(t){let e=ze[t];return N[e]},En=function(t,e){let r={section:ot,type:ot,description:t,task:t,classes:[]},a=Dn(Bt,e);r.startTime=a.startTime,r.endTime=a.endTime,r.id=a.id,r.active=a.active,r.done=a.done,r.crit=a.crit,r.milestone=a.milestone,Bt=r,Tt.push(r)},Ce=function(){let t=function(r){let a=N[r],s="";switch(N[r].raw.startTime.type){case"prevTaskEnd":{let d=st(a.prevTaskId);a.startTime=d.endTime;break}case"getStartDate":s=Nt(void 0,Q,N[r].raw.startTime.startData),s&&(N[r].startTime=s);break}return N[r].startTime&&(N[r].endTime=Oe(N[r].startTime,Q,N[r].raw.endTime.data,mt),N[r].endTime&&(N[r].processed=!0,N[r].manualEndTime=(0,X.default)(N[r].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),We(N[r],Q,ht,ft))),N[r].processed},e=!0;for(let[r,a]of N.entries())t(r),e=e&&a.processed;return e},Mn=function(t,e){let r=e;it().securityLevel!=="loose"&&(r=(0,Me.sanitizeUrl)(e)),t.split(",").forEach(function(a){st(a)!==void 0&&(Re(a,()=>{window.open(r,"_self")}),Gt[a]=r)}),Pe(t,"clickable")},Pe=function(t,e){t.split(",").forEach(function(r){let a=st(r);a!==void 0&&a.classes.push(e)})},An=function(t,e,r){if(it().securityLevel!=="loose"||e===void 0)return;let a=[];if(typeof r=="string"){a=r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let d=0;d<a.length;d++){let f=a[d].trim();f.charAt(0)==='"'&&f.charAt(f.length-1)==='"'&&(f=f.substr(1,f.length-2)),a[d]=f}}a.length===0&&a.push(t),st(t)!==void 0&&Re(t,()=>{de.runFunc(e,...a)})},Re=function(t,e){Zt.push(function(){let r=document.querySelector(`[id="${t}"]`);r!==null&&r.addEventListener("click",function(){e()})},function(){let r=document.querySelector(`[id="${t}-text"]`);r!==null&&r.addEventListener("click",function(){e()})})},Ln=function(t,e,r){t.split(",").forEach(function(a){An(a,e,r)}),Pe(t,"clickable")},In=function(t){Zt.forEach(function(e){e(t)})},Yn={getConfig:()=>it().gantt,clear:Ke,setDateFormat:an,getDateFormat:hn,enableInclusiveEndDates:on,endDatesAreInclusive:cn,enableTopAxis:ln,topAxisEnabled:un,setAxisFormat:$e,getAxisFormat:tn,setTickInterval:en,getTickInterval:nn,setTodayMarker:sn,getTodayMarker:rn,setAccTitle:me,getAccTitle:ke,setDiagramTitle:pe,getDiagramTitle:be,setDisplayMode:dn,getDisplayMode:fn,setAccDescription:ye,getAccDescription:ge,addSection:bn,getSections:Tn,getTasks:vn,addTask:Cn,findTaskById:st,addTaskOrg:En,setIncludes:mn,getIncludes:kn,setExcludes:yn,getExcludes:gn,setClickEvent:Ln,setLink:Mn,getLinks:pn,bindFunctions:In,parseDuration:Ve,isInvalidDate:Fe,setWeekday:xn,getWeekday:wn};function Ne(t,e,r){let a=!0;for(;a;)a=!1,r.forEach(function(s){let d="^\\s*"+s+"\\s*$",f=new RegExp(d);t[0].match(f)&&(e[s]=!0,t.shift(1),a=!0)})}var Fn=function(){dt.debug("Something is calling, setConf, remove the call")},Ee={monday:ne,tuesday:ie,wednesday:se,thursday:re,friday:ae,saturday:oe,sunday:ee},Wn=(t,e)=>{let r=[...t].map(()=>-1/0),a=[...t].sort((d,f)=>d.startTime-f.startTime||d.order-f.order),s=0;for(let d of a)for(let f=0;f<r.length;f++)if(d.startTime>=r[f]){r[f]=d.endTime,d.order=f+e,f>s&&(s=f);break}return s},K,Vn=function(t,e,r,a){let s=it().gantt,d=it().securityLevel,f;d==="sandbox"&&(f=ut("#i"+e));let _=d==="sandbox"?ut(f.nodes()[0].contentDocument.body):ut("body"),T=d==="sandbox"?f.nodes()[0].contentDocument:document,S=T.getElementById(e);K=S.parentElement.offsetWidth,K===void 0&&(K=1200),s.useWidth!==void 0&&(K=s.useWidth);let D=a.db.getTasks(),F=[];for(let y of D)F.push(y.type);F=V(F);let C={},x=2*s.topPadding;if(a.db.getDisplayMode()==="compact"||s.displayMode==="compact"){let y={};for(let p of D)y[p.section]===void 0?y[p.section]=[p]:y[p.section].push(p);let w=0;for(let p of Object.keys(y)){let k=Wn(y[p],w)+1;w+=k,x+=k*(s.barHeight+s.barGap),C[p]=k}}else{x+=D.length*(s.barHeight+s.barGap);for(let y of F)C[y]=D.filter(w=>w.type===y).length}S.setAttribute("viewBox","0 0 "+K+" "+x);let g=_.select(`[id="${e}"]`),m=le().domain([$t(D,function(y){return y.startTime}),Kt(D,function(y){return y.endTime})]).rangeRound([0,K-s.leftPadding-s.rightPadding]);function A(y,w){let p=y.startTime,k=w.startTime,i=0;return p>k?i=1:p<k&&(i=-1),i}D.sort(A),L(D,K,x),fe(g,x,K,s.useMaxWidth),g.append("text").text(a.db.getDiagramTitle()).attr("x",K/2).attr("y",s.titleTopMargin).attr("class","titleText");function L(y,w,p){let k=s.barHeight,i=k+s.barGap,l=s.topPadding,h=s.leftPadding,o=ce().domain([0,F.length]).range(["#00B9FA","#F95002"]).interpolate(te);R(i,l,h,w,p,y,a.db.getExcludes(),a.db.getIncludes()),G(h,l,w,p),P(y,i,l,h,k,o,w),B(i,l),z(h,l,w,p)}function P(y,w,p,k,i,l,h){let b=[...new Set(y.map(u=>u.order))].map(u=>y.find(v=>v.order===u));g.append("g").selectAll("rect").data(b).enter().append("rect").attr("x",0).attr("y",function(u,v){return v=u.order,v*w+p-2}).attr("width",function(){return h-s.rightPadding/2}).attr("height",w).attr("class",function(u){for(let[v,W]of F.entries())if(u.type===W)return"section section"+v%s.numberSectionStyles;return"section section0"});let n=g.append("g").selectAll("rect").data(y).enter(),O=a.db.getLinks();if(n.append("rect").attr("id",function(u){return u.id}).attr("rx",3).attr("ry",3).attr("x",function(u){return u.milestone?m(u.startTime)+k+.5*(m(u.endTime)-m(u.startTime))-.5*i:m(u.startTime)+k}).attr("y",function(u,v){return v=u.order,v*w+p}).attr("width",function(u){return u.milestone?i:m(u.renderEndTime||u.endTime)-m(u.startTime)}).attr("height",i).attr("transform-origin",function(u,v){return v=u.order,(m(u.startTime)+k+.5*(m(u.endTime)-m(u.startTime))).toString()+"px "+(v*w+p+.5*i).toString()+"px"}).attr("class",function(u){let v="task",W="";u.classes.length>0&&(W=u.classes.join(" "));let M=0;for(let[E,Y]of F.entries())u.type===Y&&(M=E%s.numberSectionStyles);let I="";return u.active?u.crit?I+=" activeCrit":I=" active":u.done?u.crit?I=" doneCrit":I=" done":u.crit&&(I+=" crit"),I.length===0&&(I=" task"),u.milestone&&(I=" milestone "+I),I+=M,I+=" "+W,v+I}),n.append("text").attr("id",function(u){return u.id+"-text"}).text(function(u){return u.task}).attr("font-size",s.fontSize).attr("x",function(u){let v=m(u.startTime),W=m(u.renderEndTime||u.endTime);u.milestone&&(v+=.5*(m(u.endTime)-m(u.startTime))-.5*i),u.milestone&&(W=v+i);let M=this.getBBox().width;return M>W-v?W+M+1.5*s.leftPadding>h?v+k-5:W+k+5:(W-v)/2+v+k}).attr("y",function(u,v){return v=u.order,v*w+s.barHeight/2+(s.fontSize/2-2)+p}).attr("text-height",i).attr("class",function(u){let v=m(u.startTime),W=m(u.endTime);u.milestone&&(W=v+i);let M=this.getBBox().width,I="";u.classes.length>0&&(I=u.classes.join(" "));let E=0;for(let[$,tt]of F.entries())u.type===tt&&(E=$%s.numberSectionStyles);let Y="";return u.active&&(u.crit?Y="activeCritText"+E:Y="activeText"+E),u.done?u.crit?Y=Y+" doneCritText"+E:Y=Y+" doneText"+E:u.crit&&(Y=Y+" critText"+E),u.milestone&&(Y+=" milestoneText"),M>W-v?W+M+1.5*s.leftPadding>h?I+" taskTextOutsideLeft taskTextOutside"+E+" "+Y:I+" taskTextOutsideRight taskTextOutside"+E+" "+Y+" width-"+M:I+" taskText taskText"+E+" "+Y+" width-"+M}),it().securityLevel==="sandbox"){let u;u=ut("#i"+e);let v=u.nodes()[0].contentDocument;n.filter(function(W){return O[W.id]!==void 0}).each(function(W){var M=v.querySelector("#"+W.id),I=v.querySelector("#"+W.id+"-text");let E=M.parentNode;var Y=v.createElement("a");Y.setAttribute("xlink:href",O[W.id]),Y.setAttribute("target","_top"),E.appendChild(Y),Y.appendChild(M),Y.appendChild(I)})}}function R(y,w,p,k,i,l,h,o){if(h.length===0&&o.length===0)return;let b,n;for(let{startTime:M,endTime:I}of l)(b===void 0||M<b)&&(b=M),(n===void 0||I>n)&&(n=I);if(!b||!n)return;if((0,X.default)(n).diff((0,X.default)(b),"year")>5){dt.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}let O=a.db.getDateFormat(),c=[],u=null,v=(0,X.default)(b);for(;v.valueOf()<=n;)a.db.isInvalidDate(v,O,h,o)?u?u.end=v:u={start:v,end:v}:u&&(c.push(u),u=null),v=v.add(1,"d");g.append("g").selectAll("rect").data(c).enter().append("rect").attr("id",function(M){return"exclude-"+M.start.format("YYYY-MM-DD")}).attr("x",function(M){return m(M.start)+p}).attr("y",s.gridLineStartPadding).attr("width",function(M){let I=M.end.add(1,"day");return m(I)-m(M.start)}).attr("height",i-w-s.gridLineStartPadding).attr("transform-origin",function(M,I){return(m(M.start)+p+.5*(m(M.end)-m(M.start))).toString()+"px "+(I*y+.5*i).toString()+"px"}).attr("class","exclude-range")}function G(y,w,p,k){let i=Se(m).tickSize(-k+w+s.gridLineStartPadding).tickFormat(At(a.db.getAxisFormat()||s.axisFormat||"%Y-%m-%d")),h=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(a.db.getTickInterval()||s.tickInterval);if(h!==null){let o=h[1],b=h[2],n=a.db.getWeekday()||s.weekday;switch(b){case"millisecond":i.ticks(_t.every(o));break;case"second":i.ticks(Dt.every(o));break;case"minute":i.ticks(St.every(o));break;case"hour":i.ticks(Ct.every(o));break;case"day":i.ticks(Et.every(o));break;case"week":i.ticks(Ee[n].every(o));break;case"month":i.ticks(Mt.every(o));break}}if(g.append("g").attr("class","grid").attr("transform","translate("+y+", "+(k-50)+")").call(i).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),a.db.topAxisEnabled()||s.topAxis){let o=De(m).tickSize(-k+w+s.gridLineStartPadding).tickFormat(At(a.db.getAxisFormat()||s.axisFormat||"%Y-%m-%d"));if(h!==null){let b=h[1],n=h[2],O=a.db.getWeekday()||s.weekday;switch(n){case"millisecond":o.ticks(_t.every(b));break;case"second":o.ticks(Dt.every(b));break;case"minute":o.ticks(St.every(b));break;case"hour":o.ticks(Ct.every(b));break;case"day":o.ticks(Et.every(b));break;case"week":o.ticks(Ee[O].every(b));break;case"month":o.ticks(Mt.every(b));break}}g.append("g").attr("class","grid").attr("transform","translate("+y+", "+w+")").call(o).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}function B(y,w){let p=0,k=Object.keys(C).map(i=>[i,C[i]]);g.append("g").selectAll("text").data(k).enter().append(function(i){let l=i[0].split(ue.lineBreakRegex),h=-(l.length-1)/2,o=T.createElementNS("http://www.w3.org/2000/svg","text");o.setAttribute("dy",h+"em");for(let[b,n]of l.entries()){let O=T.createElementNS("http://www.w3.org/2000/svg","tspan");O.setAttribute("alignment-baseline","central"),O.setAttribute("x","10"),b>0&&O.setAttribute("dy","1em"),O.textContent=n,o.appendChild(O)}return o}).attr("x",10).attr("y",function(i,l){if(l>0)for(let h=0;h<l;h++)return p+=k[l-1][1],i[1]*y/2+p*y+w;else return i[1]*y/2+w}).attr("font-size",s.sectionFontSize).attr("class",function(i){for(let[l,h]of F.entries())if(i[0]===h)return"sectionTitle sectionTitle"+l%s.numberSectionStyles;return"sectionTitle"})}function z(y,w,p,k){let i=a.db.getTodayMarker();if(i==="off")return;let l=g.append("g").attr("class","today"),h=new Date,o=l.append("line");o.attr("x1",m(h)+y).attr("x2",m(h)+y).attr("y1",s.titleTopMargin).attr("y2",k-s.titleTopMargin).attr("class","today"),i!==""&&o.attr("style",i.replace(/,/g,";"))}function V(y){let w={},p=[];for(let k=0,i=y.length;k<i;++k)Object.prototype.hasOwnProperty.call(w,y[k])||(w[y[k]]=!0,p.push(y[k]));return p}},On={setConf:Fn,draw:Vn},zn=t=>`
  .mermaid-main-font {
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }
`,Pn=zn,Xn={parser:Je,db:Yn,renderer:On,styles:Pn};export{Xn as diagram};
