import { useRoutes } from "react-router-dom";
import { PATH } from "./constants/path";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import Layout from "./layouts/Layout";
import HomePage from "./pages/Home";
import PrivateRoute from "./guards/PrivateRoute";
import RejectedRoute from "./guards/RejectedRoute";
import UserProfile from "./pages/UserProfile";
import {FolderProvider} from "./context/folder.context";

export default function createRoutes() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const router_elements = useRoutes([
    {
      path: "",
      element: <PrivateRoute />,
      children: [
        {
          path: PATH.userProfile,
          element: (
            <Layout>
              <UserProfile />
            </Layout>
          ),
        },
      ],
    },

    {
      path: "",
      // element: <RejectedRoute />,
      children: [
        {
          path: PATH.login,
          element: <LoginPage />,
        },
        {
          path: PATH.register,
          element: <RegisterPage />,
        },
      ],
    },
    {
      path: PATH.home,
      index: true,
      element: (
        <Layout>
          <FolderProvider>
            <HomePage />
          </FolderProvider>
        </Layout>
      ),
    },
        {
      path: PATH.myDrive,
      index: true,
      element: (
        <Layout>
          <FolderProvider>
            <HomePage />
          </FolderProvider>
        </Layout>
      ),
    },
        {
      path: PATH.shared,
      index: true,
      element: (
        <Layout>
          <FolderProvider>
            <HomePage />
          </FolderProvider>
        </Layout>
      ),
    },
        {
      path: PATH.trash,
      index: true,
      element: (
        <Layout>
          <FolderProvider>
            <HomePage />
          </FolderProvider>
        </Layout>
      ),
    },
    {
      path: PATH.folder(":folderId"),
      index: true,
      element: (
        <Layout>
          <FolderProvider>
            <HomePage />
          </FolderProvider>
        </Layout>
      ),
    },
  ]);

  return router_elements;
}
