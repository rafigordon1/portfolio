document.addEventListener('DOMContentLoaded', () => {

    // 0. CUSTOM CURSOR
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (!isMobile) {
        const cursor = document.createElement('div');
        cursor.classList.add('custom-cursor');
        document.body.appendChild(cursor);
  
        document.addEventListener('mousemove', (e) => {
          cursor.style.left = e.clientX + 'px';
          cursor.style.top = e.clientY + 'px';
          cursor.style.opacity = '1';
        });
        document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
        document.addEventListener('mouseleave', () => { /* keep visible */ });
  
        const clickables = document.querySelectorAll('a, button, input, .interactive-word, .settings-toggle, .mobile-hamburger, .mobile-settings-icon, .theme-toggle-btn, .sound-toggle, .mobile-sound-toggle, .desktop-home-icon, .nina-trigger, .project-img-Wrapper, .v-launch-btn, .get-in-touch-text, .copy-icon, .email-popup, .v-start-btn, .nav-arrow, .key-btn, .reveal-btn, .desktop-contact-reveal, .mobile-contact-btn');
        clickables.forEach(el => {
          el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
          el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
        });
    }
  
    /* ─────────────────────────────────────────────────────────────
       1. GLOBAL P5.JS SHADER (BACKGROUND)
       ───────────────────────────────────────────────────────────── */
    const sketch = (p) => {
      let theShader;
      p.themeVal = 1.0; 
      p.params = { speed: 0.2, density: 0.2, hue: 0.0, glow: 0.3 };
      const vert = `attribute vec3 aPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; void main() { vTexCoord = aTexCoord; vec4 pos = vec4(aPosition, 1.0); pos.xy = pos.xy * 2.0 - 1.0; gl_Position = pos; }`;
      const frag = `
        #ifdef GL_ES
        precision highp float;
        #endif
        uniform vec2 u_resolution; uniform float u_time; uniform vec2 u_mouse;
        uniform float u_brightness; uniform float u_speed; uniform float u_density; uniform float u_glow;
        vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
        float voronoi(vec2 x, float t){
          vec2 n = floor(x); vec2 f = fract(x); float md1 = 1.0; float md2 = 1.0;
          for(int j=-1;j<=1;j++){ for(int i=-1;i<=1;i++){
              vec2 g = vec2(float(i), float(j)); vec2 o = hash22(n+g);
              o = 0.5 + 0.5*sin(t + 6.28*o); vec2 r = g + o - f;
              float d = dot(r,r); if(d < md1){ md2 = md1; md1 = d; } else if(d < md2){ md2 = d; }
          }} return md2 - md1; 
        }
        vec3 hsv2rgb(vec3 c){ vec4 K = vec4(1., 2./3., 1./3., 3.); vec3 p = abs(fract(c.xxx+K.xyz)*6.-K.www); return c.z*mix(K.xxx, clamp(p-K.xxx, 0., 1.), c.y); }
        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy; uv.x *= u_resolution.x / u_resolution.y;
          vec2 m = u_mouse; m.x *= u_resolution.x / u_resolution.y;
          vec2 dist = uv - m; 
          uv += (dist / (length(dist) + 0.1)) * 0.05 * (1.0-smoothstep(0.0, 0.5, length(dist)));
          float t = u_time * 0.2 * u_speed;
          vec2 p = uv * (3.0 * u_density); 
          float edge = voronoi(p + t, t);
          float crystal = smoothstep(0.05, 0.0, edge);
          vec3 col;
          if(u_brightness > 0.5) {
             vec3 base = vec3(0.96, 0.96, 0.98); 
             vec3 crystalCol = hsv2rgb(vec3(length(uv)*0.1 + t*0.05, 0.2, 0.9)); 
             col = mix(base, crystalCol, crystal * 0.4);
             col -= smoothstep(0.1, 0.0, edge) * 0.1; 
          } else {
             vec3 base = vec3(0.02, 0.02, 0.05); 
             vec3 crystalCol = hsv2rgb(vec3(length(uv)*0.5 + t*0.2, 0.8, 1.0));
             col = mix(base, crystalCol, crystal);
             col += crystalCol * u_glow * smoothstep(0.15, 0.0, edge);
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `;
      p.setup = () => { let c = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL); c.parent('p5-canvas-container'); theShader = p.createShader(vert, frag); p.noStroke(); };
      p.draw = () => {
        p.shader(theShader);
        let mx = p.mouseX / p.width; let my = 1.0 - (p.mouseY / p.height);
        theShader.setUniform('u_resolution', [p.width, p.height]);
        theShader.setUniform('u_time', p.millis() / 1000.0);
        theShader.setUniform('u_mouse', [mx, my]);
        theShader.setUniform('u_brightness', p.themeVal);
        theShader.setUniform('u_speed', p.params.speed);
        theShader.setUniform('u_density', p.params.density);
        theShader.setUniform('u_glow', p.params.glow);
        p.rect(0, 0, p.width, p.height);
      };
      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
      p.updateTheme = (val) => p.themeVal = val;
      p.updateParam = (k,v) => p.params[k] = parseFloat(v);
    };
    let myp5; if(typeof p5 !== 'undefined') myp5 = new p5(sketch);
  
    /* ─────────────────────────────────────────────────────────────
       2. AUDIO ENGINE
       ───────────────────────────────────────────────────────────── */
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    class AudioEngine {
      constructor() {
        this.isMuted = false;
        this.master = audioCtx.createGain();
        this.globalMute = audioCtx.createGain();
        this.globalMute.gain.value = 1;
        this.master.connect(this.globalMute);
        this.globalMute.connect(audioCtx.destination);
        this.master.gain.value = 0.2;
        
        this.delay = audioCtx.createDelay();
        this.delay.delayTime.value = 0.3; 
        this.delayFeedback = audioCtx.createGain();
        this.delayFeedback.gain.value = 0.3;
        this.delay.connect(this.delayFeedback); this.delayFeedback.connect(this.delay);
        this.delay.connect(this.master); this.master.connect(this.delay); 
  
        this.scale = [349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46]; 
        this.acidChords = [ [261.63, 329.63, 392.00, 493.88], [293.66, 349.23, 440.00, 523.25] ]; // Simplified list
        this.voices = {};
      }
  
      toggleMute() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        this.isMuted = !this.isMuted;
        const now = audioCtx.currentTime;
        this.globalMute.gain.cancelScheduledValues(now);
        this.globalMute.gain.setTargetAtTime(this.isMuted ? 0 : 1, now, 0.1);
        return this.isMuted;
      }
  
      // --- SYNTHS ---
      playAcid(note, time) {
         const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(note, time);
         const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 15; 
         filter.frequency.setValueAtTime(200, time); filter.frequency.exponentialRampToValueAtTime(3000, time + 0.1); filter.frequency.exponentialRampToValueAtTime(200, time + 0.5);
         const g = audioCtx.createGain(); g.gain.setValueAtTime(0.1, time); g.gain.linearRampToValueAtTime(0, time + 0.5);
         osc.connect(filter); filter.connect(g); g.connect(this.master); osc.start(time); osc.stop(time + 0.5);
      }
  
      playGlitch(time) {
         const osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(Math.random() * 2000 + 500, time);
         const mod = audioCtx.createOscillator(); mod.type = 'sawtooth'; mod.frequency.setValueAtTime(Math.random() * 100, time);
         const modGain = audioCtx.createGain(); modGain.gain.value = 1000; mod.connect(modGain); modGain.connect(osc.frequency);
         const g = audioCtx.createGain(); g.gain.setValueAtTime(0.1, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
         osc.connect(g); g.connect(this.master); osc.start(time); mod.start(time); osc.stop(time + 0.1); mod.stop(time + 0.1);
      }
      
      playPad(chord, time) {
         const g = audioCtx.createGain(); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(0.15, time + 0.5); g.gain.linearRampToValueAtTime(0, time + 2.0); g.connect(this.master);
         chord.forEach(freq => {
             const osc1 = audioCtx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = freq;
             const osc2 = audioCtx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = freq * 1.01; 
             const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
             osc1.connect(f); osc2.connect(f); f.connect(g); osc1.start(time); osc2.start(time); osc1.stop(time + 2.0); osc2.stop(time + 2.0);
         });
      }
      
      playBass(freq, time) {
         const osc = audioCtx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time);
         const g = audioCtx.createGain(); g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
         osc.connect(g); g.connect(this.master); osc.start(time); osc.stop(time + 0.8);
      }
      
      playClap(time) {
          const bufferSize = audioCtx.sampleRate * 0.2; 
          const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1);
          const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
          const g = audioCtx.createGain(); g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1200;
          noise.connect(filter); filter.connect(g); g.connect(this.master); noise.start(time);
      }
      
      playSax(freq, time) {
          const osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(freq, time);
          const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(800, time); f.frequency.linearRampToValueAtTime(2000, time+0.2);
          const g = audioCtx.createGain(); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(0.1, time+0.05); g.gain.linearRampToValueAtTime(0, time+0.6);
          osc.connect(f); f.connect(g); g.connect(this.master); osc.start(time); osc.stop(time+0.6);
      }
  
      playNinaChord() {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const rootIdx = Math.floor(Math.random() * (this.scale.length - 2));
        const root = this.scale[rootIdx];
        const third = this.scale[(rootIdx + 2) % this.scale.length];
        const fifth = this.scale[(rootIdx + 4) % this.scale.length];
        const chord = [root, third, fifth];
        const type = Math.random();
        if(type < 0.4) { this.playPad(chord, now); } 
        else if (type < 0.7) { this.playSax(root, now); this.playSax(fifth, now + 0.1); } 
        else { this.playAcid(root / 2, now); }
        this.playBass(root / 4, now);
        if(Math.random() > 0.5) this.playGlitch(now + 0.25);
        if(Math.random() > 0.7) this.playClap(now + 0.5);
      }
  
      playHarmonious() {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const notes = [261.63, 329.63, 392.00]; 
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.15, now + 0.3); g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        notes.forEach(f => {
           const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(f, now); osc.connect(g); osc.start(); osc.stop(now + 2.0);
        });
        g.connect(this.master);
      }
      
      playEuphoric() {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const notes = [155.56, 196.00, 233.08, 293.66, 349.23];
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.15, now + 0.1); 
        g.gain.exponentialRampToValueAtTime(0.001, now + 3.0); 
        notes.forEach((f, i) => {
           const osc = audioCtx.createOscillator();
           osc.type = i < 2 ? 'triangle' : 'sine';
           osc.frequency.setValueAtTime(f, now);
           osc.connect(g);
           osc.start(now);
           osc.stop(now + 3.0);
        });
        g.connect(this.master);
      }
  
      playAcidChord() {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const chord = [261.63, 329.63, 392.00, 493.88]; // Fixed for brevity
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6); 
        g.connect(this.master);
        chord.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(freq, now);
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass'; filter.Q.value = 15; 
            filter.frequency.setValueAtTime(100, now);
            filter.frequency.exponentialRampToValueAtTime(3000, now + 0.1); 
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.4); 
            osc.connect(filter); filter.connect(g);
            osc.start(now); osc.stop(now + 0.6);
        });
      }
  
      playPlaygroundSound() { this.playAcidChord(); }
  
      playCharge() {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15); 
        g.gain.setValueAtTime(0.4, now); g.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.connect(g); g.connect(this.master);
        osc.start(); osc.stop(now + 0.15);
      }
  
      playAtmosphere(isDark) {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        if(isDark) {
          osc.type = 'sine'; osc.frequency.setValueAtTime(110, now); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.8, now + 0.5); g.gain.linearRampToValueAtTime(0, now + 1.5); osc.start(); osc.stop(now + 1.5);
        } else {
          osc.type = 'triangle'; osc.frequency.setValueAtTime(1174.66, now); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.5, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 1.0); osc.start(); osc.stop(now + 1.0);
        }
        osc.connect(g); g.connect(this.master);
      }
  
      playSlider(type, val) {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        if (type === 'speed') {
            osc.type = 'sawtooth'; const freq = 200 + (val * 1000); osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq + 50, now + 0.1);
            const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2000; osc.connect(filter); filter.connect(g);
        } else if (type === 'density') {
            osc.type = 'square'; const freq = 600 - (val * 400); osc.frequency.setValueAtTime(freq, now);
            const lfo = audioCtx.createOscillator(); lfo.frequency.value = 50; const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 500; lfo.connect(lfoGain); lfoGain.connect(osc.detune); lfo.start(); lfo.stop(now + 0.1); osc.connect(g);
        } else if (type === 'glow') {
            osc.type = 'sine'; const freq = 800 + (val * 1000); osc.frequency.setValueAtTime(freq, now);
            const osc2 = audioCtx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.setValueAtTime(freq * 1.5, now); const g2 = audioCtx.createGain(); g2.gain.value = 0.1; osc2.connect(g2); g2.connect(g); osc2.start(); osc2.stop(now + 0.1); osc.connect(g);
        } else {
          osc.type = 'triangle'; osc.frequency.setValueAtTime(400 + (val*400), now); osc.connect(g);
        }
        g.connect(this.master); osc.start(); osc.stop(now + 0.1);
      }
  
      playNext() {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const freq = this.scale[Math.floor(Math.random() * this.scale.length)];
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq * 2, now); 
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.4, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(g); g.connect(this.master);
        osc.start(); osc.stop(now + 0.6);
      }
  
      startDrag(x, y) {
        if(this.isMuted) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        this.stopDrag(); 
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98];
        const idx = Math.floor((x / window.innerWidth) * notes.length);
        const freq = notes[Math.min(idx, notes.length - 1)];
        const now = audioCtx.currentTime;
  
        const osc1 = audioCtx.createOscillator(); osc1.type = 'triangle'; osc1.frequency.setValueAtTime(freq, now);
        const osc2 = audioCtx.createOscillator(); osc2.type = 'sine'; osc2.frequency.setValueAtTime(freq * 1.5, now);
        const osc3 = audioCtx.createOscillator(); osc3.type = 'sine'; osc3.frequency.setValueAtTime(freq * 2.25, now);
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; 
        const val = 1.0 - (y / window.innerHeight); filter.frequency.setTargetAtTime(300 + (val * 5000), now, 0.1);
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.12, now + 0.2); 
        osc1.connect(filter); osc2.connect(filter); osc3.connect(filter); filter.connect(gain); gain.connect(this.master);
        osc1.start(); osc2.start(); osc3.start();
        this.voices = { osc1, osc2, osc3, gain, filter };
      }
  
      updateDrag(x, y) {
        if(!this.voices.gain) return;
        const now = audioCtx.currentTime;
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98];
        const idx = Math.floor((x / window.innerWidth) * notes.length);
        const freq = notes[Math.min(idx, notes.length - 1)];
        this.voices.osc1.frequency.setTargetAtTime(freq, now, 0.1);
        this.voices.osc2.frequency.setTargetAtTime(freq * 1.5, now, 0.1);
        this.voices.osc3.frequency.setTargetAtTime(freq * 2.25, now, 0.1);
        const val = 1.0 - (y / window.innerHeight);
        this.voices.filter.frequency.setTargetAtTime(300 + (val * 5000), now, 0.1);
      }
  
      stopDrag() {
        if(this.voices.gain) {
          const now = audioCtx.currentTime;
          this.voices.gain.gain.cancelScheduledValues(now);
          this.voices.gain.gain.setValueAtTime(this.voices.gain.gain.value, now);
          this.voices.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          const v = this.voices;
          setTimeout(() => { if(v.osc1) v.osc1.stop(); if(v.osc2) v.osc2.stop(); if(v.osc3) v.osc3.stop(); }, 350);
          this.voices = {};
        }
      }
    }
  
    const synth = new AudioEngine();
  
    // ─── Interaction Handlers ───
    let isDragging = false;
    const hints = document.querySelectorAll('.tap-hint');
  
    const hideHints = () => {
        hints.forEach(h => {
            if(getComputedStyle(h).opacity !== '0') {
                h.style.opacity = '0';
                setTimeout(() => h.style.visibility = 'hidden', 300);
            }
        });
    };
  
    window.addEventListener('mousedown', (e) => {
      if(e.button !== 0) return; 
      hideHints();
      if(audioCtx.state === 'suspended') audioCtx.resume();
      // Exclude interactions from triggering main drag sound
      if(e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('a') || e.target.closest('.sound-toggle') || e.target.closest('.mobile-sound-toggle') || e.target.closest('.get-in-touch-container') || e.target.closest('.v-start-btn') || e.target.closest('.v-paywall-overlay') || e.target.closest('.nav-arrow') || e.target.closest('.key-btn') || e.target.closest('.reveal-btn') || e.target.closest('.desktop-contact-reveal') || e.target.closest('.mobile-contact-btn') || e.target.classList.contains('liquid-slider')) return;
      isDragging = true;
      synth.startDrag(e.clientX, e.clientY);
    });
  
    window.addEventListener('mousemove', (e) => {
      if(audioCtx.state === 'suspended') audioCtx.resume();
      if(isDragging) synth.updateDrag(e.clientX, e.clientY);
    });
  
    const stopAudio = () => { if(isDragging) { isDragging = false; synth.stopDrag(); } };
    window.addEventListener('mouseup', stopAudio);
    window.addEventListener('mouseleave', stopAudio);
  
    window.addEventListener('touchstart', (e) => {
       hideHints();
       if(audioCtx.state === 'suspended') audioCtx.resume();
    }, {passive:true});
  
    // Listeners
    document.querySelectorAll('nav a').forEach(el => { el.addEventListener('mouseenter', () => synth.playCharge()); });
    const rafiWord = document.querySelector('.interactive-word.rafi');
    if(rafiWord) rafiWord.addEventListener('mouseenter', () => synth.playHarmonious());
    
    const homeIcon = document.querySelector('.desktop-home-icon');
    if(homeIcon) homeIcon.addEventListener('mouseenter', () => synth.playEuphoric());
  
    // General Hover Sounds
    document.querySelectorAll('.interactive-word:not(.rafi), .sound-only-word, .settings-toggle, .rsvp-toggle, input[type=range], .mobile-hamburger, .theme-toggle-btn').forEach(el => {
      el.addEventListener('mouseenter', () => synth.playNext()); 
    });
    
    // Navigation Arrows Sound
    document.querySelectorAll('.nav-arrow').forEach(arrow => {
       arrow.addEventListener('mouseenter', () => synth.playNext());
       arrow.addEventListener('click', () => synth.playCharge());
    });
  
    document.querySelectorAll('.grid-item').forEach(el => {
        el.addEventListener('mouseenter', () => { synth.playPlaygroundSound(); });
    });
  
    document.querySelectorAll('input[type=range]').forEach(el => {
        el.addEventListener('mousedown', () => { if(audioCtx.state === 'suspended') audioCtx.resume(); });
        el.addEventListener('touchstart', () => { if(audioCtx.state === 'suspended') audioCtx.resume(); }, {passive:true});
        el.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            let norm = 0; let type = '';
            if(e.target.id === 'p-speed') { type = 'speed'; norm = (val - 0.1) / (3 - 0.1); }
            else if(e.target.id === 'p-density') { type = 'density'; norm = (val - 0.5) / (2 - 0.5); }
            else if(e.target.id === 'p-glow') { type = 'glow'; norm = (val - 0.2) / (1.5 - 0.2); }
            else if(e.target.classList.contains('rsvp-speed-slider')) { type = 'rsvp'; norm = (val - 50) / (500 - 50); }
            else if(e.target.classList.contains('v-demo-slider')) { type = 'density'; norm = val / 100; }
            synth.playSlider(type, norm);
        });
    });
  
    const ninaTrigger = document.querySelector('.nina-trigger');
    if(ninaTrigger) ninaTrigger.addEventListener('mouseenter', () => synth.playNinaChord());
  
    const navMap = {
      'rafi': 'about.html', 'research': 'projects.html', 'innovate': 'projects.html',
      'design': 'play.html', 'immerse': 'play.html'
    };
    document.querySelectorAll('.interactive-word').forEach(el => {
      el.addEventListener('click', () => {
        const cls = Array.from(el.classList).find(c => navMap[c]);
        if(cls) window.location.href = navMap[cls];
      });
    });
  
    /* ─────────────────────────────────────────────────────────────
       RSVP (SPEED READER) LOGIC
       ───────────────────────────────────────────────────────────── */
    const rsvpWrapper = document.querySelector('.rsvp-wrapper');
    const rsvpToggle = document.querySelector('.rsvp-toggle');
    const rsvpLeft = document.querySelector('.rsvp-left');
    const rsvpPivot = document.querySelector('.rsvp-pivot');
    const rsvpRight = document.querySelector('.rsvp-right');
    const rsvpSlider = document.querySelector('.rsvp-speed-slider');
    
    const iconPlay = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    const iconPause = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  
    let rsvpInterval;
    let rsvpIndex = 0;
    let rsvpRunning = false;
    const bioText = "I'm a digital designer based in Melbourne looking to create enjoyable and memorable experiences.";
    const words = bioText.split(' ');
  
    const renderWord = (word) => {
        const center = Math.ceil(word.length / 2);
        const leftPart = word.slice(0, center - 1);
        const pivotPart = word.charAt(center - 1);
        const rightPart = word.slice(center);
        rsvpLeft.textContent = leftPart;
        rsvpPivot.textContent = pivotPart;
        rsvpRight.textContent = rightPart;
    };
  
    const stopRSVP = (reset = false) => {
        clearInterval(rsvpInterval);
        rsvpRunning = false;
        if (reset) {
            rsvpWrapper.classList.remove('active-mode');
            rsvpIndex = 0;
            rsvpToggle.innerHTML = iconPlay;
        } else {
            rsvpToggle.innerHTML = iconPlay;
        }
    };
  
    const tickRSVP = () => {
        if (rsvpIndex >= words.length) {
            rsvpIndex = 0; // Loop seamlessly
        }
        renderWord(words[rsvpIndex]);
        rsvpIndex++;
    };
  
    const startRSVP = () => {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        rsvpWrapper.classList.add('active-mode');
        rsvpRunning = true;
        rsvpToggle.innerHTML = iconPause;
        const wpm = parseInt(rsvpSlider.value);
        const delay = 60000 / wpm;
        if(rsvpIndex === 0) tickRSVP(); 
        clearInterval(rsvpInterval);
        rsvpInterval = setInterval(tickRSVP, delay);
    };
  
    if(rsvpToggle) {
        rsvpToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            synth.playCharge();
            if (rsvpRunning) stopRSVP(true); 
            else {
                if(rsvpIndex >= words.length) rsvpIndex = 0;
                startRSVP();
            }
        });
    }
    if(rsvpSlider) {
        rsvpSlider.addEventListener('input', () => {
            if (rsvpRunning) startRSVP(); 
        });
    }
  
    /* ─────────────────────────────────────────────────────────────
       4. UI LOGIC (Theme & RSVP & Mute)
       ───────────────────────────────────────────────────────────── */
    const root = document.documentElement;
    
    const soundIconOn = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const soundIconOff = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>`;
    const toggleMuteUI = () => {
      const isMuted = synth.toggleMute();
      localStorage.setItem('site-muted', isMuted);
      updateSoundIcons(isMuted);
    };
    const updateSoundIcons = (isMuted) => {
      const btns = document.querySelectorAll('.sound-toggle, .mobile-sound-toggle');
      btns.forEach(b => b.innerHTML = isMuted ? soundIconOff : soundIconOn);
    };
    const savedMute = localStorage.getItem('site-muted');
    if(savedMute === 'true') { synth.toggleMute(); updateSoundIcons(true); } 
    else { updateSoundIcons(false); }
  
    const muteBtns = document.querySelectorAll('.sound-toggle, .mobile-sound-toggle');
    muteBtns.forEach(btn => btn.addEventListener('click', toggleMuteUI));
  
    // Timer
    const updateTimer = () => {
      const s = Math.floor((Date.now() - (sessionStorage.getItem('start') || Date.now()))/1000);
      const timeStr = `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
      document.querySelectorAll('.site-timer-display').forEach(el => el.textContent = timeStr);
    };
    if (!sessionStorage.getItem('start')) { sessionStorage.setItem('start', Date.now()); }
    setInterval(updateTimer, 1000);
    updateTimer();
  
    // Theme Logic
    const applyTheme = (isDark) => {
      if (!isDark) {
         root.style.setProperty('--bg-l', '95%'); root.style.setProperty('--text-l', '5%');
         root.style.setProperty('--accent', '#6b8c00'); 
         document.documentElement.setAttribute('data-theme', 'light');
         if(myp5) myp5.updateTheme(1.0);
      } else {
         root.style.setProperty('--bg-l', '5%'); root.style.setProperty('--text-l', '95%');
         root.style.setProperty('--accent', '#CCFF00'); 
         document.documentElement.setAttribute('data-theme', 'dark');
         if(myp5) myp5.updateTheme(0.0);
      }
      const vImages = document.querySelectorAll('.theme-img-v');
      vImages.forEach(img => { img.src = isDark ? 'Vlight.jpg' : 'Vdark.jpg'; });
      const mImages = document.querySelectorAll('.theme-img-m');
      mImages.forEach(img => { img.src = isDark ? 'Mlight.jpg' : 'Mdark.jpg'; });
      const soImages = document.querySelectorAll('.theme-img-so');
      soImages.forEach(img => { img.src = isDark ? 'SOdark.jpg' : 'SOlight.jpg'; });
    };
  
    const savedTheme = localStorage.getItem('dj-val');
    if(savedTheme !== null) {
        const isDark = parseInt(savedTheme) === 100;
        applyTheme(isDark);
        updateIcons(isDark);
    } else { applyTheme(false); }
  
    function updateIcons(isDark) {
      const svgs = document.querySelectorAll('.mobile-header-left:not(.mobile-home-link), .theme-toggle-btn, .mobile-theme-toggle-inside');
      const moon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      const sun = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      svgs.forEach(el => el.innerHTML = isDark ? sun : moon);
    }
  
    const toggleTheme = () => {
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const curr = getComputedStyle(root).getPropertyValue('--bg-l');
      const isCurrentlyDark = parseInt(curr) < 50; 
      const targetIsDark = !isCurrentlyDark;
      synth.playAtmosphere(targetIsDark); 
      applyTheme(targetIsDark);
      localStorage.setItem('dj-val', targetIsDark ? 100 : 0);
      updateIcons(targetIsDark);
    };
  
    const desktopBtn = document.querySelector('.theme-toggle-btn');
    const mobIcon = document.querySelector('.mobile-header-left:not(.mobile-home-link)');
    const menuTheme = document.querySelector('.mobile-theme-toggle-inside');
  
    if(desktopBtn) desktopBtn.addEventListener('click', toggleTheme);
    if(mobIcon) mobIcon.addEventListener('touchstart', (e) => { e.preventDefault(); toggleTheme(); });
    if(menuTheme) menuTheme.addEventListener('touchstart', (e) => { e.preventDefault(); toggleTheme(); });
  
    const mobSetToggle = document.querySelector('.mobile-settings-icon');
    const mobSetPanel = document.querySelector('.mobile-params');
    if(mobSetToggle && mobSetPanel) mobSetToggle.addEventListener('click', () => mobSetPanel.classList.toggle('open'));
    
    document.querySelectorAll('.settings-panel input, .mobile-params input').forEach(inp => {
        inp.addEventListener('input', e => { if(myp5) myp5.updateParam(e.target.id.replace('p-',''), e.target.value); });
    });
  
    // GSAP Animations (About Page & V-Pages)
    gsap.registerPlugin(ScrollTrigger);
  
    // Normal Animations for other sections (REMOVED SCROLL READER LOGIC HERE)
    const aboutSections = document.querySelectorAll('.about-section:not(.bio-split-layout)');
    aboutSections.forEach(section => {
       gsap.from(section.children, {
          scrollTrigger: { trigger: section, start: "top 80%" },
          y: 50, opacity: 0, duration: 1, stagger: 0.2, ease: "power2.out"
       });
    });
  
    // ─────────────────────────────────────────────────────────────
    // 5. ABOUT PAGE SPECIFIC INTERACTIONS (ETHOS & SCROLL)
    // ─────────────────────────────────────────────────────────────
    
    // A. P5 Ethos Spiral Interaction (Updated)
    if (document.getElementById('ethos-canvas')) {
        const ethosSketch = (p) => {
            let hovering = false;
            let mobileSpinning = false;
            let angle = 0;
            let numLines = 1;
            let lastToggle = 0; // Debounce timestamp
            let hasInteracted = false; // State tracker for mobile interaction
            
            p.setup = () => {
                let c = p.createCanvas(document.getElementById('ethos-graphic-container').offsetWidth, document.getElementById('ethos-graphic-container').offsetHeight);
                c.parent('ethos-canvas');
                p.noFill();
                p.stroke(100);
                
                // Mobile Click Logic (Debounced)
                c.elt.addEventListener('click', (e) => {
                    if (isMobile) {
                         const now = Date.now();
                         if (now - lastToggle > 300) { // 300ms debounce
                             lastToggle = now;
                             const label = document.querySelector('.mobile-tap-label');
  
                             if (!hasInteracted) {
                                 // First Tap: Start spinning and hide label
                                 hasInteracted = true;
                                 mobileSpinning = true;
                                 if(label) {
                                     label.style.opacity = '0';
                                     setTimeout(() => label.style.display = 'none', 500); 
                                 }
                             } else {
                                 // Subsequent Taps: Toggle spinning state
                                 mobileSpinning = !mobileSpinning;
                             }
                         }
                    }
                });
            };
  
            p.draw = () => {
                p.clear();
                
                // Mobile / Touch Logic
                if (isMobile) {
                    hovering = mobileSpinning;
                } else {
                    // Desktop: Radius Check (150px from center)
                    const d = p.dist(p.mouseX, p.mouseY, p.width/2, p.height/2);
                    hovering = (d < 150);
                }
  
                if (hovering) {
                    angle += 0.05;
                    if (numLines < 20) numLines++;
                    p.stroke(isDarkTheme() ? 255 : 0);
                } else {
                    if (numLines > 1) numLines--;
                    else angle = 0; 
                    p.stroke(125);
                }
  
                p.translate(p.width / 2, p.height / 2);
                p.rotate(angle);
                
                for (let i = 0; i < numLines; i++) {
                    p.push();
                    p.rotate((p.TWO_PI / Math.max(1, numLines)) * i);
                    p.beginShape();
                    for (let x = -100; x < 100; x+=10) {
                        p.vertex(x, p.sin(x * 0.05) * 40);
                    }
                    p.endShape();
                    p.pop();
                }
            };
  
            p.windowResized = () => {
                const div = document.getElementById('ethos-graphic-container');
                if(div) p.resizeCanvas(div.offsetWidth, div.offsetHeight);
            };
        };
        new p5(ethosSketch);
    }
  
    // ─── NEW ADVANCED LIQUID/GEOMETRY DEMO ───
    if (document.getElementById('liquid-demo-container')) {
        const liquidContainer = document.getElementById('liquid-demo-container');
        
        // Mobile Logic for Toggle UI
        const toggleUI = (e) => {
            if (isMobile) {
               if (e.target.classList.contains('liquid-slider') || e.target.closest('.immersive-ui-panel')) return;
               liquidContainer.classList.toggle('mobile-active');
            }
        };
        liquidContainer.addEventListener('click', toggleUI);
  
        const sliders = liquidContainer.querySelectorAll('.liquid-slider');
        sliders.forEach(s => {
            s.addEventListener('click', (e) => e.stopPropagation());
            s.addEventListener('touchstart', (e) => e.stopPropagation(), {passive: true});
        });
  
        const liquidSketch = (p) => {
            let sFlow, sTurb, sColor;
            let rows, cols;
            let scl = 20;
            let zoff = 0;
            let particles = [];
  
            p.setup = () => {
                let c = p.createCanvas(liquidContainer.offsetWidth, liquidContainer.offsetHeight);
                c.parent('liquid-demo-container');
                p.colorMode(p.HSB, 360, 100, 100, 100);
                p.noFill();
                
                cols = p.floor(p.width / scl);
                rows = p.floor(p.height / scl);
                
                sFlow = document.getElementById('liquid-flow');
                sTurb = document.getElementById('liquid-turb');
                sColor = document.getElementById('liquid-color');
            };
  
            p.draw = () => {
                p.clear(); // Clear canvas each frame for sharp geometry
                
                let speed = sFlow ? parseFloat(sFlow.value) : 0.2;
                let turb = sTurb ? parseFloat(sTurb.value) : 50; 
                let hueVal = sColor ? parseFloat(sColor.value) : 180;
                
                zoff += speed * 0.1;
                
                p.strokeWeight(1.5);
                
                // Create a geometric wave mesh
                for (let y = 0; y < rows; y++) {
                    p.beginShape();
                    // Cycle hue slightly per row for depth
                    let h = (hueVal + y * 2) % 360;
                    p.stroke(h, 80, 100, 80);
                    
                    for (let x = 0; x <= cols; x++) {
                        // Calculate vertex Y position based on noise/sine waves
                        let xPos = x * scl;
                        
                        // Main wave math
                        let n = p.noise(x * 0.1, y * 0.1, zoff);
                        let wave = p.sin(x * 0.2 + zoff * 2) * (turb * 0.5);
                        let yOffset = p.map(n, 0, 1, -turb, turb);
                        
                        let yPos = (y * scl) + yOffset + wave;
                        
                        p.vertex(xPos, yPos);
                    }
                    p.endShape();
                }
            };
  
            p.windowResized = () => {
                 p.resizeCanvas(liquidContainer.offsetWidth, liquidContainer.offsetHeight);
                 cols = p.floor(p.width / scl);
                 rows = p.floor(p.height / scl);
            };
        };
        new p5(liquidSketch);
    }
  
    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }
  
    // B. Slideshow Horizontal Scroll (Standard, no pin)
    // Logic is now purely CSS overflow, but we can add wheel support for desktop convenience
    if (document.querySelector('.slideshow-container')) {
        const slider = document.querySelector('.slideshow-container');
        slider.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                // 1. If scrolling UP and at the start, allow page scroll
                if (e.deltaY < 0 && slider.scrollLeft <= 0) return;
                
                // 2. If scrolling DOWN and at the end, allow page scroll (prevents trap)
                if (e.deltaY > 0 && Math.ceil(slider.scrollLeft + slider.clientWidth) >= slider.scrollWidth) return;
  
                // 3. Otherwise hijack for horizontal
                e.preventDefault();
                slider.scrollLeft += e.deltaY;
            }
        });
    }
  
    // C. Contact Logic (Copy to Clipboard)
    const copyLogic = (btn) => {
        navigator.clipboard.writeText('rafigordon04@gmail.com').then(() => {
           synth.playCharge();
           const originalText = btn.innerHTML;
           
           if (btn.classList.contains('mobile-contact-btn')) {
              btn.textContent = "Copied!";
              setTimeout(() => btn.textContent = "Get in Touch", 2000);
           } else {
               const emailSpan = btn.querySelector('.email-text');
               if(emailSpan) {
                   const old = emailSpan.textContent;
                   emailSpan.textContent = "Copied!";
                   setTimeout(() => emailSpan.textContent = old, 2000);
               }
           }
        });
    };
  
    const bioTrigger = document.getElementById('bio-copy-trigger'); 
    const mobBioBtn = document.getElementById('mobile-bio-copy');   
  
    if (bioTrigger) {
        bioTrigger.addEventListener('click', (e) => { e.stopPropagation(); copyLogic(bioTrigger); });
    }
    if (mobBioBtn) {
        mobBioBtn.addEventListener('click', (e) => { e.stopPropagation(); copyLogic(mobBioBtn); });
    }
  
  
    // ─────────────────────────────────────────────────────────────
    // EXISTING LOGIC (Reveal Hint, Vizardry, etc)
    // ─────────────────────────────────────────────────────────────
  
    if (window.location.href.includes('vizardry.html') || window.location.href.includes('swipeout.html') || window.location.href.includes('thegreatescape.html')) {
       document.querySelectorAll('.v-row').forEach((row, i) => {
           gsap.to(row, {
               scrollTrigger: { trigger: row, start: "top 80%" },
               opacity: 1, y: 0, duration: 1, ease: "power2.out"
           });
       });
  
       const startBtn = document.querySelector('.v-start-btn');
       const overlay = document.querySelector('.v-paywall-overlay');
       if(startBtn && overlay) {
           startBtn.addEventListener('click', () => {
               synth.playCharge();
               gsap.to(startBtn, { scale: 0, duration: 0.3, ease: 'back.in' });
               overlay.classList.add('active');
           });
       }
  
       const dial = document.querySelector('.v-dial-graphic');
       if(dial) {
           gsap.to('.v-dial-graphic', {
               scrollTrigger: { trigger: '.v-dial-graphic', start: "top bottom", end: "bottom top", scrub: 1 },
               rotation: 360, ease: "none"
           });
       }
  
       const safeUI = document.querySelector('.safe-ui');
       if(safeUI) {
           const display = safeUI.querySelector('.safe-display');
           const keys = safeUI.querySelectorAll('.key-btn');
           let currentCode = "";
           const CORRECT_CODE = "3151"; 
           keys.forEach(k => {
               k.addEventListener('click', () => {
                   synth.playNext(); 
                   const val = k.getAttribute('data-key');
                   if (display.classList.contains('success')) return; 
  
                   if (val === 'C') {
                       currentCode = ""; display.textContent = "LOCKED"; display.style.color = "#000";
                   } else if (val === 'E') {
                       if (currentCode === CORRECT_CODE) {
                           display.textContent = "OPENED"; display.classList.add('success'); synth.playEuphoric(); 
                           // NEW: Reveal Discount Code
                           const discount = document.querySelector('.discount-code-wrapper');
                           if(discount) {
                               discount.style.display = 'block';
                               gsap.fromTo(discount, {opacity: 0, y: 10}, {opacity: 1, y: 0, duration: 1, ease: 'power2.out'});
                           }
                       } else {
                           display.textContent = "ERROR"; display.style.color = "red"; synth.playGlitch(audioCtx.currentTime); 
                           setTimeout(() => { currentCode = ""; display.textContent = "LOCKED"; display.style.color = "#000"; }, 1000);
                       }
                   } else {
                       if (display.textContent === "LOCKED" || display.textContent === "ERROR") {
                           display.textContent = ""; display.style.color = "#000";
                       }
                       if (currentCode.length < 4) { currentCode += val; display.textContent = currentCode; }
                   }
               });
           });
       }
       
       const revealBtn = document.getElementById('reveal-hint-btn');
       const hintText = document.getElementById('hint-text');
       if(revealBtn && hintText) {
           revealBtn.addEventListener('click', () => {
               synth.playNext();
               revealBtn.style.display = 'none'; hintText.style.display = 'block';
               gsap.fromTo(hintText, {opacity: 0, y: 5}, {opacity: 0.6, y: 0, duration: 0.5});
           });
       }
    }
  
    const contactText = document.querySelector('.get-in-touch-text');
    const popup = document.querySelector('.email-popup');
    const copyIcon = document.querySelector('.copy-icon');
  
    if(contactText && popup) {
       const copyEmail = () => {
           navigator.clipboard.writeText('rafigordon04@gmail.com').then(() => {
               const span = popup.querySelector('span');
               const original = span.textContent;
               span.textContent = "Email Copied!";
               synth.playCharge();
               popup.classList.add('show'); 
               if(isMobile) {
                  popup.classList.add('mobile-locked');
                  setTimeout(() => popup.classList.remove('mobile-locked'), 3000);
               }
               setTimeout(() => span.textContent = original, 2000);
           });
       };
       contactText.addEventListener('mouseenter', () => { popup.classList.add('show'); synth.playNext(); });
       popup.addEventListener('mouseleave', () => { if(!popup.classList.contains('mobile-locked')) popup.classList.remove('show'); });
       contactText.addEventListener('click', copyEmail);
       popup.addEventListener('click', copyEmail); 
       if(copyIcon) copyIcon.addEventListener('click', (e) => { e.stopPropagation(); copyEmail(); });
    }
  
    const splitTextNodes = (element) => {
      if (element.classList.contains('char-shard')) return; 
      const childNodes = Array.from(element.childNodes);
      childNodes.forEach(node => {
          if (node.nodeType === 3) { 
              const text = node.textContent;
              if (!text.trim() && text !== ' ') return; 
              const frag = document.createDocumentFragment();
              text.split('').forEach(char => {
                  const span = document.createElement('span'); span.textContent = char; span.classList.add('char-shard');
                  if (char === ' ') span.style.minWidth = '0.25em'; 
                  frag.appendChild(span);
              });
              node.parentNode.replaceChild(frag, node);
          } else if (node.nodeType === 1) { splitTextNodes(node); }
      });
    };
  
    const splitTextAndShatter = () => {
      const targets = document.querySelectorAll('.universal-page-title, .shatter-container h1, .intro-line');
      targets.forEach(target => {
         splitTextNodes(target); 
         const chars = target.querySelectorAll('.char-shard');
         gsap.to(chars, {
             scrollTrigger: { trigger: document.body, start: "top top", end: "500px top", scrub: 1 },
             x: (i) => (Math.random() - 0.5) * window.innerWidth * 1.5, 
             y: (i) => (Math.random() - 0.5) * window.innerHeight * 0.5, 
             z: (i) => Math.random() * 500 - 250, 
             rotation: (i) => Math.random() * 360 - 180,
             rotationX: (i) => Math.random() * 360,
             rotationY: (i) => Math.random() * 360,
             opacity: 0, ease: "power1.inOut"
         });
      });
    };
    splitTextAndShatter();
  
    const projects = document.querySelectorAll('.project-item');
    const gridItems = document.querySelectorAll('.grid-item');
    const checkReveal = () => {
      const vh = window.innerHeight;
      projects.forEach(p => { if(p.getBoundingClientRect().top < vh * 0.95) p.classList.add('visible'); });
      gridItems.forEach(g => { if(g.getBoundingClientRect().top < vh * 0.95) g.classList.add('visible'); });
    };
    window.addEventListener('scroll', checkReveal);
    checkReveal(); 
    
    const ham=document.querySelector('.mobile-hamburger'), menu=document.querySelector('.mobile-menu'), cls=document.querySelector('.menu-close');
    if(ham) ham.addEventListener('mousedown', ()=> { synth.playNext(); menu.classList.add('open'); });
    if(cls) cls.addEventListener('mousedown', ()=> { synth.playNext(); menu.classList.remove('open'); });
  
    // Mobile Dropdown Logic
    const dropdownToggle = document.querySelector('.mobile-dropdown-toggle');
    const dropdownContainer = document.querySelector('.mobile-dropdown-container');
    if(dropdownToggle && dropdownContainer) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            synth.playNext();
            dropdownContainer.classList.toggle('open');
        });
    }
  
  });