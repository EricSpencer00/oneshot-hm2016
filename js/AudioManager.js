/**
 * AudioManager.js
 * Handles all game audio using Web Audio API
 * Generates procedural sound effects
 */

class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.initialized = false;
        this.muted = false;
        
        // Sound pools for reuse
        this.sounds = new Map();
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    async init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = 0.5;
            this.initialized = true;
            console.log('Audio initialized');
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    /**
     * Resume audio context if suspended
     */
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    /**
     * Set master volume
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        return this.muted;
    }

    /**
     * Create an oscillator-based sound
     */
    createOscillator(type, frequency, duration, gainValue = 0.3) {
        if (!this.initialized) return null;

        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        gain.gain.setValueAtTime(gainValue, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        return { oscillator, gain, duration };
    }

    /**
     * Create noise buffer
     */
    createNoiseBuffer(duration) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    /**
     * Play gunshot sound (suppressed or loud)
     */
    playGunshot(suppressed = false) {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;

        if (suppressed) {
            // Suppressed shot - quieter, more "pew" like
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const filter = this.context.createBiquadFilter();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.15);

            // Add subtle click
            const click = this.context.createOscillator();
            const clickGain = this.context.createGain();
            click.type = 'square';
            click.frequency.value = 150;
            clickGain.gain.setValueAtTime(0.1, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
            click.connect(clickGain);
            clickGain.connect(this.masterGain);
            click.start(now);
            click.stop(now + 0.02);

        } else {
            // Loud gunshot
            // Noise burst for the bang
            const noiseBuffer = this.createNoiseBuffer(0.2);
            const noise = this.context.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const noiseGain = this.context.createGain();
            const noiseFilter = this.context.createBiquadFilter();
            
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1000;
            noiseFilter.Q.value = 0.5;
            
            noiseGain.gain.setValueAtTime(0.8, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            
            noise.start(now);
            
            // Low frequency punch
            const punch = this.context.createOscillator();
            const punchGain = this.context.createGain();
            
            punch.type = 'sine';
            punch.frequency.setValueAtTime(150, now);
            punch.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            
            punchGain.gain.setValueAtTime(0.6, now);
            punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            punch.connect(punchGain);
            punchGain.connect(this.masterGain);
            
            punch.start(now);
            punch.stop(now + 0.15);
        }
    }

    /**
     * Play footstep sound
     */
    playFootstep(running = false) {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        // Create noise for footstep
        const buffer = this.createNoiseBuffer(0.1);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.value = running ? 400 : 300;
        
        const volume = running ? 0.15 : 0.08;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        source.start(now);
    }

    /**
     * Play hit/impact sound
     */
    playHit(isHeadshot = false) {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        // Thud sound
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isHeadshot ? 200 : 100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.15);

        // Add crack for headshot
        if (isHeadshot) {
            const crack = this.context.createOscillator();
            const crackGain = this.context.createGain();
            crack.type = 'sawtooth';
            crack.frequency.value = 800;
            crackGain.gain.setValueAtTime(0.2, now);
            crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            crack.connect(crackGain);
            crackGain.connect(this.masterGain);
            crack.start(now);
            crack.stop(now + 0.05);
        }
    }

    /**
     * Play alert sound
     */
    playAlert() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        // Rising alert tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.setValueAtTime(0.3, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * Play detection warning sound
     */
    playDetectionWarning() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 600;
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play reload sound
     */
    playReload() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        // Magazine out
        const click1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        click1.type = 'square';
        click1.frequency.value = 200;
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        click1.connect(gain1);
        gain1.connect(this.masterGain);
        click1.start(now);
        click1.stop(now + 0.05);

        // Magazine in
        const click2 = this.context.createOscillator();
        const gain2 = this.context.createGain();
        click2.type = 'square';
        click2.frequency.value = 300;
        gain2.gain.setValueAtTime(0.2, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        click2.connect(gain2);
        gain2.connect(this.masterGain);
        click2.start(now + 0.3);
        click2.stop(now + 0.35);

        // Slide
        const slide = this.context.createOscillator();
        const slideGain = this.context.createGain();
        slide.type = 'sawtooth';
        slide.frequency.setValueAtTime(150, now + 0.5);
        slide.frequency.linearRampToValueAtTime(250, now + 0.55);
        slideGain.gain.setValueAtTime(0.1, now + 0.5);
        slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        slide.connect(slideGain);
        slideGain.connect(this.masterGain);
        slide.start(now + 0.5);
        slide.stop(now + 0.6);
    }

    /**
     * Play death sound
     */
    playDeath() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        // Low drone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 1);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 1);
    }

    /**
     * Play mission complete jingle
     */
    playMissionComplete() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.15;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    /**
     * Play ambient sound (continuous)
     */
    startAmbient() {
        if (!this.initialized || this.ambientSource) return;
        this.resume();

        // Create subtle ambient drone
        this.ambientOsc = this.context.createOscillator();
        this.ambientGain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        this.ambientOsc.type = 'sine';
        this.ambientOsc.frequency.value = 60;
        
        filter.type = 'lowpass';
        filter.frequency.value = 100;
        
        this.ambientGain.gain.value = 0.05;
        
        this.ambientOsc.connect(filter);
        filter.connect(this.ambientGain);
        this.ambientGain.connect(this.masterGain);
        
        this.ambientOsc.start();
    }

    /**
     * Stop ambient sound
     */
    stopAmbient() {
        if (this.ambientOsc) {
            this.ambientOsc.stop();
            this.ambientOsc = null;
            this.ambientGain = null;
        }
    }

    /**
     * Play empty gun click
     */
    playEmptyClick() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        const click = this.context.createOscillator();
        const gain = this.context.createGain();
        
        click.type = 'square';
        click.frequency.value = 100;
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        click.connect(gain);
        gain.connect(this.masterGain);
        
        click.start(now);
        click.stop(now + 0.03);
    }

    /**
     * Play UI click sound
     */
    playUIClick() {
        if (!this.initialized) return;
        this.resume();

        const now = this.context.currentTime;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 1000;
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }
}

// Export for use
window.AudioManager = AudioManager;
