export interface LinearAttachment {
  id: string;
  url: string;
  title?: string;
  size?: number;
  contentType?: string;
  createdAt?: string;
}

export interface LinearIssue {
  id: string;
  title: string;
  description: string;
  url: string;
  status?: string;
  priority?: number;
  assignee?: {
    id: string;
    name: string;
    email?: string;
  };
  attachments?: LinearAttachment[];
  labels?: {
    id: string;
    name: string;
    color?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}
