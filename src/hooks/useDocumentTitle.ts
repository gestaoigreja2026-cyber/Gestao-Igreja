import { useEffect } from 'react';

const BASE_TITLE = 'Gestão Igreja';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (title === BASE_TITLE) {
      document.title = BASE_TITLE;
    } else {
      document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    }
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
