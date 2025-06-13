export const setJWTToLocalStorage = (token: string) => {
  localStorage.setItem("access_token", token);
};

export const getJWTFromLocalStorage = () => {
  return localStorage.getItem("access_token") || "";
};

export const clearJWTFromLocalStorage = () => {
  localStorage.removeItem("access_token");
};
