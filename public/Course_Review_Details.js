const urlParams = new URLSearchParams(window.location.search);
const courseID = urlParams.get('CID');
let currentUser = {};
let announcements = [];

// Elements
const courseNameElement = document.getElementById('course-name');
const courseDescriptionElement = document.getElementById('course-description');
const courseReviewsElement = document.getElementById('course-reviews');
const createReviewButton = document.getElementById('create-review-btn');

// Format date to YYYY-MM-DD
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
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
// Fetch Course and Reviews Data
const fetchCourseDetails = async () => {
    try {
        // Fetch Course details
        const courseResponse = await axios.get(`http://localhost:3000/api/course/${courseID}`);
        const course = courseResponse.data;

        // Display Course Details
        courseNameElement.textContent = `${course.Course_ID} - ${course.Course_Name}`;
        courseDescriptionElement.textContent = course.Course_Detail;

        // Fetch Reviews for the Course
        const reviewResponse = await axios.get(`http://localhost:3000/api/course_review/${courseID}`);
        const reviews = reviewResponse.data.reviews;

        // Calculate Average Rating
        const totalRating = reviews.reduce((sum, review) => sum + review.Review_Course_Rate, 0);
        const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        // Display the Average Rating
        const avgRatingElement = document.createElement('div');
        avgRatingElement.classList.add('avg-rating');
        avgRatingElement.textContent = `คะแนนรวมวิชานี้: ${avgRating.toFixed(1)}/10`;
        courseReviewsElement.prepend(avgRatingElement); // Show at the top of reviews

        // Display Reviews
        if (reviews.length === 0) {
            courseReviewsElement.innerHTML = "<p>No reviews yet for this course.</p>";
            return;
        }

        for (const review of reviews) {
            try {
                // Fetch User Name for the review
                const userResponse = await axios.get(`http://localhost:3000/api/user/${review.USER_ID}`);
                const user = userResponse.data;
                const formattedDate = formatDate(review.Review_Course_Date);

                // Create Review Elements
                const reviewDiv = document.createElement('div');
                reviewDiv.classList.add('review-item');

                // Review Header (User Name, Date, Rating)
                const reviewHeader = document.createElement('div');
                reviewHeader.classList.add('review-header');
                reviewHeader.innerHTML = `
                    <span class="review-username">${user.USER_Name}</span>
                    <span class="review-date">${formattedDate}</span>
                    <span class="review-rating">Rating: ${review.Review_Course_Rate}/10</span>
                `;

                // Review Content - Using innerHTML for formatting (to keep line breaks, etc.)
                const reviewContent = document.createElement('div');
                reviewContent.classList.add('review-content');
                reviewContent.innerHTML = review.Review_Course_Details; // Use innerHTML to keep original formatting

                // Review Actions (Delete button if the review is by the logged-in user)
                const reviewActions = document.createElement('div');
                reviewActions.classList.add('review-actions');

                if (review.USER_ID === currentUser.USER_ID) {
                    // If the review belongs to the current user, add a delete button
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-btn');
                    deleteButton.textContent = 'Delete Review';
                    deleteButton.addEventListener('click', () => deleteReview(review.Review_Course_ID));
                    reviewActions.appendChild(deleteButton);
                }

                // Append review elements
                reviewDiv.appendChild(reviewHeader);
                reviewDiv.appendChild(reviewContent);
                reviewDiv.appendChild(reviewActions);
                courseReviewsElement.appendChild(reviewDiv);

            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        }

    } catch (error) {
        console.error('Error fetching course or reviews:', error);
    }
};

// Delete Review with Confirmation
const deleteReview = async (reviewID) => {
    const confirmDelete = confirm("คุณต้องการลบโพสต์หรือไม่? หากลบแล้วจะไม่สามารถกู้คืนกลับมาได้!");

    if (confirmDelete) {
        try {
            await axios.delete(`http://localhost:3000/api/course_review/${reviewID}`);
            alert('ลบรีวิวสำเร็จ!');
            location.reload(); // Reload the page to reflect the changes
        } catch (error) {
            console.error('Error deleting review:', error);
        }
    }
};

// Redirect to Create Review Page
createReviewButton.addEventListener('click', () => {
    window.location.href = `Create_Course_Review.html?CID=${courseID}`;
});

// Fetch the course details and reviews when the page loads
fetchCourseDetails();
