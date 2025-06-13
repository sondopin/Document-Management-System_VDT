export const PATH = {
  home: "/",
  myDrive: "/drive/my-drive",
  login: "/login",
  register: "/register",
  userProfile: "/user-profile",
  shared: "/drive/shared",
  trash: "/drive/trash",
  folder: (folderId: string) => `/drive/folders/${folderId}`,
} as const;
