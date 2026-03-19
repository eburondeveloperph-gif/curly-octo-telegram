/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { audioContext } from './utils';
import AudioRecordingWorklet from './worklets/audio-processing';
import VolMeterWorket from './worklets/vol-meter';

import { createWorketFromSrc } from './audioworklet-registry';
import EventEmitter from 'eventemitter3';

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// FIX: Refactored to use composition over inheritance for EventEmitter
export class AudioRecorder {
  // FIX: Use an internal EventEmitter instance
  private emitter = new EventEmitter();

  // FIX: Expose on/off methods
  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 24000) {} // Higher sample rate for better quality and lower latency

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Could not request user media');
    }

    this.starting = new Promise(async (resolve, reject) => {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          // Enhanced audio settings for better accuracy
          sampleRate: this.sampleRate,
          channelCount: 1, // Mono for better speech recognition
        },
      });
      this.audioContext = await audioContext({ sampleRate: this.sampleRate }); // Optimized for fast response
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Enhanced filters for voice focus and noise cancellation
      const highpassFilter = this.audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.setValueAtTime(60, this.audioContext.currentTime); // Lower cutoff for voice fundamentals
      highpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime); // Gentle slope for natural sound

      // Voice frequency emphasis (speech focus)
      const voiceBandFilter = this.audioContext.createBiquadFilter();
      voiceBandFilter.type = 'bandpass';
      voiceBandFilter.frequency.setValueAtTime(1000, this.audioContext.currentTime); // Center on speech frequencies
      voiceBandFilter.Q.setValueAtTime(2, this.audioContext.currentTime); // Focus on 300-3000Hz speech range

      const lowpassFilter = this.audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.setValueAtTime(4000, this.audioContext.currentTime); // Cut high-frequency noise
      lowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime); // Gentle rolloff

      // Advanced noise reduction filter
      const noiseFilter = this.audioContext.createBiquadFilter();
      noiseFilter.type = 'notch';
      noiseFilter.frequency.setValueAtTime(50, this.audioContext.currentTime); // Remove 50/60Hz hum
      noiseFilter.Q.setValueAtTime(10, this.audioContext.currentTime); // Narrow notch

      // Echo cancellation filter
      const echoFilter = this.audioContext.createBiquadFilter();
      echoFilter.type = 'allpass';
      echoFilter.frequency.setValueAtTime(100, this.audioContext.currentTime); // Phase cancellation for echo
      echoFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

      // Voice gate for noise reduction
      const voiceGate = this.audioContext.createDynamicsCompressor();
      voiceGate.threshold.setValueAtTime(-40, this.audioContext.currentTime); // Gate threshold
      voiceGate.knee.setValueAtTime(0, this.audioContext.currentTime); // Hard gate
      voiceGate.ratio.setValueAtTime(20, this.audioContext.currentTime); // High ratio for gating
      voiceGate.attack.setValueAtTime(0.001, this.audioContext.currentTime); // Fast attack
      voiceGate.release.setValueAtTime(0.05, this.audioContext.currentTime); // Fast release

      // Enhanced compressor for better dynamics
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-20, this.audioContext.currentTime); // More sensitive
      compressor.knee.setValueAtTime(15, this.audioContext.currentTime); // Softer knee
      compressor.ratio.setValueAtTime(3, this.audioContext.currentTime); // Less compression for natural sound
      compressor.attack.setValueAtTime(0.001, this.audioContext.currentTime); // Ultra-fast attack
      compressor.release.setValueAtTime(0.03, this.audioContext.currentTime); // Faster release

      // Add a gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(2.0, this.audioContext.currentTime); // Higher boost for faster response

      // Chain nodes: source -> highpass -> voiceBand -> lowpass -> noise -> echo -> voiceGate -> compressor -> gain -> worklets
      this.source.connect(highpassFilter);
      highpassFilter.connect(voiceBandFilter);
      voiceBandFilter.connect(lowpassFilter);
      lowpassFilter.connect(noiseFilter);
      noiseFilter.connect(echoFilter);
      echoFilter.connect(voiceGate);
      voiceGate.connect(compressor);
      compressor.connect(gainNode);

      const workletName = 'audio-recorder-worklet';
      const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

      await this.audioContext.audioWorklet.addModule(src);
      this.recordingWorklet = new AudioWorkletNode(
        this.audioContext,
        workletName
      );

      this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
        // Worklet processes recording floats and messages converted buffer
        const arrayBuffer = ev.data.data.int16arrayBuffer;

        if (arrayBuffer) {
          const arrayBufferString = arrayBufferToBase64(arrayBuffer);
          // FIX: Changed this.emit to this.emitter.emit
          this.emitter.emit('data', arrayBufferString);
        }
      };
      gainNode.connect(this.recordingWorklet);
      
      // vu meter worklet
      const vuWorkletName = 'vu-meter';
      await this.audioContext.audioWorklet.addModule(
        createWorketFromSrc(vuWorkletName, VolMeterWorket)
      );
      this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
      this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
        // FIX: Changed this.emit to this.emitter.emit
        this.emitter.emit('volume', ev.data.volume);
      };
      
      gainNode.connect(this.vuWorklet);
      this.recording = true;
      resolve();
      this.starting = null;
    });
  }

  stop() {
    // It is plausible that stop would be called before start completes,
    // such as if the Websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}