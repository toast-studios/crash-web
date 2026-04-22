/* eslint-disable @typescript-eslint/no-explicit-any */
export const initClarity = () => {
  if (
    window.location.origin.indexOf("staging") === -1 &&
    window.location.origin.indexOf("dev") === -1
  ) {
    (function (
      c: any,
      l: Document,
      a: string,
      r: string,
      i: string,
      t: any,
      y: any,
    ) {
      c[a] =
        c[a] ||
        function (...args: any[]) {
          (c[a].q = c[a].q || []).push(args);
        };

      t = l.createElement(r);
      t.async = 1;
      t.src = `https://www.clarity.ms/tag/${i}`;

      y = l.getElementsByTagName(r)[0];
      y.parentNode?.insertBefore(t, y);
    })(window, document, "clarity", "script", "ntpkcz0xk0", "", null);
  }
};
