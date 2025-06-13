import { useLocation } from "react-router-dom";

export const useQueryForm = () => {
  const location = useLocation();
  const query = location.state;
  return query;
};
// This hook retrieves the query parameters from the current location state in React Router.
// It can be used to access data passed through navigation, such as form submissions or search queries.