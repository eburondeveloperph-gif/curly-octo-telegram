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

const VolMeterWorket = `
  class VolMeter extends AudioWorkletProcessor {
    volume
    updateIntervalInMS
    nextUpdateFrame
    peakVolume
    averageVolume

    constructor() {
      super()
      this.volume = 0
      this.peakVolume = 0
      this.averageVolume = 0
      this.updateIntervalInMS = 5 // Ultra-fast updates for instant real-time transcription
      this.nextUpdateFrame = this.updateIntervalInMS
      this.port.onmessage = event => {
        if (event.data.updateIntervalInMS) {
          this.updateIntervalInMS = event.data.updateIntervalInMS
        }
      }
    }

    get intervalInFrames() {
      return (this.updateIntervalInMS / 1000) * sampleRate
    }

    process(inputs) {
      const input = inputs[0]

      if (input.length > 0) {
        const samples = input[0]
        let sum = 0
        let rms = 0
        let peak = 0

        // Calculate RMS and peak values for better accuracy
        for (let i = 0; i < samples.length; ++i) {
          const sample = samples[i]
          sum += sample * sample
          peak = Math.max(peak, Math.abs(sample))
        }

        rms = Math.sqrt(sum / samples.length)
        
        // Ultra-fast volume calculation for instant transcription
        const smoothedRms = Math.max(rms, this.averageVolume * 0.3) // Minimal smoothing for instant response
        this.averageVolume = smoothedRms
        
        // Peak detection with ultra-fast decay
        this.peakVolume = Math.max(peak, this.peakVolume * 0.8) // Faster decay for instant response
        
        // Final volume with maximum sensitivity
        this.volume = Math.max(smoothedRms, this.peakVolume * 0.2) // Higher sensitivity for instant pickup

        this.nextUpdateFrame -= samples.length
        if (this.nextUpdateFrame < 0) {
          this.nextUpdateFrame += this.intervalInFrames
          this.port.postMessage({
            volume: this.volume,
            peak: this.peakVolume,
            average: this.averageVolume
          })
        }
      }

      return true
    }
  }`;

export default VolMeterWorket;
