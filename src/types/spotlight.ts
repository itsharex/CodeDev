import { ReactNode } from 'react';
import { Prompt } from './prompt';

export type SpotlightMode = 'search' | 'chat';

export interface SpotlightItem {
  id: string;
  title: string;
  description?: string;
  content?: string;

  icon?: ReactNode;
  group?: string;

  originalData?: Prompt;

  type: 'prompt' | 'command' | 'action' | 'url' | 'app';

  isExecutable?: boolean;
  shellType?: string;
  url?: string;

  appPath?: string;
}

export interface SpotlightState {
  mode: SpotlightMode;
  query: string;
  chatInput: string;
}