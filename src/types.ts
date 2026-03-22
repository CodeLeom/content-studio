export type CreatorProfile = {
  platforms: string[];
  niche: string;
  postingFrequency: string;
  contentStyle: string;
  tone: string;
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
