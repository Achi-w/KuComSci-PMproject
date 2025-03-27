const urlParams = new URLSearchParams(window.location.search);
const courseID = urlParams.get('CID');
let currentUser = {};

// Elements
const courseNameElement = document.getElementById('course-name');
const courseDescriptionElement = document.getElementById('course-description');
const courseReviewsElement = document.getElementById('course-reviews');
const createReviewButton = document.getElementById('create-review-btn');

// Format date to YYYY-MM-DD


// Fetch user data
fetch("/dashboard")
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            document.getElementById("userName").textContent = `${currentUser.USER_Name} ${currentUser.USER_Surname}`;

            const roleTitle = document.getElementById("roleTitle");
            switch (currentUser.USER_Role.toLowerCase()) {
                case "student":
                    roleTitle.textContent = "Nisit Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
                    createReviewButton.style.display = "block"; // Show button for students
                    break;
                case "teacher":
                case "professor":
                    roleTitle.textContent = "Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
                    document.getElementById("bookingLink").textContent = "จองห้องและย้ายห้อง"
                    createReviewButton.style.display = "none"; // Hide button for teachers
                    break;
                case "admin":
                    roleTitle.textContent = "Admin Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
                    createReviewButton.style.display = "none"; // Hide button for admins
                    break;
            }
        } else {
            console.error("User not authenticated");
            window.location.href = "index.html"; 
        }
    })
    .catch(err => console.error(err));




// Fetch Course and Reviews Data
const fetchCourseDetails = async () => {
    if (!courseID) {
        courseReviewsElement.innerHTML = "<p>Invalid Course ID.</p>";
        return;
    }

    try {
        // Fetch Course Details
        const { data: course } = await axios.get(`http://localhost:3000/api/course/${courseID}`);
        courseNameElement.textContent = `${course.Course_ID} - ${course.Course_Name}`;
        courseDescriptionElement.textContent = course.Course_Detail;

        // Fetch Reviews
        const { data } = await axios.get(`http://localhost:3000/api/course_review/${courseID}`);
        const reviews = data.reviews || [];
        const ratingContainer = document.getElementById('rating-container');

        // Display Average Rating
        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, review) => sum + review.Review_Course_Rate, 0) / reviews.length).toFixed(1)
            : "No Ratings Yet";

        // Create the rating box
        const avgRatingElement = document.createElement('div');
        avgRatingElement.classList.add('avg-rating');
        avgRatingElement.textContent = `คะแนนรวมวิชานี้: ${avgRating}/10`;

        // Insert into the new rating container
        ratingContainer.innerHTML = "";  // Clear previous content
        ratingContainer.appendChild(avgRatingElement);

        // **Check if the current user has already written a review**
        const userHasReviewed = reviews.some(review => review.USER_ID === currentUser.USER_ID);
        
        // Hide "Create Review" button if the user has already written a review
        if (userHasReviewed) {
            createReviewButton.style.display = "none";
        }

        // Display Reviews
        courseReviewsElement.innerHTML = ""; // Clear previous content
        if (reviews.length === 0) {
            courseReviewsElement.innerHTML = "<p>No reviews yet for this course.</p>";
            return;
        }
        reviews.sort((a, b) => new Date(b.Review_Course_Date) - new Date(a.Review_Course_Date));

        for (const review of reviews) {
            try {
                // Fetch User Info
                const { data: user } = await axios.get(`http://localhost:3000/api/user/${review.USER_ID}`);
                const utcDate = new Date(review.Review_Course_Date);
                const day = utcDate.getDate();
                const month = utcDate.getMonth() + 1; // Months are zero-based
                const year = utcDate.getFullYear();
                
                const formattedDate = `${day}/${month}/${year}`;
         

                // Create Review Element
                const reviewDiv = document.createElement('div');
                reviewDiv.classList.add('review-item');
                reviewDiv.innerHTML = `
                    <div class="review-header">
                        <span class="review-username">${user.USER_Name}</span>
                        <span class="review-date">${formattedDate}</span>
                        <span class="review-rating"> ${review.Review_Course_Rate}/10</span>
                    </div>
                    <div class="review-body">
                        <div class="review-content">${review.Review_Course_Details}</div>
                    </div>
                `;

                if (review.USER_ID === currentUser.USER_ID || currentUser.USER_Role.toLowerCase() === "admin") {
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-btn');
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', () => deleteReview(review.Review_Course_ID));

                    // Append delete button inside review-body
                    reviewDiv.querySelector('.review-body').appendChild(deleteButton);
                }

                courseReviewsElement.appendChild(reviewDiv);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        }
    } catch (error) {
        console.error('Error fetching course or reviews:', error);
        courseReviewsElement.innerHTML = "<p>Failed to load course details or reviews.</p>";
    }
};

let deleteReviewID = null; // Store the review ID to delete

// Show Delete Confirmation Modal
function showDeleteModal(reviewID) {
    deleteReviewID = reviewID; // Store review ID for deletion
    document.getElementById("delete-confirmation").style.display = "flex";
}

// Close Modal
function closeDeleteModal() {
    document.getElementById("delete-confirmation").style.display = "none";
    deleteReviewID = null;
}

// Delete Review Function (Only Runs After Confirmation)
async function confirmDeleteReview() {
    if (!deleteReviewID) return; // If no review ID, exit

    try {
        await axios.delete(`http://localhost:3000/api/course_review/${deleteReviewID}`);

        // Show Success Modal
        document.getElementById('success-modal').style.display = 'block';

        fetchCourseDetails(); // Refresh reviews list
    } catch (error) {
        console.error('Error deleting review:', error);
    }

    closeDeleteModal();
}


function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
    location.reload(); // Refresh the page
}






// Attach Event Listener to Confirm Delete Button
document.getElementById("confirm-delete").addEventListener("click", confirmDeleteReview);


// Delete Review
const deleteReview = async (reviewID) => {
        try {
            showDeleteModal(reviewID)
        } catch (error) {
            console.error('Error deleting review:', error);
        }
};

// Redirect to Create Review Page
createReviewButton.addEventListener('click', () => {
    window.location.href = `Create_Course_Review.html?CID=${courseID}`;
});

// Fetch Data on Page Load
fetchCourseDetails();
