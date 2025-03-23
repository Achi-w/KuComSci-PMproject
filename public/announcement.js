// announcement.js

// Global variables
let selectedImageFiles = [];
let announcements = [];
let deleteId = null;
let currentUser = {};
let postingInProgress = false; // flag to prevent duplicate submissions

// Constants for limits
const MAX_TEXT_LENGTH = 1400;
const MAX_IMAGES = 5;
const MAX_HEADLINE_LENGTH = 200;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

// Helper: Convert binary image data (an array of bytes) to a base64 string.
function convertImageDataToBase64(imageData) {
  let binary = "";
  for (let i = 0; i < imageData.length; i++) {
    binary += String.fromCharCode(imageData[i]);
  }
  return window.btoa(binary);
}

document.addEventListener("DOMContentLoaded", () => {
  // Check session—if not authenticated, redirect to login page.
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

  // Validate on clicking "โพสต์เลย"
  document.getElementById("postNow").addEventListener("click", () => {
    const headline = document.getElementById("postHeadline").value.trim();
    const detailText = document.getElementById("postDetail").innerText.trim();
    // Allow post if effective text length is exactly MAX_TEXT_LENGTH.
    if (!headline || !detailText) {
      openValidationModal();
    } else if (
      headline.length > MAX_HEADLINE_LENGTH ||
      getEffectiveTextLength() > MAX_TEXT_LENGTH || // Changed: using > instead of >=
      selectedImageFiles.length > MAX_IMAGES
    ) {
      openLimitExceededModal();
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

  // When a file is selected, check size and count, then insert a non-editable placeholder.
  const uploadInput = document.getElementById("uploadImageInput");
  if (uploadInput) {
    uploadInput.addEventListener("change", function () {
      if (!this.files.length) return;
      const file = this.files[0];
      if (file.size > MAX_IMAGE_SIZE) {
        openImageSizeTooLargeModal();
        this.value = "";
        return;
      }
      if (selectedImageFiles.length >= MAX_IMAGES) {
        openImageLimitModal();
        this.value = "";
        return;
      }
      selectedImageFiles.push(file);
      insertImagePlaceholder();
      updateTextCounter();
      updateImageCounter();
      console.log("Image file queued and placeholder inserted:", file.name);
      this.value = "";
    });
  }

  // Update text counter as user types.
  const postDetailDiv = document.getElementById("postDetail");
  postDetailDiv.addEventListener("input", updateTextCounter);
  // Prevent further input if effective length has reached MAX_TEXT_LENGTH.
  postDetailDiv.addEventListener("keydown", function(event) {
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Tab"];
    if (allowedKeys.includes(event.key)) return;
    if (getEffectiveTextLength() >= MAX_TEXT_LENGTH) {
      event.preventDefault();
    }
  });

  // Update headline counter as user types.
  const postHeadlineInput = document.getElementById("postHeadline");
  postHeadlineInput.addEventListener("input", updateHeadlineCounter);
  updateHeadlineCounter();

  // Populate user info.
  document.getElementById("userName").textContent =
    currentUser.USER_Name + " " + currentUser.USER_Surname;
  if (currentUser.USER_Role.toLowerCase() === "student") {
    document.getElementById("roleTitle").textContent =
      "Nisit Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
    const bookingLink = document.getElementById("bookingLink");
    if (bookingLink) bookingLink.textContent = "ห้องเรียนและห้องสอบ";
  } else if (["teacher", "professor"].includes(currentUser.USER_Role.toLowerCase())) {
    document.getElementById("roleTitle").textContent =
      "Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
  } else if (currentUser.USER_Role.toLowerCase() === "admin") {
    document.getElementById("roleTitle").textContent =
      "Admin Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
  }
  if (["teacher", "professor", "admin"].includes(currentUser.USER_Role.toLowerCase())) {
    document.getElementById("postBtn").style.display = "inline-block";
  }
}

function updateHeadlineCounter() {
  const headlineInput = document.getElementById("postHeadline");
  let counter = document.getElementById("headlineCounter");
  if (!counter) {
    counter = document.createElement("div");
    counter.id = "headlineCounter";
    counter.style.textAlign = "right";
    counter.style.fontSize = "0.9rem";
    counter.style.color = "#ffffff";
    headlineInput.parentNode.insertBefore(counter, headlineInput.nextSibling);
  }
  const remaining = MAX_HEADLINE_LENGTH - headlineInput.value.length;
  counter.textContent = "จำนวนตัวอักษรที่ใส่เพิ่มในหัวเรื่องได้: " + remaining;
  if (remaining < 0) {
    headlineInput.style.borderColor = "red";
  } else {
    headlineInput.style.borderColor = "";
  }
}

function insertImagePlaceholder() {
  const postDetailDiv = document.getElementById("postDetail");
  postDetailDiv.focus();
  const placeholder = document.createElement("span");
  placeholder.className = "img-placeholder";
  placeholder.setAttribute("contenteditable", "false");
  placeholder.textContent = "[Image]";
  let sel, range;
  if (window.getSelection && (sel = window.getSelection()).rangeCount) {
    range = sel.getRangeAt(0);
    if (!postDetailDiv.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(postDetailDiv);
      range.collapse(false);
    }
    range.insertNode(placeholder);
    range.setStartAfter(placeholder);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    postDetailDiv.appendChild(placeholder);
  }
}

function getEffectiveTextLength() {
  const postDetailDiv = document.getElementById("postDetail");
  let effectiveLength = 0;
  postDetailDiv.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      effectiveLength += node.nodeValue.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!node.classList.contains("img-placeholder")) {
        effectiveLength += node.innerText.length;
      }
    }
  });
  return effectiveLength;
}

function updateTextCounter() {
  const effectiveLength = getEffectiveTextLength();
  const remaining = MAX_TEXT_LENGTH - effectiveLength;
  let counter = document.getElementById("textCounter");
  if (!counter) {
    counter = document.createElement("div");
    counter.id = "textCounter";
    counter.style.textAlign = "right";
    counter.style.fontSize = "0.9rem";
    counter.style.color = "#ffffff";
    document.getElementById("postDetail").parentNode.insertBefore(counter, document.getElementById("postDetail").nextSibling);
  }
  counter.textContent = "จำนวนตัวอักษรที่ใส่เพิ่มในลายละเอียดประกาศได้: " + remaining;
  const postDetailDiv = document.getElementById("postDetail");
  if (remaining < 0) {
    postDetailDiv.style.borderColor = "red";
  } else {
    postDetailDiv.style.borderColor = "";
  }
}

function updateImageCounter() {
  let counter = document.getElementById("imageCounter");
  if (!counter) {
    counter = document.createElement("div");
    counter.id = "imageCounter";
    counter.style.textAlign = "right";
    counter.style.fontSize = "0.9rem";
    counter.style.color = "#ffffff";
    const uploadSection = document.getElementById("uploadImageBtn").parentNode;
    uploadSection.appendChild(counter);
  }
  counter.textContent = "จำนวนรูปที่เพิ่มในประกาศแล้ว: " + selectedImageFiles.length + "/" + MAX_IMAGES;
  counter.style.color = selectedImageFiles.length > MAX_IMAGES ? "red" : "#ffffff";
}

function openValidationModal() {
  document.getElementById("validationModal").style.display = "flex";
}
function closeValidationModal() {
  document.getElementById("validationModal").style.display = "none";
}
document.getElementById("confirmValidation").addEventListener("click", closeValidationModal);

function openLimitExceededModal() {
  let modal = document.getElementById("limitExceededModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "limitExceededModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <p>ไม่สามารถโพสได้ขนาดโพสต์เกินกำหนด</p>
        <button id="confirmLimitExceeded" class="popup-button confirm-button">ยืนยัน</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("confirmLimitExceeded").addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
  modal.style.display = "flex";
}

function openImageLimitModal() {
  let modal = document.getElementById("imageLimitModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imageLimitModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <p>ไม่สามารถอัปโหลดรูปได้มากกว่า ${MAX_IMAGES} รูป</p>
        <button id="confirmImageLimit" class="popup-button confirm-button">ยืนยัน</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("confirmImageLimit").addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
  modal.style.display = "flex";
}

function openImageSizeTooLargeModal() {
  let modal = document.getElementById("imageSizeModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imageSizeModal";
    modal.className = "modal";
    const maxMB = MAX_IMAGE_SIZE / (1024 * 1024);
    modal.innerHTML = `
      <div class="modal-content">
        <p>ขนาดของรูปภาพใหญ่เกินไป (ไม่เกิน ${maxMB} MB)</p>
        <button id="confirmImageSize" class="popup-button confirm-button">ยืนยัน</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("confirmImageSize").addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
  modal.style.display = "flex";
}

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

    // Create poster icon image element.
    const iconImg = document.createElement("img");
    iconImg.style.width = "40px";
    iconImg.style.height = "40px";
    iconImg.style.borderRadius = "50%";
    iconImg.style.marginRight = "8px";
    // Use the announcement object's user_image if available.
    if (a.user_image && a.user_image.data) {
      const base64String = convertImageDataToBase64(a.user_image.data);
      iconImg.src = "data:image/jpeg;base64," + base64String;
    } else if (a.user_image) {
      iconImg.src = a.user_image;
    } else {
      iconImg.src = "default-user-icon.png";
    }
    // Wrap the icon and header in a container for better layout.
    const headerContainer = document.createElement("div");
    headerContainer.style.display = "flex";
    headerContainer.style.alignItems = "center";

    headerContainer.appendChild(iconImg);

    const header = document.createElement("div");
    header.className = "announcement-header";
    header.innerHTML = `
      <p><strong>${a.first_name} ${a.last_name} (${a.role})</strong> | ${a.date}</p>
      <h4>${a.headline}</h4>
    `;
    headerContainer.appendChild(header);
    div.appendChild(headerContainer);

    const detailContainer = document.createElement("div");
    detailContainer.className = "announcement-detail";
    detailContainer.style.display = "none";
    detailContainer.innerHTML = `<p>${a.detail}</p>`;
    div.appendChild(detailContainer);

    headerContainer.addEventListener("click", () => {
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
  document.getElementById("postDetail").innerHTML = "";
  selectedImageFiles = [];
  updateHeadlineCounter();
  updateTextCounter();
  updateImageCounter();
  // Display the user's full name.
  document.getElementById("postAuthor").value = currentUser ? currentUser.USER_Name + " " + currentUser.USER_Surname : "";
  document.getElementById("postRole").textContent = currentUser ? currentUser.USER_Role : "";
  document.getElementById("postDate").value = getThaiDate();

  // Set the user icon for the post modal.
  if (currentUser && currentUser.USER_Image && currentUser.USER_Image.data) {
    const base64String = convertImageDataToBase64(currentUser.USER_Image.data);
    document.getElementById("postUserImage").src = "data:image/jpeg;base64," + base64String;
  } else {
    document.getElementById("postUserImage").src = "default-user-icon.png";
  }
  document.getElementById("postModal").style.display = "flex";
}

function closePostModal() {
  document.getElementById("postModal").style.display = "none";
}

function openPostConfirmModal() {
  document.getElementById("postConfirmModal").style.display = "flex";
}

function closePostConfirmModal() {
  document.getElementById("postConfirmModal").style.display = "none";
}

function openPostSuccessModal() {
  document.getElementById("postSuccessModal").style.display = "flex";
}

function closePostSuccessModal() {
  document.getElementById("postSuccessModal").style.display = "none";
  closePostModal();
  closePostConfirmModal();
}

function openDeleteConfirmModal() {
  document.getElementById("deleteConfirmModal").style.display = "flex";
}

function closeDeleteConfirmModal() {
  document.getElementById("deleteConfirmModal").style.display = "none";
  deleteId = null;
}

function openDeleteSuccessModal() {
  document.getElementById("deleteSuccessModal").style.display = "flex";
}

function closeDeleteSuccessModal() {
  document.getElementById("deleteSuccessModal").style.display = "none";
}

function handlePost() {
  // Prevent duplicate posting.
  if (postingInProgress) return;
  postingInProgress = true;
  document.getElementById("confirmPost").disabled = true; // Disable confirm button

  // Use the actual user id from currentUser (not the displayed full name).
  const author = currentUser ? currentUser.USER_ID : "";
  const date = document.getElementById("postDate").value;
  const headline = document.getElementById("postHeadline").value;
  let detail = document.getElementById("postDetail").innerHTML;
  
  postAnnouncement(author, date, headline, detail)
    .then(() => {
      postingInProgress = false;
      document.getElementById("confirmPost").disabled = false;
    })
    .catch(() => {
      postingInProgress = false;
      document.getElementById("confirmPost").disabled = false;
    });
}

function postAnnouncement(author, date, headline, detail) {
  return fetch("/announcements", {
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
      // Add the current user's image to the new announcement so it shows immediately.
      newAnnouncement.user_image = currentUser.USER_Image;
      announcements.push(newAnnouncement);
      renderAnnouncements(announcements);
      if (selectedImageFiles.length > 0) {
        return uploadImagesForAnnouncement(newAnnouncement.id)
          .then(uploadResults => {
            let updatedDetail = document.getElementById("postDetail").innerHTML;
            // Replace each placeholder sequentially.
            uploadResults.forEach(result => {
              const imgTag = `<img src="/announcements/${newAnnouncement.id}/image/${result.announcementImageId}" alt="Announcement Image">`;
              updatedDetail = updatedDetail.replace(/<span class="img-placeholder"[^>]*>\[Image\]<\/span>/, imgTag);
            });
            return fetch(`/announcements/${newAnnouncement.id}`, {
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
                // Ensure the updated announcement retains the user_image.
                updatedAnnouncement.user_image = currentUser.USER_Image;
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

function getThaiDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}
