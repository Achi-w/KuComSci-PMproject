// announcement.js

// Global variables
let selectedImageFiles = [];
let announcements = [];
let deleteId = null;
let currentUser = {};

// On page load, check session—if not authenticated, redirect to login page.
document.addEventListener("DOMContentLoaded", () => {
  fetch("/dashboard")
    .then(res => {
      if (!res.ok) {
        window.location.href = "/index.html";
      }
      return res.json();
    })
    .then(data => {
      if (!data.success) {
        window.location.href = "/index.html";
      }
      currentUser = data.user;
      initializePage();
    })
    .catch(err => {
      console.error("Session check failed:", err);
      window.location.href = "/index.html";
    });
});

function initializePage() {
  fetchAnnouncements();

  document.getElementById("searchBar").addEventListener("input", filterAnnouncements);
  document.getElementById("postBtn").addEventListener("click", openPostModal);

  document.getElementById("cancelPost").addEventListener("click", () => {
    selectedImageFiles = [];
    closePostModal();
  });

  document.getElementById("postNow").addEventListener("click", () => {
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

  // Set up file selection for image upload.
  const uploadBtn = document.getElementById("uploadImageBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      document.getElementById("uploadImageInput").click();
    });
  } else {
    console.error("Upload Image button not found");
  }

  // When a file is selected, queue it and insert a placeholder.
  const uploadInput = document.getElementById("uploadImageInput");
  if (uploadInput) {
    uploadInput.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      selectedImageFiles.push(file);
      const detailTextarea = document.getElementById("postDetail");
      detailTextarea.value += " [[IMG]] ";
      console.log("Image file queued and placeholder added:", file.name);
      this.value = "";
    });
  }

  // Populate user info on page.
  document.getElementById("userName").textContent = currentUser.USER_Name + " " + currentUser.USER_Surname;
  if (currentUser.USER_Role.toLowerCase() === "student") {
    document.getElementById("roleTitle").textContent = "Nisit Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
    const bookingLink = document.getElementById("bookingLink");
    if (bookingLink) bookingLink.textContent = "ห้องเรียนและห้องสอบ";
  } else if (["teacher", "professor"].includes(currentUser.USER_Role.toLowerCase())) {
    document.getElementById("roleTitle").textContent = "Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
  } else if (currentUser.USER_Role.toLowerCase() === "admin") {
    document.getElementById("roleTitle").textContent = "Admin Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
  }
  if (["teacher", "professor", "admin"].includes(currentUser.USER_Role.toLowerCase())) {
    document.getElementById("postBtn").style.display = "inline-block";
  }
}

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

function stripHTML(html) {
  let tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
}

function openPostModal() {
  document.getElementById("postHeadline").value = "";
  document.getElementById("postDetail").value = "";
  selectedImageFiles = [];
  document.getElementById("postAuthor").value = currentUser ? currentUser.USER_ID : "";
  document.getElementById("postRole").textContent = currentUser ? currentUser.USER_Role : "";
  // Set the date using Thai time (only the date portion)
  document.getElementById("postDate").value = getThaiDate();
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
      if (selectedImageFiles.length > 0) {
        uploadImagesForAnnouncement(newAnnouncement.id)
          .then(uploadResults => {
            let updatedDetail = document.getElementById("postDetail").value;
            uploadResults.forEach(result => {
              const imgTag = `<img src="/announcements/${newAnnouncement.id}/image/${result.announcementImageId}" alt="Announcement Image">`;
              updatedDetail = updatedDetail.replace('[[IMG]]', imgTag);
            });
            fetch(`/announcements/${newAnnouncement.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                headline: newAnnouncement.headline,
                detail: updatedDetail,
                currentUserId: currentUser.USER_ID,
                currentUserRole: currentUser.USER_Role
              })
            })
              .then(res => res.json())
              .then(updatedAnnouncement => {
                announcements = announcements.map(ann =>
                  ann.id === updatedAnnouncement.id ? updatedAnnouncement : ann
                );
                renderAnnouncements(announcements);
                openPostSuccessModal();
              })
              .catch(err => {
                console.error("Error updating announcement detail:", err);
                openPostSuccessModal();
              });
          })
          .catch(err => {
            console.error("Error uploading images:", err);
            openPostSuccessModal();
          });
      } else {
        openPostSuccessModal();
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error posting announcement.");
    });
}

function uploadImagesForAnnouncement(announcementId) {
  let promises = selectedImageFiles.map(file => {
    const formData = new FormData();
    formData.append("image", file);
    return fetch(`/announcements/${announcementId}/uploadImage`, {
      method: "POST",
      body: formData,
    }).then(res => res.json());
  });
  selectedImageFiles = [];
  return Promise.all(promises);
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

// Helper function to get the current date in Thai time (Asia/Bangkok) in YYYY-MM-DD format.
function getThaiDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}
