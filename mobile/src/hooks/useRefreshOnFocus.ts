import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

export const useRefreshOnFocus = (
  refetch: () => Promise<void> | void,
): void => {
  const firstRender = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstRender.current) {
        // Skip first render; initial load handles first fetch.
        firstRender.current = false;
        return;
      }

      // Silent refresh on every subsequent focus.
      void refetch();
    }, [refetch]),
  );
};
