document.addEventListener("DOMContentLoaded", function () {
  fetch("http://localhost:3000/dashboard")
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        window.location.href = "index.html"; // :white_check_mark: Redirect to login if not authenticated
      } else {
        document.getElementById(
          "welcome"
        ).innerText = `Welcome, ${data.username}!`;
      }
    });

  document.getElementById("logout").addEventListener("click", function () {
    fetch("http://localhost:3000/logout", { method: "POST" }).then(
      () => (window.location.href = "index.html")
    ); // :white_check_mark: Redirect to login after logout
  });
});
