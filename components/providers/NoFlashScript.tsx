const SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("movo-theme");
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }

    var locale = localStorage.getItem("movo-locale");
    if (locale === "en") {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
  } catch (e) {}
})();
`;

export function NoFlashScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
