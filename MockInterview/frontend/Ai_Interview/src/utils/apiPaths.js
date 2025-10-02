export const API_PATHS = {
  QUESTIONS: "/questions",
  CUSTOM_QUESTIONS: "/custom-questions",
  INTERVIEWS: "/interviews",
  AUTH: {
    REGISTER: "/user/register",
    LOGIN: "/user/login",
    PROFILE: "/user/profile",
  },
  USER: {
    PROFILE_LIST: (sessionId) => `/user/profile/${sessionId}`,
    PROFILE_DETAIL: (sessionId, videoNo) => `/user/profile/${sessionId}/${videoNo}`,
  },
  VIDEOS: {
    STREAM: (videoNo) => `/videos/stream/${videoNo}`,
  },
};
