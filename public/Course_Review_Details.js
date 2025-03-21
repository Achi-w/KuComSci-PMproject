const urlParams = new URLSearchParams(window.location.search);
const courseID = urlParams.get('CID');
let currentUser = {};

// Elements
const courseNameElement = document.getElementById('course-name');
const courseDescriptionElement = document.getElementById('course-description');
const courseReviewsElement = document.getElementById('course-reviews');
const createReviewButton = document.getElementById('create-review-btn');

// Format date to YYYY-MM-DD
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; 
};

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
                    createReviewButton.style.display = "none"; // Hide button for teachers
                    break;
                case "admin":
                    roleTitle.textContent = "Admin - ภาควิชาวิทยาการคอมพิวเตอร์";
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

        // Display Average Rating
        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, review) => sum + review.Review_Course_Rate, 0) / reviews.length).toFixed(1)
            : "No Ratings Yet";

        const avgRatingElement = document.createElement('div');
        avgRatingElement.classList.add('avg-rating');
        avgRatingElement.textContent = `คะแนนรวมวิชานี้: ${avgRating}/10`;
        courseReviewsElement.innerHTML = ""; // Clear previous content
        courseReviewsElement.appendChild(avgRatingElement);

        // Display Reviews
        if (reviews.length === 0) {
            courseReviewsElement.innerHTML += "<p>No reviews yet for this course.</p>";
            return;
        }

        for (const review of reviews) {
            try {
                // Fetch User Info
                const { data: user } = await axios.get(`http://localhost:3000/api/user/${review.USER_ID}`);
                const formattedDate = formatDate(review.Review_Course_Date);
        
                // Create Review Element
                const reviewDiv = document.createElement('div');
                reviewDiv.classList.add('review-item');
                reviewDiv.innerHTML = `
                    <div class="review-header">
                        <span class="review-username">${user.USER_Name}</span>
                        <span class="review-date">${formattedDate}</span>
                        <span class="review-rating">Rating: ${review.Review_Course_Rate}/10</span>
                    </div>
                    <div class="review-content">${review.Review_Course_Details}</div>
                `;
        
                // Add delete button for students (own review) and admins (any review)
                if (review.USER_ID === currentUser.USER_ID || currentUser.USER_Role.toLowerCase() === "admin") {
                    console.log("Adding delete button...");
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-btn');
                    deleteButton.textContent = 'Delete Review';
                    deleteButton.addEventListener('click', () => deleteReview(review.Review_Course_ID));
                    reviewDiv.appendChild(deleteButton);
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

// Delete Review
const deleteReview = async (reviewID) => {
    if (confirm("คุณต้องการลบโพสต์หรือไม่? หากลบแล้วจะไม่สามารถกู้คืนกลับมาได้!")) {
        try {
            await axios.delete(`http://localhost:3000/api/course_review/${reviewID}`);
            alert('ลบรีวิวสำเร็จ!');
            fetchCourseDetails();
        } catch (error) {
            console.error('Error deleting review:', error);
        }
    }
};

// Redirect to Create Review Page
createReviewButton.addEventListener('click', () => {
    window.location.href = `Create_Course_Review.html?CID=${courseID}`;
});

// Fetch Data on Page Load
fetchCourseDetails();
