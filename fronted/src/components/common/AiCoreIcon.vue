<script setup>
defineProps({
  size: { type: [Number, String], default: 54 },
  compact: Boolean,
  status: Boolean
});
</script>

<template>
  <span class="ai-core-icon" :class="{compact,status}" :style="{'--ai-size':`${size}px`}" aria-hidden="true">
    <span class="ai-halo"></span>
    <span class="ai-orbit orbit-one"><i></i></span>
    <span class="ai-orbit orbit-two"><i></i></span>
    <span class="ai-orbit orbit-three"><i></i></span>
    <svg viewBox="0 0 80 80" role="img">
      <defs>
        <linearGradient id="fog-core-gradient" x1="10" y1="8" x2="70" y2="72">
          <stop stop-color="#bffaff"/>
          <stop offset=".38" stop-color="#39d8ff"/>
          <stop offset=".72" stop-color="#5f8dff"/>
          <stop offset="1" stop-color="#aa7dff"/>
        </linearGradient>
        <radialGradient id="fog-core-fill">
          <stop stop-color="#d9fdff" stop-opacity=".36"/>
          <stop offset=".42" stop-color="#38d9ff" stop-opacity=".13"/>
          <stop offset="1" stop-color="#07182c" stop-opacity=".2"/>
        </radialGradient>
        <filter id="fog-core-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#fog-core-glow)">
        <path d="M40 11 62.5 24v26L40 63 17.5 50V24L40 11Z" fill="url(#fog-core-fill)" stroke="url(#fog-core-gradient)" stroke-width="2.15"/>
        <path d="m40 19 14.6 8.4v16.9L40 52.7l-14.6-8.4V27.4L40 19Z" fill="none" stroke="url(#fog-core-gradient)" stroke-width="1.25" stroke-dasharray="2.4 3.2"/>
        <path d="M31 31.5 40 26l9 5.5v10.8L40 48l-9-5.7V31.5Z" fill="rgba(10,41,68,.76)" stroke="#8ef2ff" stroke-width="1.4"/>
        <path d="M40 26v22M31 31.5l18 10.8M49 31.5 31 42.3" fill="none" stroke="url(#fog-core-gradient)" stroke-width="1.05" opacity=".9"/>
        <circle cx="40" cy="26" r="2.25" fill="#e9ffff"/>
        <circle cx="31" cy="31.5" r="2.25" fill="#65eaff"/>
        <circle cx="49" cy="31.5" r="2.25" fill="#8da8ff"/>
        <circle cx="31" cy="42.3" r="2.25" fill="#47dbff"/>
        <circle cx="49" cy="42.3" r="2.25" fill="#a887ff"/>
        <circle cx="40" cy="48" r="2.25" fill="#d1fbff"/>
        <circle cx="40" cy="37" r="4.1" fill="#dffeff" stroke="#59ddff" stroke-width="1.4"/>
        <path d="M40 11V5M62.5 24l5.3-3M62.5 50l5.3 3M40 63v7M17.5 50l-5.3 3M17.5 24l-5.3-3" fill="none" stroke="url(#fog-core-gradient)" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>
    <span class="ai-core-scan"></span>
  </span>
</template>

<style scoped>
.ai-core-icon{--ai-size:54px;position:relative;width:var(--ai-size);height:var(--ai-size);display:inline-grid;place-items:center;flex:0 0 auto;isolation:isolate;overflow:visible}.ai-core-icon svg{position:relative;z-index:5;width:73%;height:73%;overflow:visible;filter:drop-shadow(0 0 10px rgba(50,215,255,.32))}.ai-halo{position:absolute;z-index:0;inset:17%;border-radius:50%;background:radial-gradient(circle,rgba(111,239,255,.24),rgba(58,137,255,.08) 45%,transparent 72%);filter:blur(5px);animation:coreBreathe 2.4s ease-in-out infinite}.ai-orbit{position:absolute;z-index:2;left:2%;right:2%;top:15%;height:70%;border:1px solid rgba(79,220,255,.25);border-radius:50%;box-shadow:inset 0 0 13px rgba(63,210,255,.045),0 0 12px rgba(37,193,244,.055);transform-origin:50% 50%}.ai-orbit::after{content:"";position:absolute;inset:-1px;border-radius:inherit;border-top-color:rgba(202,251,255,.52);border-right-color:transparent;border-bottom-color:rgba(128,105,255,.25);border-left-color:transparent;border-style:solid;border-width:1px}.ai-orbit i{position:absolute;left:50%;top:-3px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#d7fdff;box-shadow:0 0 7px #d7fdff,0 0 17px #45dfff,0 0 28px rgba(65,214,255,.78)}.orbit-one{animation:orbitRunA 4.2s linear infinite}.orbit-two{left:10%;right:10%;top:8%;height:84%;border-color:rgba(129,111,255,.25);animation:orbitRunB 5.7s linear infinite reverse}.orbit-two i{top:auto;bottom:-3px;background:#b6a5ff;box-shadow:0 0 7px #d9d0ff,0 0 18px #8977ff,0 0 27px rgba(126,103,255,.8)}.orbit-three{left:17%;right:17%;top:18%;height:64%;border-color:rgba(88,237,205,.2);animation:orbitRunC 3.4s linear infinite}.orbit-three i{left:15%;top:8%;background:#9affdc;box-shadow:0 0 7px #c9ffec,0 0 17px #54e8c1,0 0 26px rgba(71,226,187,.72)}.ai-core-scan{position:absolute;z-index:6;left:24%;right:24%;top:25%;height:1px;background:linear-gradient(90deg,transparent,#baf9ff,transparent);box-shadow:0 0 9px #53dfff;opacity:.65;animation:coreScan 2.8s ease-in-out infinite}.status .ai-halo{animation-duration:1.85s}.status .ai-orbit i{width:7px;height:7px}.compact .ai-orbit{opacity:.88}.compact .ai-orbit i{width:4px;height:4px}.compact .ai-core-scan{opacity:.4}@keyframes orbitRunA{from{transform:rotate(18deg)}to{transform:rotate(378deg)}}@keyframes orbitRunB{from{transform:rotate(-42deg)}to{transform:rotate(318deg)}}@keyframes orbitRunC{from{transform:rotate(78deg)}to{transform:rotate(438deg)}}@keyframes coreBreathe{50%{transform:scale(1.18);opacity:.58}}@keyframes coreScan{0%,100%{transform:translateY(0);opacity:.2}50%{transform:translateY(calc(var(--ai-size)*.28));opacity:.9}}
</style>
