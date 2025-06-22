import axios, { AxiosInstance } from "axios";
import {
  getJWTFromLocalStorage,
  setJWTToLocalStorage,
  clearJWTFromLocalStorage,
} from "./auth";

class Http {
  instance: AxiosInstance;
  private access_token: string;

  constructor() {
    this.access_token = getJWTFromLocalStorage();
    this.instance = axios.create({
      baseURL: "https://vdt-dms-backend.onrender.com", // Thay bằng link backend của m, thường là thay sau khi host, cứ để tạm r host được backend r thay sau
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.instance.interceptors.request.use(
      (config) => {
        config.headers.Authorization = `Bearer ${this.access_token}`;
        return config;
      },
      (errors) => {
        return Promise.reject(errors);
      }
    );

    this.instance.interceptors.response.use(
      (response) => {
        const { url } = response.config;

        if (url === "/auth/login" || url === "/auth/register") {
          try {
            const { token } = response.data;
            this.access_token = token;
            setJWTToLocalStorage(token);
          } catch (error) {
            console.log(error);
          }
        } else if (url === "/auth/logout") {
          this.access_token = "";
          clearJWTFromLocalStorage();
        }
        return response;
      },
      (errors) => {
        return Promise.reject(errors);
      }
    );
  }
}

const http = new Http().instance;
export default http;
