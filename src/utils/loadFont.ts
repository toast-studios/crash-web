// Load them google fonts before starting...
export const loadFont = (callback: () => void) => {
  (window as unknown as { WebFontConfig: unknown }).WebFontConfig = {
    google: {
      families: ["Snippet"],
    },
    active() {
      callback();
    },
  };
};

(function () {
  const wf = document.createElement("script");
  wf.src = `${
    document.location.protocol === "https:" ? "https" : "http"
  }://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js`;
  wf.type = "text/javascript";
  wf.async = true;
  const s = document.getElementsByTagName("script")[0];
  s?.parentNode?.insertBefore(wf, s);
})();
