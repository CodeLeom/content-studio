export type CreatorProfile = {
  platforms: string[];
  niche: string;
  postingFrequency: string;
  /** How many posts to generate in one calendar batch (e.g. 30 for a month). */
  calendarPostCount: number;
  contentStyle: string;
  /** Empty means use the recommended default tone mix when generating content. */
  tones: string[];
};

export type CalendarItem = {
  title: string;
  platform: string;
  scheduledDate: string;
};

export type PipelineRow = {
  pageId: string;
  title: string;
  status: string;
  platform: string;
  scheduledDate: string;
  hook?: string;
  script?: string;
  repurposedOutputs?: string;
};
