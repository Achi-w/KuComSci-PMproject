// Global array to store uploaded image URLs
let uploadedImageUrls = [];

// Helper function to strip HTML tags for search filtering
function stripHTML(html) {
  let tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
}

let announcements = [];
let deleteId = null;
let currentUser = {};

document.addEventListener("DOMContentLoaded", () => {
  // Fetch announcements and user data when the page loads
  fetchAnnouncements();

  document.getElementById("searchBar").addEventListener("input", filterAnnouncements);
  document.getElementById("postBtn").addEventListener("click", openPostModal);

  document.getElementById("cancelPost").addEventListener("click", function () {
    // When cancelling, delete all uploaded images for this post.
    if (uploadedImageUrls.length > 0) {
      uploadedImageUrls.forEach(url => {
        fetch("/deleteImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url })
        })
          .then(res => res.json())
          .then(() => {
            console.log("Deleted image:", url);
          })
          .catch(err => console.error("Error deleting image:", err));
      });
      uploadedImageUrls = [];
    }
    closePostModal();
  });

  document.getElementById("postNow").addEventListener("click", function () {
    const headline = document.getElementById("postHeadline").value.trim();
    const detail = document.getElementById("postDetail").value.trim();
    if (!headline || !detail) {
      openValidationModal();
    } else {
      openPostConfirmModal();
    }
  });

  document.getElementById("cancelPostConfirm").addEventListener("click", closePostConfirmModal);
  document.getElementById("confirmPost").addEventListener("click", handlePost);
  document.getElementById("confirmPostSuccess").addEventListener("click", closePostSuccessModal);
  document.getElementById("cancelDelete").addEventListener("click", closeDeleteConfirmModal);
  document.getElementById("confirmDelete").addEventListener("click", handleDelete);
  document.getElementById("confirmDeleteSuccess").addEventListener("click", closeDeleteSuccessModal);

  // When Upload Image button is clicked, trigger file selection
  const uploadBtn = document.getElementById("uploadImageBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      document.getElementById("uploadImageInput").click();
    });
  } else {
    console.error("Upload Image button not found");
  }

  // When a file is selected, upload it immediately and store its URL
  const uploadInput = document.getElementById("uploadImageInput");
  if (uploadInput) {
    uploadInput.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("image", file);
      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          if (data.imageUrl) {
            uploadedImageUrls.push(data.imageUrl);
            console.log("Image uploaded:", data.imageUrl);
            const textarea = document.getElementById("postDetail");
            textarea.value += "\n<img src='" + data.imageUrl + "' alt='Announcement Image'>";
          }
        })
        .catch(err => console.error(err));
      // Clear the file input so the same file can be reselected later.
      this.value = "";
    });
  }

  // Retrieve the logged-in user from the dashboard route
  fetch("/dashboard")
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        document.getElementById("userName").textContent =
          currentUser.USER_Name + " " + currentUser.USER_Surname;
        if (currentUser.USER_Role.toLowerCase() === "student") {
          document.getElementById("roleTitle").textContent = "Nisit Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
        } else if (["teacher", "professor"].includes(currentUser.USER_Role.toLowerCase())) {
          document.getElementById("roleTitle").textContent = "Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
        } else if (currentUser.USER_Role.toLowerCase() === "admin") {
          document.getElementById("roleTitle").textContent = "Admin - ภาควิชาวิทยาการคอมพิวเตอร์";
        }
        if (["teacher", "professor", "admin"].includes(currentUser.USER_Role.toLowerCase())) {
          document.getElementById("postBtn").style.display = "inline-block";
        }
      } else {
        console.error("User not authenticated");
      }
    })
    .catch(err => console.error(err));

  // Logout button event – when clicked, call the logout route, clear local data, and redirect to login.
  document.getElementById("logoutBtn").addEventListener("click", () => {
    fetch("/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          currentUser = {};
          announcements = [];
          window.location.href = "index.html"; // redirect to login page
        } else {
          console.error("Logout failed.");
        }
      })
      .catch(err => console.error("Error during logout:", err));
  });
});

function openValidationModal() {
  document.getElementById("validationModal").style.display = "block";
}
function closeValidationModal() {
  document.getElementById("validationModal").style.display = "none";
}
document.getElementById("confirmValidation").addEventListener("click", closeValidationModal);

function fetchAnnouncements() {
  fetch("/announcements")
    .then(res => res.json())
    .then(data => {
      announcements = data;
      renderAnnouncements(announcements);
    })
    .catch(err => console.error(err));
}

function renderAnnouncements(list) {
  const container = document.getElementById("announcementsContainer");
  container.innerHTML = "";
  list.forEach(a => {
    const div = document.createElement("div");
    div.className = "announcement";
    const header = document.createElement("div");
    header.className = "announcement-header";
    header.innerHTML = `
      <p><strong>${a.first_name} ${a.last_name} (${a.role})</strong> | ${a.date}</p>
      <h4>${a.headline}</h4>
    `;
    div.appendChild(header);
    const detailContainer = document.createElement("div");
    detailContainer.className = "announcement-detail";
    detailContainer.style.display = "none";
    detailContainer.innerHTML = `<p>${a.detail}</p>`;
    div.appendChild(detailContainer);
    header.addEventListener("click", () => {
      detailContainer.style.display = (detailContainer.style.display === "none") ? "block" : "none";
    });
    if (currentUser && currentUser.USER_ID === a.user_id && currentUser.USER_Role.toLowerCase() !== "student") {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteId = a.id;
        openDeleteConfirmModal();
      });
      div.appendChild(deleteBtn);
    }
    container.appendChild(div);
  });
}

function filterAnnouncements() {
  const searchValue = document.getElementById("searchBar").value.toLowerCase();
  const filtered = announcements.filter(a =>
    ((a.first_name + " " + a.last_name).toLowerCase().includes(searchValue)) ||
    a.headline.toLowerCase().includes(searchValue) ||
    stripHTML(a.detail).toLowerCase().includes(searchValue) ||
    a.role.toLowerCase().includes(searchValue) ||
    a.date.toLowerCase().includes(searchValue)
  );
  renderAnnouncements(filtered);
}

function openPostModal() {
  // Clear fields when opening the modal
  document.getElementById("postHeadline").value = "";
  document.getElementById("postDetail").value = "";
  uploadedImageUrls = [];
  document.getElementById("postAuthor").value = currentUser ? currentUser.USER_ID : "";
  document.getElementById("postRole").textContent = currentUser ? currentUser.USER_Role : "";
  document.getElementById("postDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("postModal").style.display = "block";
}
function closePostModal() {
  document.getElementById("postModal").style.display = "none";
}
function openPostConfirmModal() {
  document.getElementById("postConfirmModal").style.display = "block";
}
function closePostConfirmModal() {
  document.getElementById("postConfirmModal").style.display = "none";
}
function openPostSuccessModal() {
  document.getElementById("postSuccessModal").style.display = "block";
}
function closePostSuccessModal() {
  document.getElementById("postSuccessModal").style.display = "none";
  closePostModal();
  closePostConfirmModal();
}
function openDeleteConfirmModal() {
  document.getElementById("deleteConfirmModal").style.display = "block";
}
function closeDeleteConfirmModal() {
  document.getElementById("deleteConfirmModal").style.display = "none";
  deleteId = null;
}
function openDeleteSuccessModal() {
  document.getElementById("deleteSuccessModal").style.display = "block";
}
function closeDeleteSuccessModal() {
  document.getElementById("deleteSuccessModal").style.display = "none";
}

function handlePost() {
  const author = document.getElementById("postAuthor").value;
  const date = document.getElementById("postDate").value;
  const headline = document.getElementById("postHeadline").value;
  let detail = document.getElementById("postDetail").value;
  postAnnouncement(author, date, headline, detail);
}

function postAnnouncement(author, date, headline, detail) {
  fetch("/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author,
      user_name: currentUser.USER_Name,
      user_surname: currentUser.USER_Surname,
      user_role: currentUser.USER_Role,
      date,
      headline,
      detail
    })
  })
    .then(res => res.json())
    .then(newAnnouncement => {
      announcements.push(newAnnouncement);
      renderAnnouncements(announcements);
      openPostSuccessModal();
    })
    .catch(err => {
      console.error(err);
      alert("Error posting announcement.");
    });
}

function handleDelete() {
  fetch("/announcements/" + deleteId, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentUserId: currentUser.USER_ID,
      currentUserRole: currentUser.USER_Role
    })
  })
    .then(res => res.json())
    .then(() => {
      announcements = announcements.filter(a => a.id !== deleteId);
      renderAnnouncements(announcements);
      closeDeleteConfirmModal();
      openDeleteSuccessModal();
    })
    .catch(err => console.error(err));
}
