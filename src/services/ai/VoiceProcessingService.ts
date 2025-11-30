import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { SpeechClient, protos } from '@google-cloud/speech';
import { logger } from '../../config/logger';

export interface VoiceTranscriptionOptions {
  mimeType?: string;
  language?: string;
  sampleRate?: number;
}

export interface VoiceTranscriptionResult {
  text: string;
  query: string;
  confidence: number;
  languageCode: string;
  suggestions: string[];
}

interface VoiceProcessingOptions {
  keyFilename?: string;
}

type AudioEncoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

export class VoiceProcessingService extends EventEmitter {
  private readonly languageHints: string[];
  private readonly defaultLanguage: string;
  private readonly client: SpeechClient | null;
  private readonly enabled: boolean;

  constructor(options: VoiceProcessingOptions = {}) {
    super();
    this.languageHints = (process.env.VOICE_LANGUAGE_HINTS || 'en-IN,hi-IN')
      .split(',')
      .map(code => code.trim())
      .filter(Boolean);
    this.defaultLanguage = process.env.VOICE_DEFAULT_LANGUAGE || 'en-IN';

    let client: SpeechClient | null = null;
    try {
      const config: { keyFilename?: string } = {};
      const candidate = options.keyFilename || process.env.GOOGLE_CLOUD_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (candidate) {
        const resolved = path.resolve(candidate);
        if (fs.existsSync(resolved)) {
          config.keyFilename = resolved;
        } else {
          logger.warn(`VoiceProcessingService: key file not found at ${resolved}`);
        }
      }
      client = new SpeechClient(config);
      logger.info('VoiceProcessingService: Google Cloud Speech client ready');
    } catch (error) {
      logger.error('VoiceProcessingService: failed to initialize Google Cloud Speech client', error);
    }
    this.client = client;
    this.enabled = Boolean(client);
  }

  private normaliseLanguage(language?: string): string {
    if (!language) {
      return this.defaultLanguage;
    }
    const lowered = language.toLowerCase();
    if (lowered.includes('-')) {
      const exact = lowered.replace('_', '-');
      return exact;
    }
    return `${lowered}-IN`;
  }

  private detectEncoding(mimeType?: string): AudioEncoding {
    if (!mimeType) {
      return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED;
    }
    const value = mimeType.toLowerCase();
    if (value.includes('ogg') || value.includes('opus')) {
      return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS;
    }
    if (value.includes('wav')) {
      return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16;
    }
    if (value.includes('flac')) {
      return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC;
    }
    if (value.includes('mp3') || value.includes('mpeg')) {
      return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3;
    }
    return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED;
  }

  async transcribeAudio(audioBuffer: Buffer, options: VoiceTranscriptionOptions = {}): Promise<VoiceTranscriptionResult | null> {
    if (!audioBuffer.length) {
      return null;
    }

    if (!this.enabled || !this.client) {
      logger.warn('VoiceProcessingService: transcription requested while service disabled');
      return {
        text: '',
        query: '',
        confidence: 0,
        languageCode: this.defaultLanguage,
        suggestions: []
      };
    }

    try {
      const audioBytes = audioBuffer.toString('base64');
      const languageCode = this.normaliseLanguage(options.language);
      const alternativeLanguageCodes = this.languageHints
        .map(code => this.normaliseLanguage(code))
        .filter(code => code !== languageCode)
        .slice(0, 3);

    const encoding = this.detectEncoding(options.mimeType);

    const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
      audio: { content: audioBytes },
      config: {
        languageCode,
        alternativeLanguageCodes,
        enableAutomaticPunctuation: true,
        audioChannelCount: 1,
        model: 'latest_long',
        encoding
      }
    };

    if (options.sampleRate) {
      request.config!.sampleRateHertz = options.sampleRate;
    } else if (encoding === protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS) {
      request.config!.sampleRateHertz = 16000;
    }

      const [response] = await this.client.recognize(request);
      if (!response.results || response.results.length === 0) {
        return {
          text: '',
          query: '',
          confidence: 0,
          languageCode,
          suggestions: []
        };
      }

      const bestAlternative = response.results[0].alternatives?.[0];
      const text = bestAlternative?.transcript ?? '';
      return {
        text,
        query: text,
        confidence: bestAlternative?.confidence ?? 0,
        languageCode,
        suggestions: response.results
          .flatMap(result => result.alternatives?.map(alt => alt.transcript) ?? [])
          .filter(Boolean) as string[]
      };
    } catch (error) {
      logger.error('VoiceProcessingService: transcription error', error);
      return {
        text: '',
        query: '',
        confidence: 0,
        languageCode: this.defaultLanguage,
        suggestions: []
      };
    }
  }

  async processVoiceMessage(audioBuffer: Buffer, userId: string, options: VoiceTranscriptionOptions = {}): Promise<{
    query: string;
    confidence: number;
    intent: string;
    suggestions: string[];
  } | null> {
    const transcript = await this.transcribeAudio(audioBuffer, options);
    if (!transcript) {
      return null;
    }

    const payload = {
      userId,
      transcript: transcript.text,
      result: {
        query: transcript.query,
        confidence: transcript.confidence,
        intent: 'search_products' as const,
        suggestions: transcript.suggestions
      }
    };

    this.emit('voiceProcessed', payload);
    return payload.result;
  }

  async generateVoiceResponse(voiceResult: any, searchResults: any[]): Promise<string> {
    const query = voiceResult?.query || 'your request';
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      const top = searchResults[0];
      const title = top?.title || top?.name || 'a matching product';
      return `I heard "${query}". The best match I found is ${title}.`;
    }
    return `I heard you say "${query}". Let me keep looking for the best deals.`;
  }

  destroy(): void {
    this.removeAllListeners();
    logger.info('VoiceProcessingService destroyed');
  }
}

export default VoiceProcessingService;
