(()=>{
  // Dark Mode is the project default. A saved Light Mode preference is still respected.
  const saved = localStorage.getItem("familyTheme");
  const useDark = saved !== "light";
  if (useDark) document.documentElement.classList.add("dark");

  window.toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "familyTheme",
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  };
})();
