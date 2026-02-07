type AppConfigType = {
  name: string;
  github: {
    title: string;
    url: string;
  };
  author: {
    name: string;
    url: string;
  };
};

export const appConfig: AppConfigType = {
  name: import.meta.env.VITE_APP_NAME ?? "Synoptikon",
  github: {
    title: "Synoptikon",
    url: "https://github.com/hayyi2/synoptikon",
  },
  author: {
    name: "PimpMyPixel",
    url: "https://github.com/pimpmypixel",
  },
};

export const baseUrl = import.meta.env.VITE_BASE_URL ?? "";
