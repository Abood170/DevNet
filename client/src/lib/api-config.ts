

export const API_BASE_URL = "/api";

export const API_ENDPOINTS = {
  
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  LOGOUT: `${API_BASE_URL}/logout`,
  USER: `${API_BASE_URL}/user`,

  
  USERS: `${API_BASE_URL}/users`,
  USER_BY_ID: (id: number | string) => `${API_BASE_URL}/users/${id}`,
  USER_DISABLE: (id: number) => `${API_BASE_URL}/users/${id}/disable`,
  USER_ENABLE: (id: number) => `${API_BASE_URL}/users/${id}/enable`,
  USER_ROLE: (id: number) => `${API_BASE_URL}/users/${id}/role`,

  
  POSTS: `${API_BASE_URL}/posts`,
  POST_BY_ID: (id: number) => `${API_BASE_URL}/posts/${id}`,
  MY_POSTS: `${API_BASE_URL}/posts/my`,

  
  JOBS: `${API_BASE_URL}/jobs`,
  JOB_BY_ID: (id: number) => `${API_BASE_URL}/jobs/${id}`,
  MY_JOBS: `${API_BASE_URL}/jobs/my`,
  JOB_COMMENTS: (id: number) => `${API_BASE_URL}/jobs/${id}/comments`,
  JOB_COMMENT_BY_ID: (id: number) => `${API_BASE_URL}/jobs/comments/${id}`,
  JOB_APPLY: (id: number) => `${API_BASE_URL}/jobs/${id}/apply`,
  JOB_APPLICATIONS: (id: number) => `${API_BASE_URL}/jobs/${id}/applications`,
  JOB_APPLIED: (id: number) => `${API_BASE_URL}/jobs/${id}/applied`,
  MY_APPLICATIONS: `${API_BASE_URL}/applications/my`,
  EMPLOYER_APPLICATIONS: `${API_BASE_URL}/applications/employer`,
  APPLICATION_BY_ID: (id: number) => `${API_BASE_URL}/applications/${id}`,
  APPLICATION_APPROVE: (id: number) => `${API_BASE_URL}/applications/${id}/approve`,
  APPLICATION_REJECT: (id: number) => `${API_BASE_URL}/applications/${id}/reject`,

  
  PROFILE: `${API_BASE_URL}/profile`,
  PROFILE_CV_UPLOAD: `${API_BASE_URL}/profile/cv`,
  PROFILE_CV_DELETE: `${API_BASE_URL}/profile/cv`,
  PROFILE_AVATAR_UPLOAD: `${API_BASE_URL}/profile/avatar`,
  PROFILE_AVATAR_DELETE: `${API_BASE_URL}/profile/avatar`,
  CV_DOWNLOAD: (filename: string) => `${API_BASE_URL}/cvs/${filename}`,
  AVATAR_DOWNLOAD: (filename: string) => `${API_BASE_URL}/avatars/${filename}`,

  
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATIONS_UNREAD_COUNT: `${API_BASE_URL}/notifications/unread-count`,
  NOTIFICATIONS_MARK_ALL_READ: `${API_BASE_URL}/notifications/mark-all-read`,
  NOTIFICATION_READ: (id: number) => `${API_BASE_URL}/notifications/${id}/read`,

  
  MESSAGES_CONVERSATIONS: `${API_BASE_URL}/messages/conversations`,
  MESSAGES_WITH_USER: (userId: number) => `${API_BASE_URL}/messages/${userId}`,
  MESSAGES_SEND: `${API_BASE_URL}/messages`,
  MESSAGES_MARK_READ: (userId: number) => `${API_BASE_URL}/messages/${userId}/read`,
  MESSAGES_UNREAD_COUNT: `${API_BASE_URL}/messages/unread/count`,
} as const;
