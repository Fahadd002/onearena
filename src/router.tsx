// @ts-expect-error The package is provided by the application's dependency setup.
import { QueryClient } from "@tanstack/react-query";
// @ts-expect-error The package is provided by the application's dependency setup.

import { createRouter } from "@tanstack/react-routr";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
