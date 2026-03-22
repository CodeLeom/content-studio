/** Client ↔ API session state (Notion page/database ids). Kept in the browser between actions. */
export type StudioState = {
  hubPageId?: string;
  creatorProfilePageId?: string;
  /** Container database id (Notion database object) */
  contentPipelineDatabaseId?: string;
  /** Primary data source id for queries / row creation */
  contentPipelineDataSourceId?: string;
};
