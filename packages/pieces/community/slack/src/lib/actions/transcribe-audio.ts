import {
  HttpRequest,
  HttpMethod,
  httpClient,
} from '@activepieces/pieces-common';
import { createAction, Property } from '@activepieces/pieces-framework';
import { slackAuth } from '../../index';
import FormData from 'form-data';
import mime from 'mime-types';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const Languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'th', label: 'Thai' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'hi', label: 'Hindi' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'cs', label: 'Czech' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'el', label: 'Greek' },
  { value: 'he', label: 'Hebrew' },
  { value: 'ro', label: 'Romanian' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'hr', label: 'Croatian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'lv', label: 'Latvian' },
  { value: 'et', label: 'Estonian' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ur', label: 'Urdu' },
  { value: 'fa', label: 'Persian' },
  { value: 'sw', label: 'Swahili' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'cy', label: 'Welsh' },
  { value: 'tl', label: 'Tagalog' },
];

export const transcribeAudioAction = createAction({
  auth: slackAuth,
  name: 'transcribe_audio',
  displayName: 'Transcribe Audio',
  description:
    'Transcribe audio files to text using OpenAI Whisper. Supports mp3, mp4, mpeg, mpga, m4a, ogg, wav, and webm formats.',
  props: {
    openaiApiKey: Property.SecretText({
      displayName: 'OpenAI API Key',
      description:
        'Your OpenAI API key for transcription. Get one at https://platform.openai.com/api-keys',
      required: true,
    }),
    audio: Property.File({
      displayName: 'Audio File',
      description:
        'The audio file to transcribe. Supported formats: mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm (max 25MB)',
      required: true,
    }),
    language: Property.StaticDropdown({
      displayName: 'Language',
      description:
        'The language of the audio. If not specified, Whisper will auto-detect.',
      required: false,
      options: {
        options: Languages,
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description:
        'Optional text to guide the transcription style. Use this to provide context or spelling hints for names, technical terms, etc.',
      required: false,
    }),
    responseFormat: Property.StaticDropdown({
      displayName: 'Response Format',
      description: 'The format of the transcript output',
      required: false,
      defaultValue: 'text',
      options: {
        options: [
          { value: 'text', label: 'Plain Text' },
          { value: 'json', label: 'JSON' },
          { value: 'verbose_json', label: 'Verbose JSON (with timestamps)' },
          { value: 'srt', label: 'SRT (subtitles)' },
          { value: 'vtt', label: 'VTT (web subtitles)' },
        ],
      },
    }),
  },
  async run(context) {
    const { openaiApiKey, audio, language, prompt, responseFormat } =
      context.propsValue;

    // Validate file format
    const supportedFormats = [
      'mp3',
      'mp4',
      'mpeg',
      'mpga',
      'm4a',
      'ogg',
      'wav',
      'webm',
    ];
    const fileExtension = audio.extension?.toLowerCase() || '';
    const mimeType = mime.lookup(fileExtension) || 'audio/mpeg';

    // Check if the file extension is supported
    if (fileExtension && !supportedFormats.includes(fileExtension)) {
      throw new Error(
        `Unsupported audio format: ${fileExtension}. Supported formats: ${supportedFormats.join(', ')}`
      );
    }

    // Build form data for OpenAI API
    const form = new FormData();
    form.append('file', audio.data, {
      filename: audio.filename || `audio.${fileExtension || 'mp3'}`,
      contentType: mimeType as string,
    });
    form.append('model', 'whisper-1');

    if (language) {
      form.append('language', language);
    }

    if (prompt) {
      form.append('prompt', prompt);
    }

    if (responseFormat) {
      form.append('response_format', responseFormat);
    }

    const headers = {
      Authorization: `Bearer ${openaiApiKey}`,
    };

    const request: HttpRequest = {
      method: HttpMethod.POST,
      url: `${OPENAI_BASE_URL}/audio/transcriptions`,
      body: form,
      headers: {
        ...form.getHeaders(),
        ...headers,
      },
    };

    try {
      const response = await httpClient.sendRequest(request);

      // Return appropriate format based on response_format
      if (
        responseFormat === 'text' ||
        responseFormat === 'srt' ||
        responseFormat === 'vtt'
      ) {
        return {
          transcript: response.body,
        };
      }

      // For JSON formats, return the full response object
      return response.body;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error(
          'Invalid OpenAI API key. Please check your API key and try again.'
        );
      }
      if (error?.response?.status === 429) {
        throw new Error(
          'OpenAI API rate limit exceeded or billing issue. Please check your OpenAI account billing and usage limits.'
        );
      }
      if (error?.response?.status === 413) {
        throw new Error(
          'Audio file is too large. Maximum file size is 25MB. Please use a smaller file.'
        );
      }
      throw new Error(`Transcription failed: ${error.message || error}`);
    }
  },
});
