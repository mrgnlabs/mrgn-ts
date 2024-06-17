<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Advanced Charts Session Parser</title><style>.input-text {
		margin: 10px 0;
	}

	.results {
		margin-top: 10px;
		word-break: break-all;
	}

	table {
		width: 100%;
	}

	tr {
		border-top: none;
		color:#666B85;
		font-size:16px;
		font-weight:normal;
		text-shadow: 0 1px 1px rgba(256, 256, 256, 0.1);
	}

	tr:first-child {
		border-top:none;
	}

	tr:last-child {
		border-bottom:none;
	}

	tr:nth-child(odd) td {
		background:#EBEBEB;
	}

	tr:last-child td:first-child {
		border-bottom-left-radius:3px;
	}

	tr:last-child td:last-child {
		border-bottom-right-radius:3px;
	}

	td {
		background:#FFFFFF;
		padding:20px;
		text-align:left;
		vertical-align:middle;
		font-weight:300;
		font-size:18px;
		border-right: 1px solid #C1C3D1;
	}

	td:last-child {
		border-right: 0px;
	}

	th.text-left {
		text-align: left;
	}

	th.text-center {
		text-align: center;
	}

	th.text-right {
		text-align: right;
	}

	td.text-left {
		text-align: left;
	}

	td.text-center {
		text-align: center;
	}

	td.text-right {
		text-align: right;
	}

	.table-fill {
		background: white;
		border-radius:3px;
		border-collapse: collapse;
		min-height: 320px;
		margin: auto;
		max-width: 600px;
		padding:5px;
		width: 100%;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
		padding: 15px;
	}

	.input-field {
		width: 100%;
		font-size: 20px;
		line-height: 1.5;
		margin-bottom: 10px;
		padding: 0 5px;
	}

	table {
		border-collapse: collapse;
	}</style></head><body><form class="table-fill"><h1>Advanced Charts Session Parser</h1><input id="session" class="input-field" name="session" value="24x7" maxlength="500" autocomplete="off"><div id="result" class="results"></div></form><script defer="defer">(()=>{var t={480:(t,e,n)=>{"use strict";var r=n(917),o=n(53).tzData;let s;function i(t){this._name=t;var e=o[t];if(!e&&s&&(e=s.instance().getTimezoneData(t)),e||(e={time:[],offset:[]},this._invalid=!0),e.time.length!==e.offset.length&&(e={time:[],offset:[]},this._invalid=!0),!e.time_utc){for(var n=e.time,r=e.offset,i=n.length,a=new Array(i),u=0;u<i;u++)n[u]*=1e3,r[u]*=1e3,a[u]=n[u]-r[u];e.time_utc=a}this.tz=e}function a(t,e){var n=t.length;if(0===n)return-1;if(isNaN(e))throw Error("Key is NaN");for(var r=0,o=n-1,s=u((r+o)/2);;){if(t[s]>e){if((o=s-1)<r)return s}else if(o<(r=s+1))return s<n-1?s+1:-1;s=u((r+o)/2)}}i.prototype.offset_utc=function(t){return i._offset(this.tz.time_utc,this.tz.offset,t)},i.prototype.offset_loc=function(t){return i._offset(this.tz.time,this.tz.offset,t)},i.prototype.name=function(){return this._name},i.prototype.correction_loc=function(t){var e=this.tz.time,n=this.tz.offset,r=a(e,t);if(r<1)return 0;var o=n[r]-n[r-1];if(o>0&&t-e[r-1]<=o)return o;return 0},i.prototype.is_valid=function(){return!this._invalid},i._offset=function(t,e,n){var r=a(t,n);return-1===r?0:e[r]};var u=function(t){return 0|t},c=function(t){return 60*t*1e3},f=function(t,e){return l(t)-l(e)},l=function(t){return t<0?u(t/1e3)-(t%1e3!=0?1:0):u(t/1e3)};function d(t){return t%4==0&&(t%100!=0||t%400==0)}var h={0:0,1:31,2:59,3:90,4:120,5:151,6:181,7:212,8:243,9:273,10:304,11:334},g={...r.WeekDays,...r.Months,YEAR:1,MONTH:2,WEEK_OF_YEAR:3,DAY_OF_MONTH:5,DAY_OF_YEAR:6,DAY_OF_WEEK:7,HOUR_OF_DAY:11,MINUTE:12,SECOND:13,minutesPerDay:1440,millisecondsPerDay:c(1440),get_minutes_from_hhmm:function(t){return-1!==t.indexOf(":")&&(t=t.split(":").join("")),t%100+60*u(t/100)},get_year:function(t){return t.getUTCFullYear()},get_month:function(t){return t.getUTCMonth()},get_hours:function(t){return t.getUTCHours()},get_minutes:function(t){return t.getUTCMinutes()},get_seconds:function(t){return t.getUTCSeconds()},get_day_of_month:function(t){return t.getUTCDate()},get_day_of_week:function(t){return t.getUTCDay()+1},get_day_of_year:function(t){var e=t.getUTCMonth(),n=h[e];return e>g.JANUARY+1&&d(t.getUTCFullYear())&&(n+=1),n+t.getUTCDate()},get_week_of_year:function(t){var e=new Date(Date.UTC(t.getUTCFullYear(),0,1)).getUTCDay(),n=0===e?1:8-e,r=g.get_day_of_year(t)-n;return Math.ceil(r/7)+1},get_minutes_from_midnight:function(t){return 60*g.get_hours(t)+g.get_minutes(t)},set_hms:function(t,e,n,r,o,s){t.setUTCHours(e),t.setUTCMinutes(n),t.setUTCSeconds(r),t.setUTCMilliseconds(o),void 0!==s&&g.correct_time(t,s)},correct_time:function(t,e){var n=t.getTime(),r=e.correction_loc(n);t.setTime(n+r)},add_days_considering_dst:function(t,e,n){var r=t.offset_utc(e),o=this.clone(e);this.add_date(o,n);var s=t.offset_utc(o);return o.setTime(o.getTime()+r-s),o},add_years_considering_dst:function(t,e,n){let r=e;for(let e=Math.abs(n);e>0;e--)r=this.add_days_considering_dst(t,r,this.get_days_per_year(r)*Math.sign(n));return r},add_date:function(t,e){t.setTime(t.getTime()+e*g.millisecondsPerDay)},add_minutes:function(t,e){t.setTime(t.getTime()+c(e))},
clone:function(t){return new Date(t.getTime())},get_days_per_year:function(t){var e=t.getUTCFullYear();return this.days_per_year(e)},days_per_year:function(t){return d(t)?366:365},get_days_in_month:function(t,e){let n;switch(t){case 0:case 2:case 4:case 6:case 7:case 9:case 11:n=31;break;case 1:n=28,d(e)&&n++;break;default:n=30}return n},get_part:function(t,e){switch(e){case g.YEAR:return g.get_year(t);case g.MONTH:return g.get_month(t);case g.DAY_OF_MONTH:return g.get_day_of_month(t);case g.WEEK_OF_YEAR:return g.get_week_of_year(t);case g.DAY_OF_WEEK:return g.get_day_of_week(t);case g.HOUR_OF_DAY:return g.get_hours(t);case g.MINUTE:return g.get_minutes(t);case g.DAY_OF_YEAR:return g.get_day_of_year(t);case g.SECOND:return g.get_seconds(t);default:return t.getTime()}},time_minutes:c,time_seconds:function(t){return 1e3*t},time_minutes_diff:function(t,e){return u(f(t,e)/60)},time_seconds_diff:f,utc_to_cal:function(t,e){return new Date(g.utc_to_cal_ts(t,e))},utc_to_cal_ts:function(t,e){return e+t.offset_utc(e)},get_cal:function(t,e,n,r,o,s,i){var a=new Date(Date.UTC(e,n,r,o||0,s||0,i||0)),u=t.offset_utc(+a);return new Date(a.valueOf()-u)},get_cal_from_unix_timestamp_ms:function(t,e){return new Date(e+t.offset_utc(e))},get_cal_utc:function(t,e,n){return new Date(Date.UTC(t,e,n))},cal_to_utc:function(t,e){var n=e.getTime();return n-t.offset_loc(n)},get_timezone:function(t){return new i(t)},shift_day:function(t,e){var n=t-1;return(n+=e)>6?n%=7:n<0&&(n=(7+n%7)%7),n+1},setCustomTimezones:function(t){s=t}};t.exports=g},643:function(t,e,n){var r;t=n.nmd(t);var o=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)},s=function(t){return"object"==typeof t&&null!==t};function i(t){return"number"==typeof t&&isFinite(t)}function a(t){return null!=t&&(t.constructor===Function||"[object Function]"===Object.prototype.toString.call(t))}function u(t,e){t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}"undefined"!=typeof window?(r=window.TradingView=window.TradingView||{},window.isNumber=i,window.isFunction=a,window.inherit=u,window.isArray=o):r=this.TradingView=this.TradingView||{},r.isNaN=function(t){return!(t<=0||t>0)},r.isAbsent=function(t){return null==t},r.isExistent=function(t){return null!=t},Number.isNaN=Number.isNaN||function(t){return t!=t},r.isSameType=function(t,e){return Number.isNaN(t)||Number.isNaN(e)?Number.isNaN(t)===Number.isNaN(e):{}.toString.call(t)==={}.toString.call(e)},r.isInteger=function(t){return"number"==typeof t&&t%1==0},r.isString=function(t){return null!=t&&t.constructor===String},r.isInherited=function(t,e){if(null==t||null==t.prototype)throw new TypeError("isInherited: child should be a constructor function");if(null==e||null==e.prototype)throw new TypeError("isInherited: parent should be a constructor function");return t.prototype instanceof e||t.prototype===e.prototype},r.clone=function(t){if(!t||"object"!=typeof t)return t;var e,n,o;for(n in e="function"==typeof t.pop?[]:{},t)t.hasOwnProperty(n)&&(o=t[n],
e[n]=o&&"object"==typeof o?r.clone(o):o);return e},r.deepEquals=function(t,e,n){if(n||(n=""),t===e)return[!0,n];if(a(t)&&(t=void 0),a(e)&&(e=void 0),void 0===t&&void 0!==e)return[!1,n];if(void 0===e&&void 0!==t)return[!1,n];if(null===t&&null!==e)return[!1,n];if(null===e&&null!==t)return[!1,n];if("object"!=typeof t&&"object"!=typeof e)return[t===e,n];if(Array.isArray(t)&&Array.isArray(e)){var s=t.length;if(s!==e.length)return[!1,n];for(var i=0;i<s;i++){if(!(c=r.deepEquals(t[i],e[i],n+"["+i+"]"))[0])return c}return[!0,n]}if(o(t)||o(e))return[!1,n];if(Object.keys(t).length!==Object.keys(e).length)return[!1,n];for(var u in t){var c;if(!(c=r.deepEquals(t[u],e[u],n+"["+u+"]"))[0])return c}return[!0,n]},r.merge=function(t,e){for(var n in e)null!==e[n]&&"object"==typeof e[n]&&t.hasOwnProperty(n)?r.merge(t[n],e[n]):t[n]=e[n];return t},t&&t.exports&&(t.exports={inherit:u,clone:r.clone,merge:r.merge,isNumber:i,isInteger:r.isInteger,isString:r.isString,isObject:s,isHashObject:function(t){return s(t)&&-1!==t.constructor.toString().indexOf("function Object")},isPromise:function(t){return s(t)&&t.then},isNaN:r.isNaN,isAbsent:r.isAbsent,isExistent:r.isExistent,isSameType:r.isSameType,isArray:o,isFunction:a,parseBool:r.parseBool,deepEquals:r.deepEquals,notNull:function(t){return null!==t},notUndefined:function(t){return void 0!==t},isEven:function(t){return t%2==0},declareClassAsPureInterface:function(t,e){for(var n in t.prototype)"function"==typeof t.prototype[n]&&t.prototype.hasOwnProperty(n)&&(t.prototype[n]=function(){throw new Error(e+"::"+n+" is an interface member declaration and must be overloaded in order to be called")})},requireFullInterfaceImplementation:function(t,e,n,r){for(var o in n.prototype)if("function"==typeof n.prototype[o]&&!t.prototype[o])throw new Error("Interface implementation assertion failed: "+e+" does not implement "+r+"::"+o+" function")}})},53:()=>{},111:t=>{t.exports={isRtl:()=>!1}},917:(t,e,n)=>{"use strict";var r,o;n.r(e),n.d(e,{Months:()=>o,WeekDays:()=>r}),function(t){t[t.SUNDAY=1]="SUNDAY",t[t.MONDAY=2]="MONDAY",t[t.TUESDAY=3]="TUESDAY",t[t.WEDNESDAY=4]="WEDNESDAY",t[t.THURSDAY=5]="THURSDAY",t[t.FRIDAY=6]="FRIDAY",t[t.SATURDAY=7]="SATURDAY"}(r||(r={})),function(t){t[t.JANUARY=0]="JANUARY",t[t.FEBRUARY=1]="FEBRUARY",t[t.MARCH=2]="MARCH",t[t.APRIL=3]="APRIL",t[t.MAY=4]="MAY",t[t.JUNE=5]="JUNE",t[t.JULY=6]="JULY",t[t.AUGUST=7]="AUGUST",t[t.SEPTEMBER=8]="SEPTEMBER",t[t.OCTOBER=9]="OCTOBER",t[t.NOVEMBER=10]="NOVEMBER",t[t.DECEMBER=11]="DECEMBER"}(o||(o={}))}},e={};function n(r){var o=e[r];if(void 0!==o)return o.exports;var s=e[r]={id:r,loaded:!1,exports:{}};return t[r].call(s.exports,s,s.exports,n),s.loaded=!0,s.exports}n.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return n.d(e,{a:e}),e},n.d=(t,e)=>{for(var r in e)n.o(e,r)&&!n.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:e[r]})},n.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),n.r=t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{
value:!0})},n.nmd=t=>(t.paths=[],t.children||(t.children=[]),t),(()=>{const{miniCssF:t}=n;n.miniCssF=e=>self.document&&"rtl"===self.document.dir?t(e).replace(/\.css$/,".rtl.css"):t(e)})(),(()=>{"use strict";var t=n(480),e=n.n(t);class r{constructor(t,e,n){this.year=t,this.month=e,this.day=n}toString(){return`${this.year}-${this.month}-${this.day}`}compareTo(t){return this.year>t.year||this.year===t.year&&this.month>t.month||this.year===t.year&&this.month===t.month&&this.day>t.day?1:this.year===t.year&&this.month===t.month&&this.day===t.day?0:-1}before(t){return-1===this.compareTo(t)}toCalendar(e){return t.get_cal(t.get_timezone("Etc/UTC"),this.year,this.month-1,this.day)}addDays(e){const n=this.toCalendar(t.get_timezone("Etc/UTC"));return t.add_date(n,e),r.fromCalendar(n)}static fromCalendar(e){return new r(t.get_year(e),t.get_month(e)+1,t.get_day_of_month(e))}}function o(t,e){return t.compareTo(e)}class s{constructor(t,e,n){this._dayOfWeek=t,this._start=e,this._length=n}start(){return this._start+t.minutesPerDay*this.sessionStartDaysOffset()}startOffset(){return this._start}sessionStartDaysOffset(){return this._start>=0?0:this._start%t.minutesPerDay==0?-Math.ceil(this._start/t.minutesPerDay):-Math.floor(this._start/t.minutesPerDay)}sessionEndDaysOffset(){const e=this._start+this._length;return e>=0?0:e%t.minutesPerDay==0?-Math.ceil(e/t.minutesPerDay):-Math.floor(e/t.minutesPerDay)}isOvernight(){return this._start<0}dayOfWeek(){return this._dayOfWeek}sessionStartDayOfWeek(){let e=this._dayOfWeek-this.sessionStartDaysOffset();return e<t.SUNDAY&&(e+=7),e}sessionEndDayOfWeek(){let e=this.sessionStartDayOfWeek()+this.sessionEndDaysOffset();return e>t.SATURDAY&&(e=1),e}length(){return this._length}weight(){return this._dayOfWeek*t.minutesPerDay+this._start}compareTo(t){const e=this.weight(),n=e+this._length,r=t.weight(),o=r+t._length;return e<=r&&r<n||r<=e&&e<o?0:e>r?1:-1}contains(e){const n=60*t.get_hours(e)+t.get_minutes(e);let r=t.get_day_of_week(e)-this._dayOfWeek;r>0&&(r-=7);const o=r*t.minutesPerDay+n;return o>=this._start&&o<this._start+this._length}}const i="undefined"!=typeof window?window:{};let a=!1;try{localStorage.getItem(""),a=!0}catch(t){}var u;!function(t){t[t.ERROR=1]="ERROR",t[t.WARNING=2]="WARNING",t[t.INFO=3]="INFO",t[t.NORMAL=4]="NORMAL",t[t.DEBUG=5]="DEBUG"}(u||(u={}));let c=0;const f="tv.logger.loglevel",l="tv.logger.logHighRate",d=[];let h=null,g=null,_=null,y=NaN,m=u.WARNING,p=!1;function D(t){t=Math.max(u.ERROR,Math.min(u.DEBUG,t)),m=t,w()}function E(t,e){let n=d.reduce(((t,e)=>t.concat(e)),[]);return n.sort(((t,e)=>t.id-e.id)),void 0!==e&&(n=n.filter((t=>t.subSystemId===e))),"number"==typeof t&&(n=n.slice(-t)),n}function A(t){return new Date(t.timestamp).toISOString()+":"+t.subSystemId+":"+t.message.replace(/"/g,"'")}i.lget=(t,e)=>function(t,e){let n,r=0,o=0;for(n=t.length-1;n>=1&&(r+=8*(1+encodeURIComponent(t[n]).length),!(n-1>0&&(o=8*(1+encodeURIComponent(t[n-1]).length),r+o>e)));n--);return t.slice(n)}(E(t,e).map(A),75497472);function N(t,e,n,r){if(e===g&&r.id===_)return;const o=new Date
;if(t<=u.NORMAL&&function(t,e,n,r,o){"function"==typeof structuredClone&&(e=structuredClone(e));const s={id:c,message:e,subSystemId:r,timestamp:Number(t)};c+=1,n.push(s),void 0!==o&&n.length>o&&n.splice(0,1)}(o,e,n,r.id,r.maxCount),t<=m&&(!r.highRate||p)&&(!h||r.id.match(h))){const n=o.toISOString()+":"+r.id+":"+e;switch(t){case u.DEBUG:console.debug(n);break;case u.INFO:case u.NORMAL:r.color?console.log("%c"+n,"color: "+r.color):console.log(n);break;case u.WARNING:console.warn(n);break;case u.ERROR:console.error(n)}g=e,_=r.id,y&&clearTimeout(y),y=setTimeout((()=>{g=null,_=null,y=NaN}),1e3)}}function O(t,e={}){const n=[];d.push(n);const r=Object.assign(e,{id:t});function o(t){return e=>N(t,String(e),n,r)}return{logDebug:o(u.DEBUG),logError:o(u.ERROR),logInfo:o(u.INFO),logNormal:o(u.NORMAL),logWarn:o(u.WARNING)}}const S=O("logger");i.lon=(t,e)=>{D(u.DEBUG),S.logNormal("Debug logging enabled"),p=Boolean(t),h=e||null,w()},i.loff=()=>{D(u.INFO),S.logInfo("Debug logging disabled")};function w(){try{a&&(localStorage.setItem(l,String(p)),localStorage.setItem(f,String(m)))}catch(t){S.logWarn(`Cannot save logger state (level: ${m}, high-rate: ${p}) to localStorage: ${t.message}`)}}!function(){p=!!a&&"true"===localStorage.getItem(l);let t=parseInt(a&&localStorage.getItem(f)||"");Number.isNaN(t)&&(t=u.WARNING),D(t),S.logNormal(`Init with settings - level: ${m}, high-rate: ${p}`)}(),i.performance&&i.performance.now?S.logNormal(`Sync logger and perf times, now is ${i.performance.now()}`):S.logWarn("Perf time is not available");const T=[t.MONDAY,t.TUESDAY,t.WEDNESDAY,t.THURSDAY,t.FRIDAY],v=[t.SUNDAY,t.MONDAY,t.TUESDAY,t.WEDNESDAY,t.THURSDAY,t.FRIDAY,t.SATURDAY],R=O("Chart.Model.SessionSpec");function b(t){return t>=48&&t<=57}class U{constructor(){this.entries=[],this.firstDayOfWeek=t.MONDAY,this.weekEndsCount=-1,this.maxTradingDayLength=0}parseSessions(t,e){var n;let r=!1;this._clear(),this.timezone=t;const{hasErrors:s,spec:i}=this._parseFirstDayOfWeek(e);if("24x7"===i.toLowerCase())for(const t of v)this.entries.push(U._createSessionEntry(t,0,0,0,0));else{let t=!1;const e=new Map;for(const n of i.split("|")){const o=n.split(":");if(1!==o.length&&2!==o.length){r=!0,R.logError(`Bad session section: ${n}`);continue}const s=1===o.length;if(s){if(t){r=!0,R.logError(`Duplicated default section: ${n}`);continue}t=!0}const i=s?T:U._parseWorkingDays(o[1]);for(const t of i)s&&e.has(t)||e.set(t,o[0])}for(const t of v){const n=e.get(t);if(void 0!==n)for(const e of n.split(",")){const{hasErrors:n,sessionEntry:o}=U._parseSessionEntry(t,e);n&&(r=n),this.entries.push(o)}}}this.entries.sort(o);const a=new Map;for(const t of this.entries){const e=t.dayOfWeek();a.set(e,t.length()+(null!==(n=a.get(e))&&void 0!==n?n:0))}return this.maxTradingDayLength=0,a.forEach((t=>{this.maxTradingDayLength=Math.max(this.maxTradingDayLength,t)})),this.weekEndsCount=7-a.size,r||s}static parseHolidaysAndCorrections(e,n,r){const o=new Map,i=new Map,a=t=>{const e=this._parseDay(t),n=e.toString(),r=i.get(n);return void 0!==r?r:(i.set(n,e),e)};if(""!==n){const t=[]
;for(const e of n.split(",")){if(8!==e.length)throw new Error(`bad holiday date: ${e}`);const n=a(e);o.set(n,t)}}if(""===r)return o;const u=t.get_timezone("Etc/UTC");for(const e of r.split(";")){const n=e.split(":");if(2!==n.length)throw new Error(`bad correction section: ${e}`);const r=[];if("dayoff"!==n[0])for(const t of n[0].split(","))r.push(this._parseSessionEntry(1,t).sessionEntry);for(const e of n[1].split(",")){if(8!==e.length)throw new Error(`bad correction date: ${e}`);const n=a(e),i=t.get_day_of_week(t.get_cal(u,n.year,n.month-1,n.day)),c=[];for(const t of r)c.push(new s(i,t.startOffset(),t.length()));o.set(n,c)}}return o}_clear(){this.entries=[],this.timezone="",this.firstDayOfWeek=t.MONDAY,this.weekEndsCount=-1}_parseFirstDayOfWeek(e){const n=e.split(";");if(n.length>2)return R.logError(`Only one \`first day\` specification expected @ session ${e}`),{hasErrors:!0,spec:e};if(1===n.length)return{hasErrors:!1,spec:e};let r=1;let o=n[0].indexOf("-")>=0?NaN:parseInt(n[0]);return isNaN(o)&&(r=0,o=parseInt(n[1])),o<t.SUNDAY||o>t.SATURDAY?(R.logError(`Unexpected day index @ session: ${e}; day index ${o}`),{hasErrors:!0,spec:e}):(this.firstDayOfWeek=o,{hasErrors:!1,spec:n[r]})}static _parseDay(t){const e=parseInt(t.substring(0,4)),n=parseInt(t.substring(4,6)),o=parseInt(t.substring(6,8));return new r(e,n,o)}static _parseSessionEntry(t,e){let n=!1,r=e.split("-");2!==r.length&&(n=!0,R.logError(`Bad sessions entry: ${e}`),r=["0000","0000"]);let o=0,s=r[0];if(s.includes("F")){const t=s.split("F");s=t[0],o=""!==t[1]?parseInt(t[1]):1}let i=0,a=r[1];if(a.includes("F")){const t=a.split("F");a=t[0],i=""!==t[1]?parseInt(t[1]):1}if(!this._isCorrectSession(s)||!this._isCorrectSession(a))throw new Error(`Incorrect entry syntax: ${e}`);const u=s,c=a;return{hasErrors:n,sessionEntry:this._createSessionEntry(t,U._minutesFromHHMM(u),U._minutesFromHHMM(c),o,i)}}static _isCorrectSession(t){return 4===t.length&&b(t.charCodeAt(0))&&b(t.charCodeAt(1))&&b(t.charCodeAt(2))&&b(t.charCodeAt(3))}static _parseWorkingDays(t){const e=[];for(let n=0;n<t.length;n++){const r=+t[n];-1===e.indexOf(r)&&e.push(r)}return e}static _minutesFromHHMM(e){return t.get_minutes_from_hhmm(e)}static _createSessionEntry(e,n,r,o,i){0===r&&(r=t.minutesPerDay),o===i&&r<=n&&(o+=1),o>0&&(n-=o*t.minutesPerDay),i>0&&(r-=i*t.minutesPerDay);return new s(e,n,r-n)}}var Y=n(643);function C(t,e){if(!(0,Y.isNumber)(t))return"n/a";if(!(0,Y.isInteger)(e))throw new TypeError("invalid length");if(e<0||e>24)throw new TypeError("invalid length");if(0===e)return t.toString();return("0000000000000000"+t.toString()).slice(-e)}var M=n(111);function I(t){for(;t>e().minutesPerDay;)t-=e().minutesPerDay;const n=t%60,r=C((t-n)/60,2)+":"+C(n,2);return(0,M.isRtl)()?(0,M.startWithLTR)(r):r}function F(t,n,r){const{weekDays:o,closed:s}=r;return n.map((n=>{const r=t.filter((t=>t.dayOfWeek()===n)),i=`${o[n]} `;if(0===r.length)return`${i}${s}`;const a=r.map((t=>{const n=t.sessionStartDayOfWeek(),r=t.sessionStartDaysOffset(),s=function(t,n){let r=t+n;for(;r>e().SATURDAY;)r-=e().SATURDAY;return r
}(n,r===t.sessionEndDaysOffset()?0:r),i=n!==t.dayOfWeek()||s!==t.dayOfWeek(),a=i?o[n]:"",u=i?o[s]:"";return`${I(t.start())}${a}-${I(t.start()+t.length())}${u}`}));return`${i}${a.join(", ")}`}))}const k=new U,W=[e().MONDAY,e().TUESDAY,e().WEDNESDAY,e().THURSDAY,e().FRIDAY,e().SATURDAY,e().SUNDAY],x=W.reduce(((t,e)=>(t[e<7?e+1:1]=new Date(2018,0,e).toLocaleString(window.navigator.language,{weekday:"short"}),t)),{}),P=document.querySelector("#result"),$=document.querySelector("#session");function H(t){if(null===P)return;try{if(k.parseSessions("Etc/UTC",t)){const[t]=E(1);return void(P.textContent=t.message)}}catch(t){P.textContent=t.message}const e=F(k.entries,W,{weekDays:x,closed:"Closed"});P.innerHTML="",P.appendChild(function(t){const e=document.createElement("table"),n=document.createElement("tbody");for(const e of t){const t=document.createElement("tr"),r=document.createElement("td");r.textContent=e,t.appendChild(r),n.appendChild(t)}return e.appendChild(n),e}(e))}null==$||$.addEventListener("input",(()=>{H($.value)})),H((null==$?void 0:$.value)||"")})()})();</script></body></html>