(()=>{var u={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var b=([e,a,t])=>{let r=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(a).forEach(o=>{r.setAttribute(o,String(a[o]))}),t?.length&&t.forEach(o=>{let s=b(o);r.appendChild(s)}),r},U=(e,a={})=>{let r={...u,...a};return b(["svg",r,e])};var v=e=>{for(let a in e)if(a.startsWith("aria-")||a==="role"||a==="title")return!0;return!1};var H=(...e)=>e.filter((a,t,r)=>!!a&&a.trim()!==""&&r.indexOf(a)===t).join(" ").trim();var O=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(a,t,r)=>r?r.toUpperCase():t.toLowerCase());var G=e=>{let a=O(e);return a.charAt(0).toUpperCase()+a.slice(1)};var X=e=>Array.from(e.attributes).reduce((a,t)=>(a[t.name]=t.value,a),{}),E=e=>typeof e=="string"?e:!e||!e.class?"":e.class&&typeof e.class=="string"?e.class.split(" "):e.class&&Array.isArray(e.class)?e.class:"",p=(e,{nameAttr:a,icons:t,attrs:r})=>{let o=e.getAttribute(a);if(o==null)return;let s=G(o),f=t[s];if(!f)return console.warn(`${e.outerHTML} icon name was not found in the provided icons object.`);let l=X(e),V=v(l)?{}:{"aria-hidden":"true"},q={...u,"data-lucide":o,...V,...r,...l},I=E(l),W=E(r),T=H("lucide",`lucide-${o}`,...I,...W);T&&Object.assign(q,{class:T});let z=U(f,q);return e.parentNode?.replaceChild(z,e)};var m=[["path",{d:"M5 12h14"}],["path",{d:"m12 5 7 7-7 7"}]];var x=[["path",{d:"M7 7h10v10"}],["path",{d:"M7 17 17 7"}]];var i=[["path",{d:"M2 10v3"}],["path",{d:"M6 6v11"}],["path",{d:"M10 3v18"}],["path",{d:"M14 8v7"}],["path",{d:"M18 5v13"}],["path",{d:"M22 10v3"}]];var n=[["path",{d:"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"}]];var c=[["path",{d:"M20 6 9 17l-5-5"}]];var C=[["path",{d:"m6 9 6 6 6-6"}]];var d=[["path",{d:"M17.925 20.056a6 6 0 0 0-11.851.001"}],["circle",{cx:"12",cy:"11",r:"4"}],["circle",{cx:"12",cy:"12",r:"10"}]];var h=[["path",{d:"m12.296 3.464 3.02 3.956"}],["path",{d:"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"}],["path",{d:"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}],["path",{d:"m6.18 5.276 3.1 3.899"}]];var S=[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"}]];var g=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"}],["path",{d:"M9 18h6"}],["path",{d:"M10 22h4"}]];var w=[["circle",{cx:"12",cy:"16",r:"1"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3"}]];var k=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}],["circle",{cx:"12",cy:"10",r:"3"}]];var P=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"}]];var A=[["path",{d:"M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"}],["path",{d:"M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"}]];var M=[["path",{d:"m13.5 8.5-5 5"}],["path",{d:"m8.5 8.5 5 5"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]];var B=[["path",{d:"m21 21-4.34-4.34"}],["circle",{cx:"11",cy:"11",r:"8"}]];var F=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"}],["path",{d:"m21.854 2.147-10.94 10.939"}]];var D=[["path",{d:"M10 5H3"}],["path",{d:"M12 19H3"}],["path",{d:"M14 3v4"}],["path",{d:"M16 17v4"}],["path",{d:"M21 12h-9"}],["path",{d:"M21 19h-5"}],["path",{d:"M21 5h-7"}],["path",{d:"M8 10v4"}],["path",{d:"M8 12H3"}]];var L=[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2"}]];var R=[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]];var y=({icons:e={},nameAttr:a="data-lucide",attrs:t={},root:r=document,inTemplates:o}={})=>{if(!Object.values(e).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof r>"u")throw new Error("`createIcons()` only works in a browser environment.");if(Array.from(r.querySelectorAll(`[${a}]`)).forEach(f=>p(f,{nameAttr:a,icons:e,attrs:t})),o&&Array.from(r.querySelectorAll("template")).forEach(l=>y({icons:e,nameAttr:a,attrs:t,root:l.content,inTemplates:o})),a==="data-lucide"){let f=r.querySelectorAll("[icon-name]");f.length>0&&(console.warn("[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"),Array.from(f).forEach(l=>p(l,{nameAttr:"icon-name",icons:e,attrs:t})))}};window.lucide={createIcons:()=>y({icons:{Compass:S,Bookmark:n,MessagesSquare:A,CircleUserRound:d,ChevronDown:C,SlidersHorizontal:D,MapPin:k,Search:B,AudioLines:i,Lightbulb:g,Video:L,Clapperboard:h,SearchX:M,Send:F,Check:c,LockKeyhole:w,X:R,ArrowRight:m,ArrowUpRight:x,MessageCircle:P}})};})();
/*! Bundled license information:

lucide/dist/esm/defaultAttributes.js:
lucide/dist/esm/createElement.js:
lucide/dist/esm/shared/src/utils/hasA11yProp.js:
lucide/dist/esm/shared/src/utils/mergeClasses.js:
lucide/dist/esm/shared/src/utils/toCamelCase.js:
lucide/dist/esm/shared/src/utils/toPascalCase.js:
lucide/dist/esm/replaceElement.js:
lucide/dist/esm/icons/arrow-right.js:
lucide/dist/esm/icons/arrow-up-right.js:
lucide/dist/esm/icons/audio-lines.js:
lucide/dist/esm/icons/bookmark.js:
lucide/dist/esm/icons/check.js:
lucide/dist/esm/icons/chevron-down.js:
lucide/dist/esm/icons/circle-user-round.js:
lucide/dist/esm/icons/clapperboard.js:
lucide/dist/esm/icons/compass.js:
lucide/dist/esm/icons/lightbulb.js:
lucide/dist/esm/icons/lock-keyhole.js:
lucide/dist/esm/icons/map-pin.js:
lucide/dist/esm/icons/message-circle.js:
lucide/dist/esm/icons/messages-square.js:
lucide/dist/esm/icons/search-x.js:
lucide/dist/esm/icons/search.js:
lucide/dist/esm/icons/send.js:
lucide/dist/esm/icons/sliders-horizontal.js:
lucide/dist/esm/icons/video.js:
lucide/dist/esm/icons/x.js:
lucide/dist/esm/lucide.js:
  (**
   * @license lucide v1.8.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
