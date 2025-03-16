document
  .getElementById("auth-form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent default form submission

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "announcement.html"; // :white_check_mark: Redirect on success
        } else {
          alert("Invalid username or password.");
        }
      })
      .catch((error) => console.error("Error:", error));
  });
