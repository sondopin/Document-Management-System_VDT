import { createContext, useState } from "react";
import { getJWTFromLocalStorage } from "../utils/auth";
interface AppContextInterface {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialAppContext: AppContextInterface = {
  isAuthenticated: Boolean(getJWTFromLocalStorage()),
  setIsAuthenticated: () => null,
};

export const AppContext = createContext<AppContextInterface>(initialAppContext);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    initialAppContext.isAuthenticated
  );

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated: setIsAuthenticated,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
